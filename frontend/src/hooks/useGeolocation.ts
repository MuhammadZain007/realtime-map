"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

interface UseGeolocationOpts {
  /** Start watching immediately */
  autoStart?: boolean;
  /** Desired accuracy */
  enableHighAccuracy?: boolean;
  /** Maximum age of cached position (ms) */
  maximumAge?: number;
  /** Timeout per position read (ms) */
  timeout?: number;
}

export function useGeolocation(opts: UseGeolocationOpts = {}) {
  const {
    autoStart = false,
    enableHighAccuracy = true,
    maximumAge = 5000,
    timeout = 15000,
  } = opts;

  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [watching, setWatching] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  const onSuccess = useCallback((pos: GeolocationPosition) => {
    setPosition({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      heading: pos.coords.heading,
      speed: pos.coords.speed,
      timestamp: pos.timestamp,
    });
    setError(null);
  }, []);

  const onError = useCallback((err: GeolocationPositionError) => {
    switch (err.code) {
      case err.PERMISSION_DENIED:
        setError("Location permission denied. Please enable it in browser settings.");
        break;
      case err.POSITION_UNAVAILABLE:
        setError("Location unavailable. Check your GPS / network.");
        break;
      case err.TIMEOUT:
        setError("Location request timed out.");
        break;
      default:
        setError("An unknown location error occurred.");
    }
  }, []);

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.");
      return;
    }
    // stop previous watch
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = navigator.geolocation.watchPosition(onSuccess, onError, {
      enableHighAccuracy,
      maximumAge,
      timeout,
    });
    setWatching(true);
  }, [enableHighAccuracy, maximumAge, onError, onSuccess, timeout]);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setWatching(false);
  }, []);

  /** Get a one-shot position */
  const getPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy,
      maximumAge,
      timeout,
    });
  }, [enableHighAccuracy, maximumAge, onError, onSuccess, timeout]);

  useEffect(() => {
    if (autoStart) startWatching();
    return () => stopWatching();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  return { position, error, watching, startWatching, stopWatching, getPosition };
}
