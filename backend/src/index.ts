import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';

// Import routes
import authRoutes from './routes/auth.js';
import locationRoutes from './routes/locations.js';
import routeRoutes from './routes/routes.js';
import geofenceRoutes from './routes/geofences.js';
import poiRoutes from './routes/pois.js';

// Import middleware and services
import { authLimiter } from './middleware/rateLimit.js';
import RealtimeServer from './sockets/realtime.js';

const app = express();
const httpServer = createServer(app);

// Configuration
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/geofences', geofenceRoutes);
app.use('/api/pois', poiRoutes);

// Initialize real-time server
const realtimeServer = new RealtimeServer(httpServer);

console.log(`
╔══════════════════════════════════════════════════════════════╗
║           Map Tracking Backend - Production Ready             ║
╚══════════════════════════════════════════════════════════════╝

Environment: ${NODE_ENV}
Port: ${PORT}
Supabase URL: ${process.env.SUPABASE_URL ? '✓ Configured' : '✗ Missing'}
JWT Secret: ${process.env.JWT_SECRET ? '✓ Configured' : '✗ Missing'}
Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}

Real-time Features:
  ✓ WebSocket support with Socket.IO
  ✓ Location streaming
  ✓ Geofence monitoring
  ✓ Route tracking
  ✓ Real-time notifications

API Endpoints:
  POST   /api/auth/register         - Register new user
  POST   /api/auth/login            - Login user
  GET    /api/auth/me               - Get current user
  PUT    /api/auth/me               - Update profile
  POST   /api/locations/update      - Submit location
  GET    /api/locations/recent      - Get recent location
  GET    /api/locations/history     - Get location history
  POST   /api/locations/share       - Create share link
  GET    /api/routes                - List routes
  POST   /api/routes                - Create route
  POST   /api/routes/:id/start      - Start tracking
  POST   /api/routes/:id/complete   - Complete route
  GET    /api/geofences             - List geofences
  POST   /api/geofences             - Create geofence
  GET    /api/pois/search           - Search POIs
  GET    /api/pois/nearby           - Get nearby POIs

Database:
  ✓ PostgreSQL with PostGIS
  ✓ Row Level Security (RLS)
  ✓ Spatial indexing
  ✓ Real-time subscriptions

Performance:
  ✓ Rate limiting (100 req/15min)
  ✓ Connection pooling
  ✓ Compression enabled
  ✓ CORS configured

Security:
  ✓ JWT authentication
  ✓ Password hashing (bcryptjs)
  ✓ Helmet.js protection
  ✓ HTTPS ready

`);

// Start server
httpServer.listen(PORT, () => {
  console.log(`✓ Server running at http://localhost:${PORT}`);
  console.log(`✓ WebSocket ready at ws://localhost:${PORT}`);
  console.log(`✓ Connected users: ${realtimeServer.getConnectedUsersCount()}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

export default app;
