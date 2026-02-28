import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Client for authenticated requests
export const supabase = createClient(supabaseUrl, supabaseKey);

// Service role client for admin operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Database utilities
export class DbClient {
  static async getLocationHistory(
    userId: string,
    limit: number = 100,
    offset: number = 0,
    fromDate?: Date,
    toDate?: Date
  ) {
    let query = supabase
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

  static async getRecentLocation(userId: string) {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return { data, error };
  }

  static async saveLocation(location: any) {
    return supabase
      .from('locations')
      .insert([location])
      .select()
      .single();
  }

  static async getActiveGeofences(userId: string) {
    return supabase
      .from('geofences')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');
  }

  static async logGeofenceEvent(event: any) {
    return supabase
      .from('geofence_events')
      .insert([event])
      .select()
      .single();
  }

  static async getRoute(routeId: string) {
    return supabase
      .from('routes')
      .select('*')
      .eq('id', routeId)
      .single();
  }

  static async createRoute(route: any) {
    return supabase
      .from('routes')
      .insert([route])
      .select()
      .single();
  }

  static async updateRoute(routeId: string, updates: any) {
    return supabase
      .from('routes')
      .update(updates)
      .eq('id', routeId)
      .select()
      .single();
  }

  static async getSharedLocation(shareToken: string) {
    return supabase
      .from('shared_locations')
      .select('*')
      .eq('share_token', shareToken)
      .eq('is_active', true)
      .single();
  }

  static async getNearbyPOIs(latitude: number, longitude: number, radiusKm: number = 5) {
    return supabase.rpc('get_nearby_pois', {
      lat: latitude,
      lng: longitude,
      radius_km: radiusKm,
    });
  }

  static async logActivity(activity: any) {
    return supabase
      .from('activity_logs')
      .insert([activity]);
  }
}

export default DbClient;
