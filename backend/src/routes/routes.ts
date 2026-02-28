import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { supabaseAdmin } from '../db/client.js';
import TrackingService from '../services/tracking.js';
import { calculateDistance, formatDuration, calculateETA } from '../utils/geospatial.js';

const router = Router();

// Create a route
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const {
      start_location,
      end_location,
      start_address,
      end_address,
      transport_mode = 'driving',
      polyline,
      steps,
      distance_meters,
      duration_seconds,
    } = req.body;

    if (!start_location || !end_location) {
      return res.status(400).json({
        error: 'start_location and end_location are required',
      });
    }

    const { data: route, error } = await TrackingService.createRoute(
      req.user!.id,
      start_location[0],
      start_location[1],
      end_location[0],
      end_location[1],
      transport_mode,
      polyline ? JSON.stringify(polyline) : undefined,
      steps
    );

    if (error) {
      return res.status(500).json({ error: 'Failed to create route' });
    }

    return res.status(201).json({
      success: true,
      data: route,
    });
  } catch (error) {
    console.error('Error creating route:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get route by ID
router.get('/:routeId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { routeId } = req.params;

    const { data: route, error } = await supabaseAdmin
      .from('routes')
      .select('*')
      .eq('id', routeId)
      .eq('user_id', req.user?.id)
      .single();

    if (error || !route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    return res.json({
      success: true,
      data: route,
    });
  } catch (error) {
    console.error('Error getting route:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's routes
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const status = req.query.status as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    let query = supabaseAdmin
      .from('routes')
      .select('*')
      .eq('user_id', req.user?.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: routes, error } = await query;

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch routes' });
    }

    return res.json({
      success: true,
      data: routes,
      meta: {
        limit,
        offset,
        count: routes?.length || 0,
      },
    });
  } catch (error) {
    console.error('Error getting routes:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Start tracking a route
router.post('/:routeId/start', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { routeId } = req.params;

    // Verify ownership
    const { data: route, error: fetchError } = await supabaseAdmin
      .from('routes')
      .select('*')
      .eq('id', routeId)
      .eq('user_id', req.user?.id)
      .single();

    if (fetchError || !route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    const { data: updatedRoute, error } = await TrackingService.startRouteTracking(routeId);

    if (error) {
      return res.status(500).json({ error: 'Failed to start route tracking' });
    }

    return res.json({
      success: true,
      data: updatedRoute,
    });
  } catch (error) {
    console.error('Error starting route:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Complete a route
router.post('/:routeId/complete', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { routeId } = req.params;

    // Verify ownership
    const { data: route, error: fetchError } = await supabaseAdmin
      .from('routes')
      .select('*')
      .eq('id', routeId)
      .eq('user_id', req.user?.id)
      .single();

    if (fetchError || !route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    const { data: updatedRoute, error } = await TrackingService.completeRoute(routeId);

    if (error) {
      return res.status(500).json({ error: 'Failed to complete route' });
    }

    return res.json({
      success: true,
      data: updatedRoute,
    });
  } catch (error) {
    console.error('Error completing route:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get route tracking history
router.get('/:routeId/tracking', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { routeId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);

    // Verify ownership
    const { data: route } = await supabaseAdmin
      .from('routes')
      .select('id')
      .eq('id', routeId)
      .eq('user_id', req.user?.id)
      .single();

    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    const { data: tracking, error } = await supabaseAdmin
      .from('route_tracking')
      .select('*')
      .eq('route_id', routeId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch tracking data' });
    }

    return res.json({
      success: true,
      data: tracking,
    });
  } catch (error) {
    console.error('Error getting route tracking:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Toggle route favorite
router.patch('/:routeId/favorite', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { routeId } = req.params;
    const { is_favorite } = req.body;

    const { data: updatedRoute, error } = await supabaseAdmin
      .from('routes')
      .update({ is_favorite })
      .eq('id', routeId)
      .eq('user_id', req.user?.id)
      .select()
      .single();

    if (error || !updatedRoute) {
      return res.status(404).json({ error: 'Route not found' });
    }

    return res.json({
      success: true,
      data: updatedRoute,
    });
  } catch (error) {
    console.error('Error toggling favorite:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a route
router.delete('/:routeId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { routeId } = req.params;

    const { error } = await supabaseAdmin
      .from('routes')
      .delete()
      .eq('id', routeId)
      .eq('user_id', req.user?.id);

    if (error) {
      return res.status(500).json({ error: 'Failed to delete route' });
    }

    return res.json({
      success: true,
      message: 'Route deleted',
    });
  } catch (error) {
    console.error('Error deleting route:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
