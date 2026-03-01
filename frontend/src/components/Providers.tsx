"use client";

import { Toaster } from 'react-hot-toast';
import InstallPWA from './InstallPWA';
import NetworkStatus from './NetworkStatus';

export default function Providers() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          className: 'glass-effect text-sm',
        }}
      />
      <NetworkStatus />
      <InstallPWA />
    </>
  );
}
