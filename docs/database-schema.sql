-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enum types
CREATE TYPE user_role AS ENUM ('admin', 'driver', 'viewer', 'moderator');
CREATE TYPE tracking_status AS ENUM ('active', 'paused', 'inactive', 'offline');
CREATE TYPE geofence_status AS ENUM ('active', 'inactive', 'triggered');
CREATE TYPE route_status AS ENUM ('pending', 'active', 'completed', 'cancelled');
CREATE TYPE transport_mode AS ENUM ('driving', 'walking', 'cycling', 'transit', 'motorcycle');

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role user_role DEFAULT 'viewer',
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create index on email for faster lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);

-- Devices table for multi-device support
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL UNIQUE,
  device_name TEXT,
  device_type TEXT,
  os TEXT,
  os_version TEXT,
  app_version TEXT,
  battery_level SMALLINT,
  is_active BOOLEAN DEFAULT true,
  last_ping TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_devices_user_id ON devices(user_id);
CREATE INDEX idx_devices_device_id ON devices(device_id);

-- Real-time locations table
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
  latitude FLOAT NOT NULL,
  longitude FLOAT NOT NULL,
  accuracy FLOAT,
  altitude FLOAT,
  heading FLOAT,
  speed FLOAT,
  speed_kmh FLOAT GENERATED ALWAYS AS (COALESCE(speed * 3.6, 0)) STORED,
  location GEOMETRY(POINT, 4326) GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
  ) STORED,
  address TEXT,
  location_type TEXT,
  battery_level SMALLINT,
  connectivity TEXT,
  is_accurate BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Spatial index for fast geographic queries
CREATE INDEX idx_locations_location ON locations USING GIST(location);
CREATE INDEX idx_locations_user_id ON locations(user_id);
CREATE INDEX idx_locations_created_at ON locations(created_at DESC);
CREATE INDEX idx_locations_user_created ON locations(user_id, created_at DESC);

-- Routes table
CREATE TABLE IF NOT EXISTS routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_location GEOMETRY(POINT, 4326) NOT NULL,
  end_location GEOMETRY(POINT, 4326) NOT NULL,
  start_address TEXT,
  end_address TEXT,
  distance_meters FLOAT,
  duration_seconds FLOAT,
  duration_in_traffic_seconds FLOAT,
  transport_mode transport_mode DEFAULT 'driving',
  polyline TEXT,
  steps JSONB DEFAULT '[]'::jsonb,
  traffic_conditions JSONB DEFAULT '{}'::jsonb,
  eta TIMESTAMP WITH TIME ZONE,
  status route_status DEFAULT 'pending',
  is_favorite BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_routes_user_id ON routes(user_id);
CREATE INDEX idx_routes_status ON routes(status);
CREATE INDEX idx_routes_created_at ON routes(created_at DESC);

-- Route history/tracking table
CREATE TABLE IF NOT EXISTS route_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location GEOMETRY(POINT, 4326) NOT NULL,
  distance_traveled_meters FLOAT,
  duration_elapsed_seconds FLOAT,
  speed_kmh FLOAT,
  heading FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_route_tracking_route_id ON route_tracking(route_id);
CREATE INDEX idx_route_tracking_user_id ON route_tracking(user_id);
CREATE INDEX idx_route_tracking_created_at ON route_tracking(created_at DESC);

-- Geofences table
CREATE TABLE IF NOT EXISTS geofences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  fence_geometry GEOMETRY NOT NULL,
  center_point GEOMETRY(POINT, 4326),
  radius_meters FLOAT,
  fence_type TEXT,
  status geofence_status DEFAULT 'active',
  notification_enabled BOOLEAN DEFAULT true,
  webhook_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_geofences_user_id ON geofences(user_id);
CREATE INDEX idx_geofences_geometry ON geofences USING GIST(fence_geometry);

