'use client';

import { useState, useEffect } from 'react';

export default function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showBanner) return null;

  return (
    <div className={`fixed top-0 left-0 right-0 z-[9999] transition-transform duration-300 ${showBanner ? 'translate-y-0' : '-translate-y-full'}`}>
      <div className={`py-2 px-4 text-center text-sm font-medium ${
        isOnline
          ? 'bg-green-500 text-white'
          : 'bg-red-500 text-white'
      }`}>
        {isOnline ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full" />
            Back online
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            You&apos;re offline — some features may be limited
          </span>
        )}
      </div>
    </div>
  );
}
