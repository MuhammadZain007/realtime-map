"use client";

import { useState, useCallback, useEffect } from "react";
import SearchBar from "./SearchBar";
import {
  fetchRoute,
  reverseGeocode,
  GeocodingResult,
  TravelMode,
  FetchedRoute,
} from "../lib/routing";
import type { LatLng, RouteData } from "./MapView";

interface RoutePlannerProps {
  liveLocation: LatLng | null;
  onOriginChange: (pt: LatLng | null) => void;
  onDestinationChange: (pt: LatLng | null) => void;
  onRouteReady: (r: RouteData | null) => void;
  onInteractionModeChange: (mode: "view" | "setOrigin" | "setDestination") => void;
  /** external values set from map taps */
  origin: LatLng | null;
  destination: LatLng | null;
}

function formatDistance(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}
function formatDuration(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.ceil((s % 3600) / 60);
  return h > 0 ? `${h} hr ${m} min` : `${m} min`;
}

export default function RoutePlanner({
  liveLocation,
  onOriginChange,
  onDestinationChange,
  onRouteReady,
  onInteractionModeChange,
  origin,
  destination,
}: RoutePlannerProps) {
  const [mode, setMode] = useState<TravelMode>("driving");
  const [loading, setLoading] = useState(false);
  const [route, setRoute] = useState<FetchedRoute | null>(null);
  const [originLabel, setOriginLabel] = useState("My location");
  const [destLabel, setDestLabel] = useState("");
  const [showSteps, setShowSteps] = useState(false);

  /* Use live location as default origin */
  const useMyLocation = useCallback(() => {
    if (liveLocation) {
      onOriginChange(liveLocation);
      setOriginLabel("My location");
    }
  }, [liveLocation, onOriginChange]);

  /* Pick origin from search */
  const pickOriginSearch = useCallback(
    (r: GeocodingResult) => {
      onOriginChange({ latitude: r.latitude, longitude: r.longitude });
      setOriginLabel(r.displayName.split(",")[0]);
    },
    [onOriginChange]
  );

  /* Pick destination from search */
  const pickDestSearch = useCallback(
    (r: GeocodingResult) => {
      onDestinationChange({ latitude: r.latitude, longitude: r.longitude });
      setDestLabel(r.displayName.split(",")[0]);
    },
    [onDestinationChange]
  );

  /* When origin/dest change externally (map tap), reverse geocode label */
  useEffect(() => {
    if (origin && originLabel === "") {
      reverseGeocode(origin.latitude, origin.longitude).then((name) =>
        setOriginLabel(name.split(",")[0])
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin]);

  useEffect(() => {
    if (destination && destLabel === "") {
      reverseGeocode(destination.latitude, destination.longitude).then((name) =>
        setDestLabel(name.split(",")[0])
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination]);

  /* Fetch route */
  const getRoute = useCallback(async () => {
    if (!origin || !destination) return;
    setLoading(true);
    setShowSteps(false);
    try {
      const r = await fetchRoute(origin, destination, [], mode);
      setRoute(r);
      if (r) {
        onRouteReady({ coordinates: r.coordinates, distance: r.distance, duration: r.duration, instructions: r.steps.map((s) => s.instruction) });
      } else {
        onRouteReady(null);
      }
    } finally {
      setLoading(false);
    }
  }, [origin, destination, mode, onRouteReady]);

  /* Auto-fetch when both points set */
  useEffect(() => {
    if (origin && destination) getRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, destination, mode]);

  const clearRoute = () => {
    setRoute(null);
    onRouteReady(null);
    onOriginChange(null);
    onDestinationChange(null);
    setOriginLabel("My location");
    setDestLabel("");
    onInteractionModeChange("view");
  };

  const swap = () => {
    const tmpPt = origin;
    const tmpLbl = originLabel;
    onOriginChange(destination);
    onDestinationChange(tmpPt);
    setOriginLabel(destLabel);
    setDestLabel(tmpLbl);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* ── Travel mode selector ── */}
      <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
        {(["driving", "walking", "cycling"] as TravelMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
              mode === m
                ? "bg-white text-primary-600 shadow-sm dark:bg-slate-700 dark:text-primary-400"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {m === "driving" ? "🚗 Drive" : m === "walking" ? "🚶 Walk" : "🚴 Cycle"}
          </button>
        ))}
      </div>

      {/* ── Origin ── */}
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 flex-shrink-0 rounded-full bg-green-500 ring-2 ring-green-200" />
        <SearchBar
          onSelect={pickOriginSearch}
          placeholder={originLabel || "Choose start point…"}
          className="flex-1"
        />
        <button
          onClick={() => onInteractionModeChange("setOrigin")}
          title="Pick on map"
          className="rounded-lg border border-slate-200 p-2 text-xs hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-700"
        >
          📍
        </button>
      </div>

      {/* swap button */}
      <button onClick={swap} className="mx-auto text-slate-400 transition hover:text-primary-500">
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      </button>

      {/* ── Destination ── */}
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 flex-shrink-0 rounded-full bg-red-500 ring-2 ring-red-200" />
        <SearchBar
          onSelect={pickDestSearch}
          placeholder="Choose destination…"
          className="flex-1"
        />
        <button
          onClick={() => onInteractionModeChange("setDestination")}
          title="Pick on map"
          className="rounded-lg border border-slate-200 p-2 text-xs hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-700"
        >
          📍
        </button>
      </div>

      {/* My location shortcut */}
      {liveLocation && !origin && (
        <button
          onClick={useMyLocation}
          className="text-left text-xs font-medium text-primary-600 transition hover:text-primary-700"
        >
          ↗ Use my current location as start
        </button>
      )}

      {/* ── Route result ── */}
      {loading && (
        <div className="flex items-center gap-2 py-2 text-sm text-slate-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          Calculating route…
        </div>
      )}

      {route && !loading && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-lg font-bold text-slate-800 dark:text-white">
                {formatDuration(route.duration)}
              </span>
              <span className="ml-2 text-sm text-slate-500">
                ({formatDistance(route.distance)})
              </span>
            </div>
            <button onClick={clearRoute} className="text-xs text-red-500 hover:text-red-600">
              Clear
            </button>
          </div>

          {/* Steps toggle */}
          <button
            onClick={() => setShowSteps(!showSteps)}
            className="mt-2 text-xs font-medium text-primary-600 hover:underline"
          >
            {showSteps ? "Hide directions ▲" : "Show directions ▼"}
          </button>

          {showSteps && (
            <ol className="mt-2 max-h-48 space-y-1 overflow-auto text-xs text-slate-600 dark:text-slate-300">
              {route.steps
                .filter((s) => s.distance > 0)
                .map((step, i) => (
                  <li key={i} className="flex gap-2 border-b border-slate-100 py-1.5 dark:border-slate-700">
                    <span className="flex-shrink-0 font-bold text-primary-500">{i + 1}.</span>
                    <span>
                      {step.instruction}{" "}
                      <span className="text-slate-400">({formatDistance(step.distance)})</span>
                    </span>
                  </li>
                ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
