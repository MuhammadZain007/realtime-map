"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { geocodeSearch, GeocodingResult } from "../lib/routing";

interface SearchBarProps {
  onSelect: (result: GeocodingResult) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchBar({ onSelect, placeholder, className }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const data = await geocodeSearch(q);
      setResults(data);
      setOpen(data.length > 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  /* close dropdown on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={wrapperRef} className={`relative ${className ?? ""}`}>
      <div className="relative">
        {/* Search icon */}
        <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder ?? "Search places…"}
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-[9999] mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
          {results.map((r, i) => (
            <li
              key={i}
              onClick={() => { onSelect(r); setQuery(r.displayName.split(",")[0]); setOpen(false); }}
              className="cursor-pointer px-4 py-2.5 text-sm text-slate-700 transition hover:bg-primary-50 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <p className="font-medium">{r.displayName.split(",")[0]}</p>
              <p className="truncate text-xs text-slate-400">{r.displayName}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
