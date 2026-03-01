'use client';

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-6">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-slate-800 flex items-center justify-center">
          <svg className="w-12 h-12 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728M5.636 5.636a9 9 0 000 12.728M8.464 15.536a5 5 0 010-7.072M15.536 8.464a5 5 0 010 7.072" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-3">You&apos;re Offline</h1>
        <p className="text-slate-400 mb-6">
          It looks like you&apos;ve lost your internet connection. Some features may not be available.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-xl font-semibold transition-colors"
        >
          Try Again
        </button>
        <p className="text-slate-500 text-sm mt-4">
          Cached map data and recent routes are still available offline.
        </p>
      </div>
    </div>
  );
}