-- Geofence events
CREATE TABLE IF NOT EXISTS geofence_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  geofence_id UUID NOT NULL REFERENCES geofences(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  location GEOMETRY(POINT, 4326),
  entered_at TIMESTAMP WITH TIME ZONE,
  exited_at TIMESTAMP WITH TIME ZONE,
  duration_minutes FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_geofence_events_geofence_id ON geofence_events(geofence_id);
CREATE INDEX idx_geofence_events_user_id ON geofence_events(user_id);
CREATE INDEX idx_geofence_events_created_at ON geofence_events(created_at DESC);

-- Points of Interest (POIs)
CREATE TABLE IF NOT EXISTS pois (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT,
  location GEOMETRY(POINT, 4326) NOT NULL,
  latitude FLOAT NOT NULL,
  longitude FLOAT NOT NULL,
  address TEXT,
  phone TEXT,
  website TEXT,
  rating FLOAT,
  review_count INT,
  hours JSONB,
  amenities JSONB DEFAULT '[]'::jsonb,
  photos JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pois_location ON pois USING GIST(location);
CREATE INDEX idx_pois_category ON pois(category);
CREATE INDEX idx_pois_name ON pois USING GIN(to_tsvector('english', name));

-- Favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  poi_id UUID REFERENCES pois(id) ON DELETE CASCADE,
  location_latitude FLOAT,
  location_longitude FLOAT,
  location_name TEXT,
  location_address TEXT,
  favorite_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT favorites_poi_or_location CHECK (
    (poi_id IS NOT NULL AND location_latitude IS NULL) OR
    (poi_id IS NULL AND location_latitude IS NOT NULL)
  )
);

CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_favorites_poi_id ON favorites(poi_id);

-- Shared locations table
CREATE TABLE IF NOT EXISTS shared_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  share_token TEXT UNIQUE NOT NULL,
  shared_with JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  share_type TEXT DEFAULT 'real_time',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shared_locations_user_id ON shared_locations(user_id);
CREATE INDEX idx_shared_locations_share_token ON shared_locations(share_token);

-- Activity log for audit trails
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- Permissions/Access control table
CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_type TEXT NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_permission UNIQUE (user_id, target_user_id, permission_type)
);

CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX idx_user_permissions_target_user_id ON user_permissions(target_user_id);

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofence_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- Users can see their own data
CREATE POLICY user_self_policy ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY user_update_policy ON users
  FOR UPDATE USING (auth.uid() = id);

-- Locations: Users see their own or shared locations
CREATE POLICY locations_select_policy ON locations
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM shared_locations
      WHERE shared_locations.user_id = locations.user_id
      AND shared_locations.is_active = true
      AND (shared_locations.expires_at IS NULL OR shared_locations.expires_at > NOW())
    ) OR
    auth.jwt() ->> 'role' = 'admin'
  );

-- Devices: Users see their own devices
CREATE POLICY devices_select_policy ON devices
  FOR SELECT USING (auth.uid() = user_id);

-- Routes: Users see their own routes
CREATE POLICY routes_select_policy ON routes
  FOR SELECT USING (auth.uid() = user_id);

-- Geofences: Users see their own geofences
CREATE POLICY geofences_select_policy ON geofences
  FOR SELECT USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER users_updated_at_trigger
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER devices_updated_at_trigger
BEFORE UPDATE ON devices
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER routes_updated_at_trigger
BEFORE UPDATE ON routes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER geofences_updated_at_trigger
BEFORE UPDATE ON geofences
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER pois_updated_at_trigger
BEFORE UPDATE ON pois
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER shared_locations_updated_at_trigger
BEFORE UPDATE ON shared_locations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Function to check if point is in geofence
CREATE OR REPLACE FUNCTION check_geofence_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if location point intersects with any geofence
  UPDATE geofence_events
  SET event_type = 'exit', exited_at = NOW()
  WHERE geofence_id IN (
    SELECT id FROM geofences
    WHERE user_id = NEW.user_id AND status = 'active'
    AND NOT ST_Contains(fence_geometry, NEW.location)
  ) AND event_type = 'enter' AND exited_at IS NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER location_geofence_check
AFTER INSERT ON locations
FOR EACH ROW
EXECUTE FUNCTION check_geofence_trigger();
