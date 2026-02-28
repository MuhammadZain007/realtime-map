// API client utilities
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Add token to requests
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle response errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      // Clear auth state
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const locationAPI = {
  submitUpdate: (data: any) => apiClient.post('/locations/update', data),
  getRecent: () => apiClient.get('/locations/recent'),
  getHistory: (params?: any) => apiClient.get('/locations/history', { params }),
  createShare: (data: any) => apiClient.post('/locations/share', data),
  getShare: (shareToken: string) => apiClient.get(`/locations/shared/${shareToken}`),
  getShares: () => apiClient.get('/locations/shares'),
  revokeShare: (shareToken: string) => apiClient.delete(`/locations/shares/${shareToken}`),
};

export const routeAPI = {
  create: (data: any) => apiClient.post('/routes', data),
  list: (params?: any) => apiClient.get('/routes', { params }),
  get: (routeId: string) => apiClient.get(`/routes/${routeId}`),
  start: (routeId: string) => apiClient.post(`/routes/${routeId}/start`),
  complete: (routeId: string) => apiClient.post(`/routes/${routeId}/complete`),
  getTracking: (routeId: string) => apiClient.get(`/routes/${routeId}/tracking`),
  toggleFavorite: (routeId: string, isFavorite: boolean) =>
    apiClient.patch(`/routes/${routeId}/favorite`, { is_favorite: isFavorite }),
  delete: (routeId: string) => apiClient.delete(`/routes/${routeId}`),
};

export const geofenceAPI = {
  create: (data: any) => apiClient.post('/geofences', data),
  list: () => apiClient.get('/geofences'),
  get: (geofenceId: string) => apiClient.get(`/geofences/${geofenceId}`),
  update: (geofenceId: string, data: any) =>
    apiClient.patch(`/geofences/${geofenceId}`, data),
  delete: (geofenceId: string) => apiClient.delete(`/geofences/${geofenceId}`),
  getEvents: (geofenceId: string, params?: any) =>
    apiClient.get(`/geofences/${geofenceId}/events`, { params }),
};

export const poiAPI = {
  search: (query: string, params?: any) =>
    apiClient.get('/pois/search', { params: { query, ...params } }),
  getNearby: (latitude: number, longitude: number, params?: any) =>
    apiClient.get('/pois/nearby', { params: { latitude, longitude, ...params } }),
  getDetails: (poiId: string) => apiClient.get(`/pois/${poiId}`),
  getCategories: () => apiClient.get('/pois/categories'),
  addFavorite: (poiId: string) => apiClient.post(`/pois/${poiId}/favorite`),
};

export const authAPI = {
  register: (data: any) => apiClient.post('/auth/register', data),
  login: (data: any) => apiClient.post('/auth/login', data),
  getProfile: () => apiClient.get('/auth/me'),
  updateProfile: (data: any) => apiClient.put('/auth/me', data),
  getDevices: () => apiClient.get('/auth/devices'),
  registerDevice: (data: any) => apiClient.post('/auth/devices', data),
};

export default apiClient;
