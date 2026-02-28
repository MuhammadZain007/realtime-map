// Type definitions for the application

export interface User {
  id: string;
  email: string;
  phone?: string;
  full_name: string;
  avatar_url?: string;
  role: 'admin' | 'driver' | 'viewer' | 'moderator';
  is_active: boolean;
  is_verified: boolean;
  preferences: Record<string, any>;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface Device {
  id: string;
  user_id: string;
  device_id: string;
  device_name?: string;
  device_type?: string;
  os?: string;
  os_version?: string;
  app_version?: string;
  battery_level?: number;
  is_active: boolean;
  last_ping?: string;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  user_id: string;
  device_id?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  speed_kmh?: number;
  address?: string;
  location_type?: string;
  battery_level?: number;
  connectivity?: string;
  is_accurate: boolean;
  created_at: string;
}

export interface Route {
  id: string;
  user_id: string;
  start_location: [number, number];
  end_location: [number, number];
  start_address?: string;
  end_address?: string;
  distance_meters?: number;
  duration_seconds?: number;
  duration_in_traffic_seconds?: number;
  transport_mode: 'driving' | 'walking' | 'cycling' | 'transit' | 'motorcycle';
  polyline?: string;
  steps?: RouteStep[];
  traffic_conditions?: Record<string, any>;
  eta?: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  is_favorite: boolean;
  metadata: Record<string, any>;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  updated_at: string;
}

export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  start_location: [number, number];
  end_location: [number, number];
  polyline?: string;
  maneuver?: string;
}

export interface Geofence {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  fence_geometry: any;
  center_point?: [number, number];
  radius_meters?: number;
  fence_type?: string;
  status: 'active' | 'inactive' | 'triggered';
  notification_enabled: boolean;
  webhook_url?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface GeofenceEvent {
  id: string;
  geofence_id: string;
  user_id: string;
  event_type: 'enter' | 'exit' | 'dwell';
  location?: [number, number];
  entered_at?: string;
  exited_at?: string;
  duration_minutes?: number;
  created_at: string;
}

export interface POI {
  id: string;
  name: string;
  category?: string;
  latitude: number;
  longitude: number;
  address?: string;
  phone?: string;
  website?: string;
  rating?: number;
  review_count?: number;
  hours?: Record<string, any>;
  amenities?: string[];
  photos?: string[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SharedLocation {
  id: string;
  user_id: string;
  share_token: string;
  shared_with: string[];
  is_active: boolean;
  expires_at?: string;
  share_type: 'real_time' | 'history' | 'route';
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface LocationUpdate {
  device_id: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  address?: string;
  battery_level?: number;
  connectivity?: string;
}

export interface TrackingSession {
  id: string;
  user_id: string;
  device_id: string;
  is_active: boolean;
  battery_optimization: 'none' | 'low' | 'medium' | 'high';
  update_interval_seconds: number;
  started_at: string;
  last_update: string;
}

export interface AuthToken {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: 'Bearer';
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}
