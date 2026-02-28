// Zustand store for app state management
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url?: string;
}

interface Location {
  id: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  address?: string;
  created_at: string;
}

interface AppStore {
  // Auth state
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;

  // Location state
  currentLocation: Location | null;
  setCurrentLocation: (location: Location | null) => void;
  locationHistory: Location[];
  addLocationToHistory: (location: Location) => void;

  // Tracking state
  isTracking: boolean;
  startTracking: () => void;
  stopTracking: () => void;

  // UI state
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  showSidebar: boolean;
  setSidebar: (show: boolean) => void;

  // Settings
  enableNotifications: boolean;
  setNotifications: (enabled: boolean) => void;
  batteryOptimization: 'none' | 'low' | 'medium' | 'high';
  setBatteryOptimization: (level: string) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      // Auth
      user: null,
      token: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token) => set({ token }),
      logout: () =>
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isTracking: false,
        }),

      // Location
      currentLocation: null,
      setCurrentLocation: (location) => set({ currentLocation: location }),
      locationHistory: [],
      addLocationToHistory: (location) =>
        set((state) => ({
          locationHistory: [location, ...state.locationHistory].slice(0, 100),
        })),

      // Tracking
      isTracking: false,
      startTracking: () => set({ isTracking: true }),
      stopTracking: () => set({ isTracking: false }),

      // UI
      theme: 'light',
      setTheme: (theme) => set({ theme }),
      showSidebar: true,
      setSidebar: (show) => set({ showSidebar: show }),

      // Settings
      enableNotifications: true,
      setNotifications: (enabled) => set({ enableNotifications: enabled }),
      batteryOptimization: 'none',
      setBatteryOptimization: (level) =>
        set({ batteryOptimization: level as any }),
    }),
    {
      name: 'app-store',
      partialize: (state) => ({
        theme: state.theme,
        enableNotifications: state.enableNotifications,
        batteryOptimization: state.batteryOptimization,
      }),
    }
  )
);
