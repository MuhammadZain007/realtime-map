"use client";

import Link from "next/link";
import dynamic from "next/dynamic";

const MapView = dynamic(() => import("../src/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
      <p className="text-sm text-slate-500">Loading map…</p>
    </div>
  ),
});

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
      {/* ── Nav ── */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span className="text-lg font-bold text-slate-800 dark:text-white">MapTrack</span>
        </div>
        <div className="flex gap-3">
          <Link href="/login" className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:text-slate-900 dark:text-slate-300">
            Sign in
          </Link>
          <Link href="/register" className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-primary-700">
            Get started
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="mx-auto max-w-6xl px-6 pb-10 pt-8">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="inline-block rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
              Real-time GPS Tracking
            </div>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl dark:text-white">
              Track, Navigate &amp;&nbsp;Share — <span className="text-primary-600">like Google Maps</span>
            </h1>
            <p className="max-w-lg text-lg leading-relaxed text-slate-600 dark:text-slate-300">
              Real-time live location, turn-by-turn route planning, destination search, and instant sharing. Free, open-source, no API keys required.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-700"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Open Dashboard
              </Link>
              <Link
                href="/register"
                className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                Create account
              </Link>
            </div>
          </div>

          {/* Map preview */}
          <div className="overflow-hidden rounded-2xl shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700">
            <MapView
              center={{ latitude: 28.6139, longitude: 77.209 }}
              zoom={12}
              className="h-[400px] w-full"
            />
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="mb-8 text-center text-2xl font-bold text-slate-800 dark:text-white">
          Everything you need
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: "📍", title: "Live Location", desc: "Real-time GPS dot with pulsing accuracy ring, just like Google Maps blue dot." },
            { icon: "🗺️", title: "Route Planning", desc: "Set origin, destination, get turn-by-turn directions with distance & ETA." },
            { icon: "🔍", title: "Place Search", desc: "Search any address or place name worldwide using OpenStreetMap geocoding." },
            { icon: "🚗", title: "Drive / Walk / Cycle", desc: "Switch between travel modes — OSRM calculates the best route for each." },
            { icon: "📡", title: "Real-time Tracking", desc: "Start tracking to record GPS breadcrumbs in real time as you move." },
            { icon: "🛰️", title: "Satellite View", desc: "Toggle between street and satellite tile layers with one click." },
            { icon: "📤", title: "Share Location", desc: "Generate secure links so others can view your live position." },
            { icon: "⚡", title: "No API Keys", desc: "100% free — OpenStreetMap tiles, OSRM routing, Nominatim geocoding." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 text-2xl">{f.icon}</div>
              <h3 className="mb-1 font-bold text-slate-800 dark:text-white">{f.title}</h3>
              <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-100 py-8 text-center text-sm text-slate-400 dark:border-slate-800">
        MapTrack © {new Date().getFullYear()} — Open source, built with Next.js + Leaflet + OSRM
      </footer>
    </main>
  );
}
