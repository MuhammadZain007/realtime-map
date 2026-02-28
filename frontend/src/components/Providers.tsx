"use client";

import { Toaster } from 'react-hot-toast';

export default function Providers() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        className: 'glass-effect text-sm',
      }}
    />
  );
}
