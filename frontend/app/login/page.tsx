"use client";

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { authAPI } from '../../src/lib/api';
import { useAppStore } from '../../src/stores/appStore';
import { getErrorMessage } from '../../src/utils/format';

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAppStore((state) => state.setUser);
  const setToken = useAppStore((state) => state.setToken);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await authAPI.login({ email, password });
      const { user, token } = response.data.data;

      localStorage.setItem('token', token);
      setToken(token);
      setUser(user);

      toast.success('Welcome back');
      router.push('/dashboard');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-6 py-16">
      <div className="mx-auto w-full max-w-lg space-y-6">
        <div>
          <h1 className="text-headline">Sign in</h1>
          <p className="text-body text-slate-600 dark:text-slate-300">
            Access your live tracking dashboard.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-effect space-y-5 rounded-2xl p-6">
          <div className="space-y-2">
            <label className="text-caption">Email address</label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-caption">Password</label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary-600 px-6 py-3 text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-body text-slate-600 dark:text-slate-300">
          No account yet?{' '}
          <Link className="text-primary-600 hover:underline" href="/register">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
