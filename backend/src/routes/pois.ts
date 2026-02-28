import { Router } from 'express';
import { supabaseAdmin } from '../db/client.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Search POIs
router.get('/search', async (req: AuthRequest, res) => {
  try {
    const { query, latitude, longitude, radius_km = 5, limit = 20 } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'query parameter is required' });
    }

    // If location is provided, search nearby POIs
    if (latitude && longitude) {
      const { data: pois, error } = await supabaseAdmin.rpc('search_pois_nearby', {
        search_query: query as string,
        lat: parseFloat(latitude as string),
        lng: parseFloat(longitude as string),
        radius_km: parseFloat(radius_km as string),
        result_limit: parseInt(limit as string),
      });

      if (error) {
        return res.status(500).json({ error: 'Failed to search POIs' });
      }

      return res.json({
        success: true,
        data: pois,
      });
    }

    // General text search
    const { data: pois, error } = await supabaseAdmin
      .from('pois')
      .select('*')
      .or(`name.ilike.%${query}%,category.ilike.%${query}%`)
      .limit(parseInt(limit as string));

    if (error) {
      return res.status(500).json({ error: 'Failed to search POIs' });
    }

    return res.json({
      success: true,
      data: pois,
    });
  } catch (error) {
    console.error('Error searching POIs:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get nearby POIs
router.get('/nearby', async (req: AuthRequest, res) => {
  try {
    const { latitude, longitude, radius_km = 5, category } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        error: 'latitude and longitude parameters are required',
      });
    }

    let query = supabaseAdmin
      .from('pois')
      .select('*')
      .lt('distance', parseFloat(radius_km as string))
      .order('distance', { ascending: true });

    if (category) {
      query = query.eq('category', category);
    }

    const { data: pois, error } = await query;

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch nearby POIs' });
    }

    return res.json({
      success: true,
      data: pois,
    });
  } catch (error) {
    console.error('Error getting nearby POIs:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get POI details
router.get('/:poiId', async (req: AuthRequest, res) => {
  try {
    const { poiId } = req.params;

    const { data: poi, error } = await supabaseAdmin
      .from('pois')
      .select('*')
      .eq('id', poiId)
      .single();

    if (error || !poi) {
      return res.status(404).json({ error: 'POI not found' });
    }

    return res.json({
      success: true,
      data: poi,
    });
  } catch (error) {
    console.error('Error getting POI details:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get POI categories
router.get('/categories', async (req: AuthRequest, res) => {
  try {
    const { data: categories, error } = await supabaseAdmin
      .from('pois')
      .select('category');

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch categories' });
    }

    return res.json({
      success: true,
      data: [...new Set((categories || []).map((c: any) => c.category).filter(Boolean))],
    });
  } catch (error) {
    console.error('Error getting categories:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Add POI to favorites
router.post('/:poiId/favorite', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { poiId } = req.params;
    const { v4: uuidv4 } = await import('uuid');

    // Check if POI exists
    const { data: poi } = await supabaseAdmin
      .from('pois')
      .select('id')
      .eq('id', poiId)
      .single();

    if (!poi) {
      return res.status(404).json({ error: 'POI not found' });
    }

    const { data: favorite, error } = await supabaseAdmin
      .from('favorites')
      .insert([
        {
          id: uuidv4(),
          user_id: req.user?.id,
          poi_id: poiId,
          favorite_type: 'poi',
        },
      ])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to add favorite' });
    }

    return res.status(201).json({
      success: true,
      data: favorite,
    });
  } catch (error) {
    console.error('Error adding favorite:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
