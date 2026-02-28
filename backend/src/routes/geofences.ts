import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { supabaseAdmin } from '../db/client.js';

const router = Router();

// Create a geofence
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const {
      name,
      description,
      fence_geometry,
      center_point,
      radius_meters,
      fence_type = 'circle',
      notification_enabled = true,
      webhook_url,
      metadata,
    } = req.body;

    if (!name || !fence_geometry) {
      return res.status(400).json({
        error: 'name and fence_geometry are required',
      });
    }

    const { data: geofence, error } = await supabaseAdmin
      .from('geofences')
      .insert([
        {
          id: uuidv4(),
          user_id: req.user?.id,
          name,
          description,
          fence_geometry,
          center_point,
          radius_meters,
          fence_type,
          notification_enabled,
          webhook_url,
          metadata: metadata || {},
          status: 'active',
        },
      ])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to create geofence' });
    }

    return res.status(201).json({
      success: true,
      data: geofence,
    });
  } catch (error) {
    console.error('Error creating geofence:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's geofences
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { data: geofences, error } = await supabaseAdmin
      .from('geofences')
      .select('*')
      .eq('user_id', req.user?.id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch geofences' });
    }

    return res.json({
      success: true,
      data: geofences,
    });
  } catch (error) {
    console.error('Error getting geofences:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get geofence by ID
router.get('/:geofenceId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { geofenceId } = req.params;

    const { data: geofence, error } = await supabaseAdmin
      .from('geofences')
      .select('*')
      .eq('id', geofenceId)
      .eq('user_id', req.user?.id)
      .single();

    if (error || !geofence) {
      return res.status(404).json({ error: 'Geofence not found' });
    }

    return res.json({
      success: true,
      data: geofence,
    });
  } catch (error) {
    console.error('Error getting geofence:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Update geofence
router.patch('/:geofenceId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { geofenceId } = req.params;
    const { name, description, notification_enabled, webhook_url, status, metadata } = req.body;

    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (notification_enabled !== undefined) updates.notification_enabled = notification_enabled;
    if (webhook_url !== undefined) updates.webhook_url = webhook_url;
    if (status !== undefined) updates.status = status;
    if (metadata !== undefined) updates.metadata = metadata;

    const { data: geofence, error } = await supabaseAdmin
      .from('geofences')
      .update(updates)
      .eq('id', geofenceId)
      .eq('user_id', req.user?.id)
      .select()
      .single();

    if (error || !geofence) {
      return res.status(404).json({ error: 'Geofence not found' });
    }

    return res.json({
      success: true,
      data: geofence,
    });
  } catch (error) {
    console.error('Error updating geofence:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete geofence
router.delete('/:geofenceId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { geofenceId } = req.params;

    const { error } = await supabaseAdmin
      .from('geofences')
      .delete()
      .eq('id', geofenceId)
      .eq('user_id', req.user?.id);

    if (error) {
      return res.status(500).json({ error: 'Failed to delete geofence' });
    }

    return res.json({
      success: true,
      message: 'Geofence deleted',
    });
  } catch (error) {
    console.error('Error deleting geofence:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get geofence events
router.get('/:geofenceId/events', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { geofenceId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const offset = parseInt(req.query.offset as string) || 0;

    // Verify ownership
    const { data: geofence } = await supabaseAdmin
      .from('geofences')
      .select('id')
      .eq('id', geofenceId)
      .eq('user_id', req.user?.id)
      .single();

    if (!geofence) {
      return res.status(404).json({ error: 'Geofence not found' });
    }

    const { data: events, error } = await supabaseAdmin
      .from('geofence_events')
      .select('*')
      .eq('geofence_id', geofenceId)
      .eq('user_id', req.user?.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch events' });
    }

    return res.json({
      success: true,
      data: events,
      meta: {
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('Error getting geofence events:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
