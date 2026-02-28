"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";

/* ── Fix default marker icons that Webpack / Next.js breaks ── */
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

/* ── Custom icons ── */
const liveIcon = L.divIcon({
  className: "",
  html: `<div class="live-dot"><div class="live-dot-ring"></div></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const startIcon = L.divIcon({
  className: "",
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#22c55e;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const endIcon = L.divIcon({
  className: "",
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#ef4444;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const waypointIcon = L.divIcon({
  className: "",
  html: `<div style="width:10px;height:10px;border-radius:50%;background:#f59e0b;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.25)"></div>`,
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});

/* ── Types ── */
export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface RouteData {
  coordinates: [number, number][]; // [lat,lng][]
  distance?: number; // metres
  duration?: number; // seconds
  instructions?: string[];
}

export interface MapViewProps {
  center: LatLng;
  zoom?: number;
  className?: string;
  /** Show user's live location blue dot */
  liveLocation?: LatLng | null;
  /** Extra markers (POI, history, etc.) */
  markers?: Array<LatLng & { label?: string }>;
  /** Start + end waypoints for route mode */
  origin?: LatLng | null;
  destination?: LatLng | null;
  waypoints?: LatLng[];
  /** Decoded route polyline */
  route?: RouteData | null;
  /** Called when user taps the map */
  onMapClick?: (latlng: LatLng) => void;
  /** Map interaction mode */
  interactionMode?: "view" | "setOrigin" | "setDestination" | "addWaypoint";
}

export default function MapView({
  center,
  zoom = 14,
  className,
  liveLocation,
  markers,
  origin,
  destination,
  waypoints,
  route,
  onMapClick,
  interactionMode = "view",
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  /* layer refs */
  const liveDotRef = useRef<L.Marker | null>(null);
  const liveCircleRef = useRef<L.Circle | null>(null);
  const originMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const waypointMarkersRef = useRef<L.Marker[]>([]);
  const extraMarkersRef = useRef<L.Marker[]>([]);
  const routeLineRef = useRef<L.Polyline | null>(null);

  /* ───── Initialise map once ───── */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [center.latitude, center.longitude],
      zoom,
      zoomControl: false,
      attributionControl: false,
    });

    L.control.zoom({ position: "topright" }).addTo(map);
    L.control.attribution({ position: "bottomright" }).addTo(map);

    /* Base tile layers */
    const osmLayer = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }
    );

    const satelliteLayer = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 18, attribution: "Tiles &copy; Esri" }
    );

    osmLayer.addTo(map);

    L.control.layers({ Street: osmLayer, Satellite: satelliteLayer }, {}, { position: "topright", collapsed: true }).addTo(map);
    L.control.scale({ position: "bottomleft", metric: true }).addTo(map);

    mapRef.current = map;
    const timer = setTimeout(() => {
      if (mapRef.current && containerRef.current) {
        map.invalidateSize();
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ───── Map click ───── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const handler = (e: L.LeafletMouseEvent) => {
      onMapClick?.({ latitude: e.latlng.lat, longitude: e.latlng.lng });
    };
    map.on("click", handler);
    return () => { map.off("click", handler); };
  }, [onMapClick]);

  /* cursor style */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.style.cursor = interactionMode !== "view" ? "crosshair" : "";
  }, [interactionMode]);

  /* ───── Live location blue dot ───── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (liveLocation) {
      const ll: L.LatLngExpression = [liveLocation.latitude, liveLocation.longitude];
      if (!liveDotRef.current) {
        liveDotRef.current = L.marker(ll, { icon: liveIcon, zIndexOffset: 1000 }).addTo(map);
        liveCircleRef.current = L.circle(ll, { radius: 40, stroke: false, fillColor: "#3b82f6", fillOpacity: 0.12 }).addTo(map);
      } else {
        liveDotRef.current.setLatLng(ll);
        liveCircleRef.current?.setLatLng(ll);
      }
    } else {
      liveDotRef.current?.remove(); liveDotRef.current = null;
      liveCircleRef.current?.remove(); liveCircleRef.current = null;
    }
  }, [liveLocation]);

  /* ───── Origin marker ───── */
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    originMarkerRef.current?.remove(); originMarkerRef.current = null;
    if (origin) {
      originMarkerRef.current = L.marker([origin.latitude, origin.longitude], { icon: startIcon, zIndexOffset: 900 }).bindPopup("Start").addTo(map);
    }
  }, [origin]);

  /* ───── Destination marker ───── */
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    destMarkerRef.current?.remove(); destMarkerRef.current = null;
    if (destination) {
      destMarkerRef.current = L.marker([destination.latitude, destination.longitude], { icon: endIcon, zIndexOffset: 900 }).bindPopup("Destination").addTo(map);
    }
  }, [destination]);

  /* ───── Waypoint markers ───── */
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    waypointMarkersRef.current.forEach((m) => m.remove());
    waypointMarkersRef.current = [];
    waypoints?.forEach((wp, i) => {
      const m = L.marker([wp.latitude, wp.longitude], { icon: waypointIcon, zIndexOffset: 800 }).bindPopup(`Waypoint ${i + 1}`).addTo(map);
      waypointMarkersRef.current.push(m);
    });
  }, [waypoints]);

  /* ───── Route polyline ───── */
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    routeLineRef.current?.remove(); routeLineRef.current = null;
    if (route && route.coordinates.length > 1) {
      routeLineRef.current = L.polyline(route.coordinates, { color: "#4285F4", weight: 5, opacity: 0.85, lineJoin: "round", lineCap: "round" }).addTo(map);
      map.fitBounds(routeLineRef.current.getBounds(), { padding: [60, 60] });
    }
  }, [route]);

  /* ───── Extra markers ───── */
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    extraMarkersRef.current.forEach((m) => m.remove());
    extraMarkersRef.current = [];
    markers?.forEach((pt) => {
      const m = L.marker([pt.latitude, pt.longitude]).addTo(map);
      if (pt.label) m.bindPopup(pt.label);
      extraMarkersRef.current.push(m);
    });
  }, [markers]);

  /* ───── Centre changes ───── */
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView([center.latitude, center.longitude], mapRef.current.getZoom(), { animate: true });
  }, [center.latitude, center.longitude]);

  return (
    <div className={className ?? "relative h-full w-full overflow-hidden rounded-2xl"}>
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
