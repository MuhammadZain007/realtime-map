-- Demo seed data for local/dev use
-- Run after docs/database-schema.sql

BEGIN;

-- Deterministic UUIDs so relations are stable
-- Users
INSERT INTO users (id, email, phone, password_hash, full_name, role, is_active, is_verified, preferences)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'admin@map.local',
    '+10000000001',
    '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiP6fQ5f5Mzdg3NofM8JrIoYNewc19K',
    'Platform Admin',
    'admin',
    true,
    true,
    '{"theme":"dark"}'::jsonb
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'driver@map.local',
    '+10000000002',
    '$2a$10$7EqJtq98hPqEX7fNZaFWoOHiP6fQ5f5Mzdg3NofM8JrIoYNewc19K',
    'Demo Driver',
    'driver',
    true,
    true,
    '{"theme":"light"}'::jsonb
  )
ON CONFLICT (email) DO NOTHING;

-- Devices
INSERT INTO devices (
  id, user_id, device_id, device_name, device_type, os, os_version, app_version, battery_level, is_active, last_ping
)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  '22222222-2222-2222-2222-222222222222',
  'demo-device-01',
  'Pixel Demo',
  'mobile',
  'Android',
  '14',
  '1.0.0',
  87,
  true,
  NOW()
)
ON CONFLICT (device_id) DO NOTHING;

-- Recent locations for demo driver (New Delhi sample points)
INSERT INTO locations (
  id, user_id, device_id, latitude, longitude, accuracy, altitude, heading, speed, address, location_type, battery_level, connectivity, is_accurate, created_at
)
VALUES
  (
    '44444444-4444-4444-4444-444444444441',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    28.61390,
    77.20900,
    8,
    215,
    25,
    7.5,
    'Connaught Place, New Delhi',
    'gps',
    86,
    '4g',
    true,
    NOW() - INTERVAL '10 minutes'
  ),
  (
    '44444444-4444-4444-4444-444444444442',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    28.61710,
    77.21340,
    7,
    218,
    45,
    10.1,
    'Janpath, New Delhi',
    'gps',
    85,
    '4g',
    true,
    NOW() - INTERVAL '5 minutes'
  ),
  (
    '44444444-4444-4444-4444-444444444443',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    28.62020,
    77.21890,
    6,
    220,
    60,
    12.3,
    'India Gate, New Delhi',
    'gps',
    84,
    '5g',
    true,
    NOW() - INTERVAL '1 minute'
  )
ON CONFLICT (id) DO NOTHING;

-- Route
INSERT INTO routes (
  id,
  user_id,
  start_location,
  end_location,
  start_address,
  end_address,
  distance_meters,
  duration_seconds,
  transport_mode,
  steps,
  status,
  is_favorite,
  started_at,
  completed_at
)
VALUES (
  '55555555-5555-5555-5555-555555555555',
  '22222222-2222-2222-2222-222222222222',
  ST_SetSRID(ST_MakePoint(77.20900, 28.61390), 4326),
  ST_SetSRID(ST_MakePoint(77.21890, 28.62020), 4326),
  'Connaught Place',
  'India Gate',
  2200,
  900,
  'driving',
  '[{"instruction":"Head east","distance":700,"duration":250},{"instruction":"Continue straight","distance":1500,"duration":650}]'::jsonb,
  'completed',
  true,
  NOW() - INTERVAL '30 minutes',
  NOW() - INTERVAL '15 minutes'
)
ON CONFLICT (id) DO NOTHING;

-- Route tracking points
INSERT INTO route_tracking (
  id, route_id, user_id, location, distance_traveled_meters, duration_elapsed_seconds, speed_kmh, heading, created_at
)
VALUES
  (
    '66666666-6666-6666-6666-666666666661',
    '55555555-5555-5555-5555-555555555555',
    '22222222-2222-2222-2222-222222222222',
    ST_SetSRID(ST_MakePoint(77.21100, 28.61550), 4326),
    700,
    250,
    28,
    42,
    NOW() - INTERVAL '24 minutes'
  ),
  (
    '66666666-6666-6666-6666-666666666662',
    '55555555-5555-5555-5555-555555555555',
    '22222222-2222-2222-2222-222222222222',
    ST_SetSRID(ST_MakePoint(77.21540, 28.61830), 4326),
    1600,
    620,
    31,
    57,
    NOW() - INTERVAL '18 minutes'
  )
ON CONFLICT (id) DO NOTHING;

-- Geofence around India Gate
INSERT INTO geofences (
  id,
  user_id,
  name,
  description,
  fence_geometry,
  center_point,
  radius_meters,
  fence_type,
  status,
  notification_enabled,
  metadata
)
VALUES (
  '77777777-7777-7777-7777-777777777777',
  '22222222-2222-2222-2222-222222222222',
  'India Gate Zone',
  'Demo geofence for arrival alerts',
  ST_Buffer(ST_SetSRID(ST_MakePoint(77.22950, 28.61290), 4326)::geography, 500)::geometry,
  ST_SetSRID(ST_MakePoint(77.22950, 28.61290), 4326),
  500,
  'circle',
  'active',
  true,
  '{"priority":"high"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO geofence_events (
  id,
  geofence_id,
  user_id,
  event_type,
  location,
  entered_at,
  created_at
)
VALUES (
  '88888888-8888-8888-8888-888888888888',
  '77777777-7777-7777-7777-777777777777',
  '22222222-2222-2222-2222-222222222222',
  'enter',
  ST_SetSRID(ST_MakePoint(77.22910, 28.61270), 4326),
  NOW() - INTERVAL '12 minutes',
  NOW() - INTERVAL '12 minutes'
)
ON CONFLICT (id) DO NOTHING;

-- POIs
INSERT INTO pois (
  id,
  name,
  category,
  location,
  latitude,
  longitude,
  address,
  rating,
  review_count,
  amenities,
  metadata
)
VALUES
  (
    '99999999-9999-9999-9999-999999999991',
    'India Gate',
    'landmark',
    ST_SetSRID(ST_MakePoint(77.22950, 28.61290), 4326),
    28.61290,
    77.22950,
    'Rajpath, New Delhi',
    4.7,
    24890,
    '["parking","public_toilet"]'::jsonb,
    '{}'::jsonb
  ),
  (
    '99999999-9999-9999-9999-999999999992',
    'Pragati Maidan Metro',
    'transport',
    ST_SetSRID(ST_MakePoint(77.24210, 28.61360), 4326),
    28.61360,
    77.24210,
    'Pragati Maidan, New Delhi',
    4.4,
    6100,
    '["metro","tickets"]'::jsonb,
    '{}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- Favorite POI
INSERT INTO favorites (id, user_id, poi_id, favorite_type)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '22222222-2222-2222-2222-222222222222',
  '99999999-9999-9999-9999-999999999991',
  'poi'
)
ON CONFLICT (id) DO NOTHING;

-- Shared location token
INSERT INTO shared_locations (
  id,
  user_id,
  share_token,
  shared_with,
  is_active,
  expires_at,
  share_type
)
VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '22222222-2222-2222-2222-222222222222',
  'demo-share-token',
  '["viewer@map.local"]'::jsonb,
  true,
  NOW() + INTERVAL '7 days',
  'real_time'
)
ON CONFLICT (share_token) DO NOTHING;

COMMIT;
