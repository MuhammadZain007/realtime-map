"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import { useAppStore } from "../../src/stores/appStore";
import { useGeolocation } from "../../src/hooks/useGeolocation";
import type { LatLng, RouteData } from "../../src/components/MapView";

const MapView = dynamic(() => import("../../src/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-slate-100 dark:bg-slate-900">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
    </div>
  ),
});

const SearchBar = dynamic(() => import("../../src/components/SearchBar"), { ssr: false });
const RoutePlanner = dynamic(() => import("../../src/components/RoutePlanner"), { ssr: false });

type Panel = "none" | "directions" | "tracking";

export default function DashboardPage() {
  const router = useRouter();
  const token = useAppStore((s) => s.token);
  const logout = useAppStore((s) => s.logout);

  /* ── Geolocation ── */
  const { position, error: geoError, startWatching, stopWatching, getPosition } = useGeolocation();

  const liveLocation: LatLng | null = position
    ? { latitude: position.latitude, longitude: position.longitude }
    : null;

  const [center, setCenter] = useState<LatLng>({ latitude: 28.6139, longitude: 77.209 });

  /* ── Route planning state ── */
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [destination, setDestination] = useState<LatLng | null>(null);
  const [route, setRoute] = useState<RouteData | null>(null);
  const [interactionMode, setInteractionMode] = useState<"view" | "setOrigin" | "setDestination">("view");
  const [activePanel, setActivePanel] = useState<Panel>("none");

  /* ── Tracking breadcrumbs ── */
  const [trackingActive, setTrackingActive] = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState<LatLng[]>([]);

  /* Centre on live location when first available */
  useEffect(() => {
    if (liveLocation) {
      setCenter(liveLocation);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!position]);

  /* Breadcrumb trail when tracking */
  useEffect(() => {
    if (trackingActive && liveLocation) {
      setBreadcrumbs((prev) => {
        const last = prev[prev.length - 1];
        if (last && Math.abs(last.latitude - liveLocation.latitude) < 0.00005 && Math.abs(last.longitude - liveLocation.longitude) < 0.00005) return prev;
        return [...prev, liveLocation];
      });
    }
  }, [trackingActive, liveLocation]);

  /* Start GPS on mount */
  useEffect(() => { getPosition(); }, [getPosition]);

  /* Auth guard (soft) */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!token && !localStorage.getItem("token")) {
      router.replace("/login");
    }
  }, [token, router]);

  /* ── Map click handler ── */
  const handleMapClick = useCallback(
    (pt: LatLng) => {
      if (interactionMode === "setOrigin") {
        setOrigin(pt);
        setInteractionMode("view");
        toast.success("Start point set");
      } else if (interactionMode === "setDestination") {
        setDestination(pt);
        setInteractionMode("view");
        toast.success("Destination set");
      }
    },
    [interactionMode]
  );

  /* ── Quick search select → set as destination ── */
  const handleQuickSearch = useCallback(
    (r: { latitude: number; longitude: number; displayName: string }) => {
      setCenter({ latitude: r.latitude, longitude: r.longitude });
      setDestination({ latitude: r.latitude, longitude: r.longitude });
      if (liveLocation) setOrigin(liveLocation);
      setActivePanel("directions");
    },
    [liveLocation]
  );

  /* ── Toggle real-time tracking ── */
  const toggleTracking = () => {
    if (trackingActive) {
      stopWatching();
      setTrackingActive(false);
      toast("Tracking stopped", { icon: "⏹️" });
    } else {
      startWatching();
      setTrackingActive(true);
      setBreadcrumbs([]);
      toast("Live tracking started", { icon: "📡" });
    }
  };

  /* ── Centre on me ── */
  const flyToMe = () => {
    if (liveLocation) setCenter({ ...liveLocation });
    else getPosition();
  };

  const breadcrumbMarkers = breadcrumbs.map((b) => ({ ...b, label: "" }));

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* ════════ FULL-SCREEN MAP ════════ */}
      <MapView
        center={center}
        zoom={14}
        className="h-full w-full"
        liveLocation={liveLocation}
        origin={origin}
        destination={destination}
        route={route}
        markers={breadcrumbMarkers}
        onMapClick={handleMapClick}
        interactionMode={interactionMode}
      />

      {/* ════════ TOP BAR (floating) ════════ */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-[1000] flex items-start gap-3 p-4">
        {/* Hamburger / back */}
        <button
          onClick={() => router.push("/")}
          className="pointer-events-auto flex-shrink-0 rounded-xl bg-white p-2.5 shadow-lg transition hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700"
        >
          <svg className="h-5 w-5 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Search box */}
        <div className="pointer-events-auto flex-1">
          <SearchBar
            onSelect={(r) => handleQuickSearch({ ...r, displayName: r.displayName })}
            placeholder="Search places, addresses…"
            className="w-full"
          />
        </div>

        {/* User avatar / sign-out */}
        <button
          onClick={() => { localStorage.removeItem("token"); logout(); router.push("/login"); }}
          className="pointer-events-auto flex-shrink-0 rounded-xl bg-white p-2.5 shadow-lg transition hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700"
          title="Sign out"
        >
          <svg className="h-5 w-5 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>

      {/* ════════ RIGHT FLOATING BUTTONS ════════ */}
      <div className="absolute bottom-28 right-4 z-[1000] flex flex-col gap-2">
        {/* My location */}
        <button
          onClick={flyToMe}
          className="rounded-full bg-white p-3 shadow-lg transition hover:bg-slate-50 dark:bg-slate-800"
          title="My location"
        >
          <svg className="h-5 w-5 text-primary-500" fill="currentColor" viewBox="0 0 24 24">
            <circle cx={12} cy={12} r={3} />
            <path d="M12 2a1 1 0 011 1v2.07A7.001 7.001 0 0118.93 11H21a1 1 0 110 2h-2.07A7.001 7.001 0 0113 18.93V21a1 1 0 11-2 0v-2.07A7.001 7.001 0 015.07 13H3a1 1 0 110-2h2.07A7.001 7.001 0 0111 5.07V3a1 1 0 011-1zm0 5a5 5 0 100 10 5 5 0 000-10z" />
          </svg>
        </button>

        {/* Toggle tracking */}
        <button
          onClick={toggleTracking}
          className={`rounded-full p-3 shadow-lg transition ${
            trackingActive
              ? "bg-red-500 text-white hover:bg-red-600"
              : "bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300"
          }`}
          title={trackingActive ? "Stop tracking" : "Start live tracking"}
        >
          {trackingActive ? (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x={6} y={6} width={12} height={12} rx={1} strokeWidth={2} /></svg>
          ) : (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          )}
        </button>
      </div>

      {/* ════════ BOTTOM ACTION BAR ════════ */}
      <div className="absolute bottom-4 left-4 right-4 z-[1000] flex items-center justify-center gap-3">
        <button
          onClick={() => setActivePanel(activePanel === "directions" ? "none" : "directions")}
          className={`flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-lg transition ${
            activePanel === "directions"
              ? "bg-primary-600 text-white"
              : "bg-white text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200"
          }`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          Directions
        </button>

        <button
          onClick={() => setActivePanel(activePanel === "tracking" ? "none" : "tracking")}
          className={`flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-lg transition ${
            activePanel === "tracking"
              ? "bg-primary-600 text-white"
              : "bg-white text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200"
          }`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Tracking
        </button>
      </div>

      {/* ════════ SIDE PANEL ════════ */}
      {activePanel !== "none" && (
        <div className="absolute bottom-20 left-4 top-20 z-[1000] w-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur-lg dark:border-slate-700 dark:bg-slate-900/95 sm:w-96">
          {/* close */}
          <button
            onClick={() => { setActivePanel("none"); setInteractionMode("view"); }}
            className="absolute right-3 top-3 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {activePanel === "directions" && (
            <>
              <h2 className="mb-4 text-lg font-bold text-slate-800 dark:text-white">Get Directions</h2>
              <RoutePlanner
                liveLocation={liveLocation}
                origin={origin}
                destination={destination}
                onOriginChange={setOrigin}
                onDestinationChange={setDestination}
                onRouteReady={setRoute}
                onInteractionModeChange={(m) => setInteractionMode(m as any)}
              />
            </>
          )}

          {activePanel === "tracking" && (
            <>
              <h2 className="mb-4 text-lg font-bold text-slate-800 dark:text-white">Live Tracking</h2>

              {/* Current position info */}
              <div className="space-y-3">
                {geoError && (
                  <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600 dark:bg-red-900/30 dark:text-red-300">
                    {geoError}
                  </div>
                )}

                {liveLocation ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                    <p className="text-xs font-medium text-slate-500">Current position</p>
                    <p className="mt-1 font-mono text-sm text-slate-800 dark:text-white">
                      {liveLocation.latitude.toFixed(6)}, {liveLocation.longitude.toFixed(6)}
                    </p>
                    {position?.accuracy && (
                      <p className="mt-0.5 text-xs text-slate-400">Accuracy ±{Math.round(position.accuracy)}m</p>
                    )}
                    {position?.speed != null && position.speed > 0 && (
                      <p className="mt-0.5 text-xs text-slate-400">
                        Speed: {(position.speed * 3.6).toFixed(1)} km/h
                      </p>
                    )}
                    {position?.heading != null && (
                      <p className="mt-0.5 text-xs text-slate-400">Heading: {Math.round(position.heading)}°</p>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center dark:border-slate-700 dark:bg-slate-800/50">
                    <p className="text-sm text-slate-500">Waiting for GPS…</p>
                    <button onClick={getPosition} className="mt-2 text-xs font-medium text-primary-600 hover:underline">
                      Request location
                    </button>
                  </div>
                )}

                {/* Toggle button */}
                <button
                  onClick={toggleTracking}
                  className={`w-full rounded-xl py-3 text-sm font-semibold transition ${
                    trackingActive
                      ? "bg-red-500 text-white hover:bg-red-600"
                      : "bg-primary-600 text-white hover:bg-primary-700"
                  }`}
                >
                  {trackingActive ? "⏹ Stop Real-time Tracking" : "▶ Start Real-time Tracking"}
                </button>

                {/* Breadcrumb count */}
                {trackingActive && (
                  <div className="flex items-center justify-between rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
                    <div>
                      <p className="text-xs font-medium text-green-700 dark:text-green-300">Recording…</p>
                      <p className="text-lg font-bold text-green-800 dark:text-green-200">{breadcrumbs.length} points</p>
                    </div>
                    <div className="h-3 w-3 animate-pulse rounded-full bg-green-500" />
                  </div>
                )}

                {/* Recent breadcrumbs */}
                {breadcrumbs.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-slate-500">Recent trail</p>
                    <div className="max-h-40 space-y-1 overflow-auto">
                      {breadcrumbs.slice(-8).reverse().map((b, i) => (
                        <div key={i} className="rounded-lg bg-slate-100 px-3 py-1.5 font-mono text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {b.latitude.toFixed(6)}, {b.longitude.toFixed(6)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ════════ Interaction mode banner ════════ */}
      {interactionMode !== "view" && (
        <div className="absolute left-1/2 top-20 z-[1001] -translate-x-1/2 rounded-full bg-black/70 px-5 py-2 text-sm font-medium text-white backdrop-blur">
          {interactionMode === "setOrigin" ? "Tap map to set START point" : "Tap map to set DESTINATION"}{" "}
          <button onClick={() => setInteractionMode("view")} className="ml-2 text-red-300 hover:text-red-200">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
