import '../src/globals.css';
import 'leaflet/dist/leaflet.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Providers from '../src/components/Providers';

export const metadata: Metadata = {
  title: 'Map Tracking',
  description: 'Real-time location tracking and geofencing dashboard',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
        <Providers />
        {children}
      </body>
    </html>
  );
}
