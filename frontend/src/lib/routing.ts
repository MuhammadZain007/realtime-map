/* ──────────────────────────────────────────────────────────────
   routing.ts — Free routing via OSRM public demo server
   Uses: https://router.project-osrm.org
   No API key needed. Supports driving / walking / cycling.
   ────────────────────────────────────────────────────────────── */

export type TravelMode = "driving" | "walking" | "cycling";

export interface RouteStep {
  instruction: string;
  distance: number; // metres
  duration: number; // seconds
  name: string;
}

export interface FetchedRoute {
  coordinates: [number, number][]; // [lat, lng][]
  distance: number; // metres
  duration: number; // seconds
  steps: RouteStep[];
}

const OSRM_BASE = "https://router.project-osrm.org";

function profileFor(mode: TravelMode) {
  switch (mode) {
    case "driving":
      return "car";
    case "cycling":
      return "bike";
    case "walking":
      return "foot";
    default:
      return "car";
  }
}

/**
 * Fetches a route from OSRM between an origin/destination with optional
 * intermediate waypoints.
 */
export async function fetchRoute(
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number },
  waypoints: { latitude: number; longitude: number }[] = [],
  mode: TravelMode = "driving"
): Promise<FetchedRoute | null> {
  const profile = profileFor(mode);

  // OSRM expects lng,lat order
  const coords = [
    `${origin.longitude},${origin.latitude}`,
    ...waypoints.map((w) => `${w.longitude},${w.latitude}`),
    `${destination.longitude},${destination.latitude}`,
  ].join(";");

  const url = `${OSRM_BASE}/route/v1/${profile}/${coords}?overview=full&geometries=geojson&steps=true`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const json = await res.json();
  if (json.code !== "Ok" || !json.routes?.length) return null;

  const r = json.routes[0];

  // OSRM GeoJSON coordinates are [lng, lat] — convert to [lat, lng] for Leaflet
  const coordinates: [number, number][] = r.geometry.coordinates.map(
    (c: [number, number]) => [c[1], c[0]]
  );

  const steps: RouteStep[] = r.legs.flatMap((leg: any) =>
    leg.steps.map((s: any) => ({
      instruction: s.maneuver?.modifier
        ? `${capitalise(s.maneuver.type)} ${s.maneuver.modifier}${s.name ? " onto " + s.name : ""}`
        : s.maneuver?.type
          ? `${capitalise(s.maneuver.type)}${s.name ? " onto " + s.name : ""}`
          : s.name || "Continue",
      distance: s.distance,
      duration: s.duration,
      name: s.name || "",
    }))
  );

  return {
    coordinates,
    distance: r.distance,
    duration: r.duration,
    steps,
  };
}

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " ");
}

/* ──────────────────────────────────────────────────────────────
   Geocoding — Nominatim (OpenStreetMap), no key needed
   ────────────────────────────────────────────────────────────── */

export interface GeocodingResult {
  displayName: string;
  latitude: number;
  longitude: number;
  type: string;
}

export async function geocodeSearch(query: string): Promise<GeocodingResult[]> {
  if (!query.trim()) return [];

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    query
  )}&limit=6&addressdetails=1`;

  const res = await fetch(url, {
    headers: { "User-Agent": "MapTrackingApp/1.0" },
  });
  if (!res.ok) return [];

  const data: any[] = await res.json();

  return data.map((item) => ({
    displayName: item.display_name,
    latitude: parseFloat(item.lat),
    longitude: parseFloat(item.lon),
    type: item.type,
  }));
}

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "MapTrackingApp/1.0" },
  });
  if (!res.ok) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  const data = await res.json();
  return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}
