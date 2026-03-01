"use client";

import { Toaster } from 'react-hot-toast';
import InstallPWA from './InstallPWA';
import NetworkStatus from './NetworkStatus';
import AuthProvider from './AuthProvider';

export default function Providers({ children }: { children?: React.ReactNode }) {
  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          className: 'glass-effect text-sm',
        }}
      />
      <NetworkStatus />
      <InstallPWA />
      {children}
    </AuthProvider>
  );
}
