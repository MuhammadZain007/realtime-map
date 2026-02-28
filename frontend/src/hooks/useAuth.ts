"use client";

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI } from '../lib/api';
import { useAppStore } from '../stores/appStore';
import { getErrorMessage } from '../utils/format';
import toast from 'react-hot-toast';

export default function useAuth() {
  const router = useRouter();
  const user = useAppStore((state) => state.user);
  const token = useAppStore((state) => state.token);
  const setUser = useAppStore((state) => state.setUser);
  const setToken = useAppStore((state) => state.setToken);
  const logout = useAppStore((state) => state.logout);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!token) {
      const stored = localStorage.getItem('token');
      if (stored) {
        setToken(stored);
      }
    }
  }, [setToken, token]);

  const ensureProfile = useCallback(async () => {
    if (!token) return;
    if (user) return;

    try {
      const response = await authAPI.getProfile();
      setUser(response.data.data);
    } catch (error) {
      toast.error(getErrorMessage(error));
      logout();
      router.replace('/login');
    }
  }, [logout, router, setUser, token, user]);

  return {
    user,
    token,
    ensureProfile,
  };
}
