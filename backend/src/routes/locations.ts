import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { locationLimiter } from '../middleware/rateLimit.js';
import { supabaseAdmin } from '../db/client.js';
import TrackingService from '../services/tracking.js';
import { getAdaptiveUpdateInterval } from '../utils/geospatial.js';

const router = Router();

// Submit a location update
router.post('/update', locationLimiter, authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { device_id, latitude, longitude, accuracy, altitude, heading, speed, battery_level, connectivity } =
      req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'latitude and longitude are required' });
    }

    const location = await TrackingService.processLocationUpdate(
      req.user!.id,
      device_id || 'unknown',
      {
        device_id: device_id || 'unknown',
        latitude,
        longitude,
        accuracy,
        altitude,
        heading,
        speed,
        battery_level,
        connectivity,
      }
    );

    // Calculate adaptive update interval
    const updateInterval = getAdaptiveUpdateInterval(
      battery_level || 100,
      speed || 0,
      'none'
    );

    return res.status(201).json({
      success: true,
      data: location,
      meta: {
        next_update_interval_seconds: updateInterval,
      },
    });
  } catch (error) {
    console.error('Error updating location:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get recent location
router.get('/recent', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { data: location, error } = await supabaseAdmin
      .from('locations')
      .select('*')
      .eq('user_id', req.user?.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      return res.status(404).json({ error: 'No location found' });
    }

    return res.json({
      success: true,
      data: location,
    });
  } catch (error) {
    console.error('Error getting recent location:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get location history
router.get('/history', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const offset = parseInt(req.query.offset as string) || 0;
    const fromDate = req.query.from ? new Date(req.query.from as string) : undefined;
    const toDate = req.query.to ? new Date(req.query.to as string) : undefined;

    const { data: locations, error } = await TrackingService.getLocationHistory(
      req.user!.id,
      limit,
      offset,
      fromDate,
      toDate
    );

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch location history' });
    }

    return res.json({
      success: true,
      data: locations,
      meta: {
        limit,
        offset,
        total: locations?.length || 0,
      },
    });
  } catch (error) {
    console.error('Error getting location history:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get another user's shared location
router.get('/shared/:shareToken', async (req: AuthRequest, res) => {
  try {
    const { shareToken } = req.params;

    // Get shared location token
    const { data: sharedLocation, error: shareError } = await supabaseAdmin
      .from('shared_locations')
      .select('*')
      .eq('share_token', shareToken)
      .eq('is_active', true)
      .single();

    if (shareError || !sharedLocation) {
      return res.status(404).json({ error: 'Shared location not found or expired' });
    }

    // Check expiry
    if (sharedLocation.expires_at && new Date(sharedLocation.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Share link has expired' });
    }

    // Get latest location from shared user
    const { data: location, error: locationError } = await supabaseAdmin
      .from('locations')
      .select('id, latitude, longitude, accuracy, heading, speed, created_at, address')
      .eq('user_id', sharedLocation.user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (locationError) {
      return res.status(404).json({ error: 'Location not found' });
    }

    return res.json({
      success: true,
      data: location,
    });
  } catch (error) {
    console.error('Error getting shared location:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a share link for current location
router.post('/share', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { share_type, expires_in_hours, shared_with } = req.body;

    const shareToken = Math.random().toString(36).substring(2, 15);
    const expiresAt = expires_in_hours
      ? new Date(Date.now() + expires_in_hours * 60 * 60 * 1000).toISOString()
      : null;

    const { data: sharedLocation, error } = await supabaseAdmin
      .from('shared_locations')
      .insert([
        {
          id: uuidv4(),
          user_id: req.user?.id,
          share_token: shareToken,
          share_type: share_type || 'real_time',
          is_active: true,
          expires_at: expiresAt,
          shared_with: shared_with || [],
        },
      ])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to create share link' });
    }

    const shareUrl = `${process.env.FRONTEND_URL}/shared/${shareToken}`;

    return res.status(201).json({
      success: true,
      data: {
        ...sharedLocation,
        share_url: shareUrl,
      },
    });
  } catch (error) {
    console.error('Error creating share link:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's active shares
router.get('/shares', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { data: shares, error } = await supabaseAdmin
      .from('shared_locations')
      .select('*')
      .eq('user_id', req.user?.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch shares' });
    }

    return res.json({
      success: true,
      data: shares,
    });
  } catch (error) {
    console.error('Error getting shares:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Revoke a share link
router.delete('/shares/:shareToken', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { shareToken } = req.params;

    const { error } = await supabaseAdmin
      .from('shared_locations')
      .update({ is_active: false })
      .eq('share_token', shareToken)
      .eq('user_id', req.user?.id);

    if (error) {
      return res.status(500).json({ error: 'Failed to revoke share' });
    }

    return res.json({
      success: true,
      message: 'Share link revoked',
    });
  } catch (error) {
    console.error('Error revoking share:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
