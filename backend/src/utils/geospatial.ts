import haversine from 'haversine';
import polyline from '@mapbox/polyline';

// Calculate distance between two coordinates
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  return haversine(
    { latitude: lat1, longitude: lon1 },
    { latitude: lat2, longitude: lon2 },
    { unit: 'km' }
  );
};

// Calculate bearing between two coordinates
export const calculateBearing = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLon);
  const bearing = Math.atan2(y, x) * (180 / Math.PI);
  return (bearing + 360) % 360;
};

// Decode polyline (compressed route)
export const decodePolyline = (encoded: string): Array<[number, number]> => {
  return polyline.decode(encoded);
};

// Encode polyline
export const encodePolyline = (coordinates: Array<[number, number]>): string => {
  return polyline.encode(coordinates);
};

// Check if point is inside bounding box
export const isPointInBBox = (
  lat: number,
  lon: number,
  minLat: number,
  minLon: number,
  maxLat: number,
  maxLon: number
): boolean => {
  return lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon;
};

// Generate bounding box around a point
export const getBoundingBox = (
  lat: number,
  lon: number,
  radiusKm: number
): { minLat: number; minLon: number; maxLat: number; maxLon: number } => {
  const latOffset = radiusKm / 111; // 1 degree latitude ≈ 111 km
  const lonOffset = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));

  return {
    minLat: lat - latOffset,
    minLon: lon - lonOffset,
    maxLat: lat + latOffset,
    maxLon: lon + lonOffset,
  };
};

// Interpolate position between two locations (for smooth animation)
export const interpolateLocation = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  progress: number // 0 to 1
): { latitude: number; longitude: number } => {
  return {
    latitude: lat1 + (lat2 - lat1) * progress,
    longitude: lon1 + (lon2 - lon1) * progress,
  };
};

// Snap point to line (route snapping)
export const snapPointToLineSegment = (
  point: { lat: number; lon: number },
  lineStart: { lat: number; lon: number },
  lineEnd: { lat: number; lon: number }
): { lat: number; lon: number } => {
  const A = {
    x: lineEnd.lon - lineStart.lon,
    y: lineEnd.lat - lineStart.lat,
  };
  const B = {
    x: point.lon - lineStart.lon,
    y: point.lat - lineStart.lat,
  };

  const magA = Math.sqrt(A.x * A.x + A.y * A.y);
  const magASq = magA * magA;

  let t = (B.x * A.x + B.y * A.y) / magASq;
  t = Math.max(0, Math.min(1, t));

  return {
    lat: lineStart.lat + A.y * t,
    lon: lineStart.lon + A.x * t,
  };
};

// Calculate ETA based on distance and average speed
export const calculateETA = (distanceKm: number, avgSpeedKmh: number = 60): number => {
  return Math.round((distanceKm / avgSpeedKmh) * 60); // Return in minutes
};

// Format duration for display
export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);

  if (hours === 0) {
    return `${mins}m`;
  }
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
};

// Get adaptive update interval based on battery level and speed
export const getAdaptiveUpdateInterval = (
  batteryLevel: number,
  speedKmh: number = 0,
  batteryOptimization: 'none' | 'low' | 'medium' | 'high' = 'none'
): number => {
  // Base interval in seconds
  let interval = 5;

  // Adjust based on speed (faster = more frequent updates)
  if (speedKmh > 80) {
    interval = 2; // High speed: 2 seconds
  } else if (speedKmh > 30) {
    interval = 3; // Medium speed: 3 seconds
  } else if (speedKmh < 5) {
    interval = 10; // Stationary or slow: 10 seconds
  }

  // Adjust based on battery level
  if (batteryLevel < 10) {
    interval *= 3; // Battery critical: 3x interval
  } else if (batteryLevel < 20) {
    interval *= 2; // Battery low: 2x interval
  } else if (batteryLevel < 50) {
    interval *= 1.5; // Battery medium: 1.5x interval
  }

  // Adjust based on optimization mode
  const optimizationMultipliers: Record<string, number> = {
    none: 1,
    low: 1.5,
    medium: 2,
    high: 3,
  };

  interval *= optimizationMultipliers[batteryOptimization] || 1;

  // Cap between 1 second minimum and 30 seconds maximum
  return Math.max(1, Math.min(30, Math.round(interval)));
};

// Smooth location data (remove jitter from GPS)
export const smoothLocation = (
  currentLat: number,
  currentLon: number,
  previousLat: number,
  previousLon: number,
  smoothingFactor: number = 0.3 // 0 to 1, higher = more smoothing
): { lat: number; lon: number } => {
  return {
    lat: previousLat + (currentLat - previousLat) * smoothingFactor,
    lon: previousLon + (currentLon - previousLon) * smoothingFactor,
  };
};
