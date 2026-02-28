import { supabaseAdmin } from '../db/client.js';
import { Location, LocationUpdate } from '../types/index.js';
import { calculateDistance, snapPointToLineSegment } from '../utils/geospatial.js';
import { v4 as uuidv4 } from 'uuid';

export class TrackingService {
  /**
   * Process incoming location update from a device
   */
  static async processLocationUpdate(
    userId: string,
    deviceId: string,
    locationData: LocationUpdate
  ): Promise<Location | null> {
    try {
      // Save location to database
      const { data: location, error } = await supabaseAdmin
        .from('locations')
        .insert([
          {
            id: uuidv4(),
            user_id: userId,
            device_id: deviceId,
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            accuracy: locationData.accuracy,
            altitude: locationData.altitude,
            heading: locationData.heading,
            speed: locationData.speed ? locationData.speed / 3.6 : null, // Convert km/h to m/s
            address: locationData.address,
            battery_level: locationData.battery_level,
            connectivity: locationData.connectivity,
            location_type: 'user_location',
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Error saving location:', error);
        return null;
      }

      // Check geofences asynchronously (don't block response)
      this.checkGeofences(userId, locationData.latitude, locationData.longitude);

      // Update device last ping
      await supabaseAdmin
        .from('devices')
        .update({ last_ping: new Date().toISOString() })
        .eq('device_id', deviceId);

      return location;
    } catch (error) {
      console.error('Error processing location update:', error);
      return null;
    }
  }

  /**
   * Check if location intersects with any active geofences
   */
  static async checkGeofences(
    userId: string,
    latitude: number,
    longitude: number
  ): Promise<void> {
    try {
      const { data: geofences, error } = await supabaseAdmin
        .from('geofences')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error || !geofences) return;

      for (const geofence of geofences) {
        const isInside = this.isPointInGeofence(
          latitude,
          longitude,
          geofence.fence_geometry
        );

        // Get last geofence event
        const { data: lastEvent } = await supabaseAdmin
          .from('geofence_events')
          .select('*')
          .eq('geofence_id', geofence.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const lastEventType = lastEvent?.event_type;
        const isCurrentlyInside = lastEventType === 'enter' && !lastEvent?.exited_at;

        // Create enter event
        if (isInside && !isCurrentlyInside) {
          await supabaseAdmin.from('geofence_events').insert([
            {
              id: uuidv4(),
              geofence_id: geofence.id,
              user_id: userId,
              event_type: 'enter',
              location: `POINT(${longitude} ${latitude})`,
              entered_at: new Date().toISOString(),
            },
          ]);

          // Trigger webhook if configured
          if (geofence.webhook_url && geofence.notification_enabled) {
            this.triggerWebhook(geofence.webhook_url, {
              event: 'enter',
              geofence_id: geofence.id,
              user_id: userId,
              latitude,
              longitude,
              timestamp: new Date().toISOString(),
            });
          }
        }

        // Create exit event
        if (!isInside && isCurrentlyInside) {
          const enteredAt = lastEvent?.entered_at
            ? new Date(lastEvent.entered_at)
            : new Date();
          const exitedAt = new Date();
          const durationMinutes =
            (exitedAt.getTime() - enteredAt.getTime()) / (1000 * 60);

          await supabaseAdmin
            .from('geofence_events')
            .update({
              event_type: 'exit',
              exited_at: exitedAt.toISOString(),
              duration_minutes: durationMinutes,
            })
            .eq('id', lastEvent?.id);

          // Trigger webhook if configured
          if (geofence.webhook_url && geofence.notification_enabled) {
            this.triggerWebhook(geofence.webhook_url, {
              event: 'exit',
              geofence_id: geofence.id,
              user_id: userId,
              latitude,
              longitude,
              duration_minutes: durationMinutes,
              timestamp: new Date().toISOString(),
            });
          }
        }
      }
    } catch (error) {
      console.error('Error checking geofences:', error);
    }
  }

  /**
   * Check if a point is inside a geofence (simplified - uses bounding box)
   */
  static isPointInGeofence(latitude: number, longitude: number, geometry: any): boolean {
    // For PostGIS geometries, you would typically use ST_Contains
    // This is a simplified implementation
    if (geometry.type === 'Circle') {
      const centerLat = geometry.center[0];
      const centerLon = geometry.center[1];
      const radiusKm = geometry.radius / 1000;

      const distance = calculateDistance(latitude, longitude, centerLat, centerLon);
      return distance <= radiusKm;
    }

    return false;
  }

  /**
   * Snap location to active route if user is on one
   */
  static async snapLocationToRoute(
    userId: string,
    latitude: number,
    longitude: number
  ): Promise<{ snappedLat: number; snappedLon: number } | null> {
    try {
      // Get active route
      const { data: route } = await supabaseAdmin
        .from('routes')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (!route || !route.polyline) return null;

      // Decode polyline to get coordinates
      const coordinates = JSON.parse(route.polyline);
      if (!Array.isArray(coordinates) || coordinates.length < 2) return null;

      // Find closest line segment
      let minDistance = Infinity;
      let snappedPoint = null;

      for (let i = 0; i < coordinates.length - 1; i++) {
        const segment = snapPointToLineSegment(
          { lat: latitude, lon: longitude },
          {
            lat: coordinates[i][0],
            lon: coordinates[i][1],
          },
          {
            lat: coordinates[i + 1][0],
            lon: coordinates[i + 1][1],
          }
        );

        const distance = calculateDistance(
          latitude,
          longitude,
          segment.lat,
          segment.lon
        );

        if (distance < minDistance) {
          minDistance = distance;
          snappedPoint = segment;
        }
      }

      // Only snap if within 50 meters
      if (minDistance < 0.05 && snappedPoint) {
        return {
          snappedLat: snappedPoint.lat,
          snappedLon: snappedPoint.lon,
        };
      }

      return null;
    } catch (error) {
      console.error('Error snapping location to route:', error);
      return null;
    }
  }

  /**
   * Get location history with optional filtering
   */
  static async getLocationHistory(
    userId: string,
    limit: number = 100,
    offset: number = 0,
    fromDate?: Date,
    toDate?: Date
  ) {
    let query = supabaseAdmin
      .from('locations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (fromDate) {
      query = query.gte('created_at', fromDate.toISOString());
    }
    if (toDate) {
      query = query.lte('created_at', toDate.toISOString());
    }

    return query;
  }

  /**
   * Create a new route
   */
  static async createRoute(
    userId: string,
    startLat: number,
    startLon: number,
    endLat: number,
    endLon: number,
    transportMode: string = 'driving',
    polyline?: string,
    steps?: any[]
  ) {
    const routeData: any = {
      id: uuidv4(),
      user_id: userId,
      start_location: [startLat, startLon],
      end_location: [endLat, endLon],
      transport_mode: transportMode,
      status: 'pending',
      is_favorite: false,
      metadata: {},
      created_at: new Date().toISOString(),
    };

    if (polyline) {
      routeData.polyline = polyline;
    }
    if (steps) {
      routeData.steps = steps;
    }

    const { data, error } = await supabaseAdmin
      .from('routes')
      .insert([routeData])
      .select()
      .single();

    return { data, error };
  }

  /**
   * Start tracking a route
   */
  static async startRouteTracking(routeId: string) {
    return supabaseAdmin
      .from('routes')
      .update({
        status: 'active',
        started_at: new Date().toISOString(),
      })
      .eq('id', routeId);
  }

  /**
   * Complete a route
   */
  static async completeRoute(routeId: string) {
    return supabaseAdmin
      .from('routes')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', routeId);
  }

  /**
   * Trigger webhook (fire and forget)
   */
  private static async triggerWebhook(url: string, payload: any): Promise<void> {
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error('Error triggering webhook:', error);
    }
  }
}

export default TrackingService;
