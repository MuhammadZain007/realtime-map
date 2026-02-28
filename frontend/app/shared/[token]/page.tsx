"use client";

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import toast from 'react-hot-toast';
import { locationAPI } from '../../../src/lib/api';
import { formatDateTime, getErrorMessage } from '../../../src/utils/format';

const MapView = dynamic(() => import('../../../src/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
      <p className="text-sm text-slate-500">Loading map…</p>
    </div>
  ),
});

interface SharedLocation {
  id: string;
  latitude: number;
  longitude: number;
  created_at: string;
  address?: string;
}

export default function SharedLocationPage() {
  const params = useParams();
  const token = params?.token as string;
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<SharedLocation | null>(null);

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const response = await locationAPI.getShare(token);
        setLocation(response.data.data);
      } catch (error) {
        toast.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchLocation();
    }
  }, [token]);

  const center = useMemo(() => {
    if (location) {
      return { latitude: location.latitude, longitude: location.longitude };
    }
    return { latitude: 28.6139, longitude: 77.209 };
  }, [location]);

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <header>
          <h1 className="text-headline">Shared live location</h1>
          <p className="text-body text-slate-600 dark:text-slate-300">
            This view updates when the owner shares new location data.
          </p>
        </header>

        <div className="glass-effect rounded-2xl p-4">
          <MapView center={center} />
        </div>

        <div className="glass-effect rounded-2xl p-6">
          {loading ? (
            <p className="text-caption">Loading shared location...</p>
          ) : location ? (
            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <p>
                <span className="font-medium text-slate-800 dark:text-slate-100">
                  Coordinates:
                </span>{' '}
                {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
              </p>
              <p>
                <span className="font-medium text-slate-800 dark:text-slate-100">
                  Updated:
                </span>{' '}
                {formatDateTime(location.created_at)}
              </p>
              {location.address && (
                <p>
                  <span className="font-medium text-slate-800 dark:text-slate-100">
                    Address:
                  </span>{' '}
                  {location.address}
                </p>
              )}
            </div>
          ) : (
            <p className="text-caption">Location is unavailable or expired.</p>
          )}
        </div>
      </div>
    </main>
  );
}
