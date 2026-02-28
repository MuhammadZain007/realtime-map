import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { verifyToken } from '../middleware/auth.js';
import { supabaseAdmin } from '../db/client.js';
import TrackingService from '../services/tracking.js';

export class RealtimeServer {
  private io: SocketIOServer;
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> socketIds

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      maxHttpBufferSize: 1e6, // 1MB
    });

    this.setupMiddleware();
    this.setupHandlers();
  }

  private setupMiddleware() {
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = verifyToken(token);

      if (!decoded) {
        return next(new Error('Invalid token'));
      }

      const payload = decoded as any;
      socket.data.userId = payload.sub;
      socket.data.email = payload.email;
      socket.data.role = payload.role;

      next();
    });
  }

  private setupHandlers() {
    this.io.on('connection', (socket: Socket) => {
      const userId = socket.data.userId;

      console.log(`User ${userId} connected with socket ${socket.id}`);

      // Track socket per user
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(socket.id);

      // User joins their personal room for location updates
      socket.join(`user:${userId}`);

      // Handle location updates
      socket.on('location:update', (data, callback) => {
        this.handleLocationUpdate(userId, data, callback, socket);
      });

      // Handle tracking start
      socket.on('tracking:start', (data, callback) => {
        this.handleTrackingStart(userId, data, callback, socket);
      });

      // Handle tracking stop
      socket.on('tracking:stop', (callback) => {
        this.handleTrackingStop(userId, callback, socket);
      });

      // Watch another user's location (with permissions)
      socket.on('location:watch', (data, callback) => {
        this.handleLocationWatch(userId, data, callback, socket);
      });

      // Subscribe to route updates
      socket.on('route:subscribe', (data, callback) => {
        this.handleRouteSubscribe(userId, data, callback, socket);
      });

      // Subscribe to geofence events
      socket.on('geofence:subscribe', (data, callback) => {
        this.handleGeofenceSubscribe(userId, data, callback, socket);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnect(userId, socket);
      });

      // Error handling
      socket.on('error', (error) => {
        console.error(`Socket error for user ${userId}:`, error);
      });

      // Send welcome message
      socket.emit('connected', {
        message: 'Connected to real-time server',
        userId,
      });
    });
  }

  private async handleLocationUpdate(
    userId: string,
    data: any,
    callback: Function,
    socket: Socket
  ) {
    try {
      const {
        device_id,
        latitude,
        longitude,
        accuracy,
        altitude,
        heading,
        speed,
        battery_level,
        connectivity,
      } = data;

      // Save location
      const location = await TrackingService.processLocationUpdate(userId, device_id, {
        device_id,
        latitude,
        longitude,
        accuracy,
        altitude,
        heading,
        speed,
        battery_level,
        connectivity,
      });

      if (location) {
        // Emit to user's tracking subscribers
        this.io.to(`user:${userId}:tracking`).emit('location:updated', {
          location,
          timestamp: Date.now(),
        });

        // Callback with success
        callback({ success: true, location });
      } else {
        callback({ success: false, error: 'Failed to save location' });
      }
    } catch (error) {
      console.error('Error handling location update:', error);
      callback({ success: false, error: 'Internal server error' });
    }
  }

  private async handleTrackingStart(
    userId: string,
    data: any,
    callback: Function,
    socket: Socket
  ) {
    try {
      const { device_id, route_id, battery_optimization } = data;

      // Join tracking room
      socket.join(`user:${userId}:tracking`);

      callback({
        success: true,
        message: 'Tracking started',
      });
    } catch (error) {
      console.error('Error starting tracking:', error);
      callback({ success: false, error: 'Failed to start tracking' });
    }
  }

  private async handleTrackingStop(userId: string, callback: Function, socket: Socket) {
    try {
      socket.leave(`user:${userId}:tracking`);

      callback({
        success: true,
        message: 'Tracking stopped',
      });
    } catch (error) {
      console.error('Error stopping tracking:', error);
      callback({ success: false, error: 'Failed to stop tracking' });
    }
  }

  private async handleLocationWatch(
    userId: string,
    data: any,
    callback: Function,
    socket: Socket
  ) {
    try {
      const { target_user_id, share_token } = data;
      let sharedLocation: { user_id: string } | null = null;

      // Verify permissions
      if (share_token) {
        // Check if share link is valid
        const { data } = await supabaseAdmin
          .from('shared_locations')
          .select('*')
          .eq('share_token', share_token)
          .eq('is_active', true)
          .single();

        sharedLocation = data;

        if (!sharedLocation) {
          return callback({ success: false, error: 'Invalid share link' });
        }
      } else if (target_user_id !== userId) {
        // Check if user has permission to watch target
        const { data: permission } = await supabaseAdmin
          .from('user_permissions')
          .select('*')
          .eq('user_id', userId)
          .eq('target_user_id', target_user_id)
          .eq('permission_type', 'view_location')
          .single();

        if (!permission) {
          return callback({ success: false, error: 'Permission denied' });
        }
      }

      // Subscribe to updates
      const watchUserId = target_user_id || sharedLocation?.user_id;
      socket.join(`user:${watchUserId}:tracking`);

      callback({
        success: true,
        message: 'Watching location',
      });
    } catch (error) {
      console.error('Error watching location:', error);
      callback({ success: false, error: 'Failed to watch location' });
    }
  }

  private async handleRouteSubscribe(
    userId: string,
    data: any,
    callback: Function,
    socket: Socket
  ) {
    try {
      const { route_id } = data;

      // Verify ownership or permission
      const { data: route } = await supabaseAdmin
        .from('routes')
        .select('id')
        .eq('id', route_id)
        .eq('user_id', userId)
        .single();

      if (!route) {
        return callback({ success: false, error: 'Route not found' });
      }

      socket.join(`route:${route_id}`);

      callback({
        success: true,
        message: 'Subscribed to route updates',
      });
    } catch (error) {
      console.error('Error subscribing to route:', error);
      callback({ success: false, error: 'Failed to subscribe' });
    }
  }

  private async handleGeofenceSubscribe(
    userId: string,
    data: any,
    callback: Function,
    socket: Socket
  ) {
    try {
      const { geofence_id } = data;

      // Verify ownership
      const { data: geofence } = await supabaseAdmin
        .from('geofences')
        .select('id')
        .eq('id', geofence_id)
        .eq('user_id', userId)
        .single();

      if (!geofence) {
        return callback({ success: false, error: 'Geofence not found' });
      }

      socket.join(`geofence:${geofence_id}`);

      callback({
        success: true,
        message: 'Subscribed to geofence events',
      });
    } catch (error) {
      console.error('Error subscribing to geofence:', error);
      callback({ success: false, error: 'Failed to subscribe' });
    }
  }

  private handleDisconnect(userId: string, socket: Socket) {
    console.log(`User ${userId} disconnected from socket ${socket.id}`);

    const userSocketIds = this.userSockets.get(userId);
    if (userSocketIds) {
      userSocketIds.delete(socket.id);

      if (userSocketIds.size === 0) {
        this.userSockets.delete(userId);
      }
    }
  }

  /**
   * Broadcast location update to all subscribers
   */
  public broadcastLocationUpdate(userId: string, location: any) {
    this.io.to(`user:${userId}:tracking`).emit('location:updated', {
      location,
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast geofence event
   */
  public broadcastGeofenceEvent(geofenceId: string, event: any) {
    this.io.to(`geofence:${geofenceId}`).emit('geofence:event', {
      ...event,
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast route update
   */
  public broadcastRouteUpdate(routeId: string, data: any) {
    this.io.to(`route:${routeId}`).emit('route:updated', {
      ...data,
      timestamp: Date.now(),
    });
  }

  /**
   * Get connected users count
   */
  public getConnectedUsersCount(): number {
    return this.userSockets.size;
  }

  /**
   * Get IO instance for external use
   */
  public getIO(): SocketIOServer {
    return this.io;
  }
}

export default RealtimeServer;
