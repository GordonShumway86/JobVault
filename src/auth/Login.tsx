import { useState, type FormEvent } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export default function Login() {
  const [mode, setMode] = useState<'sign_in' | 'sign_up'>('sign_in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === 'sign_in') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setInfo('Account created. Check your email if confirmation is required, then sign in.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-3xl font-bold text-white tracking-tight">Service Log</div>
          <div className="text-zinc-400 text-sm mt-1">Field service records for HVAC & refrigeration</div>
        </div>

        {!isSupabaseConfigured && (
          <div className="mb-4 rounded-lg border border-amber-600/40 bg-amber-950/40 text-amber-300 text-sm p-3">
            Supabase isn't configured yet. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see README) to enable
            sign-in and cloud sync. You can still explore the UI once configured.
          </div>
        )}

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-4 py-3 text-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-4 py-3 text-white text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoComplete={mode === 'sign_in' ? 'current-password' : 'new-password'}
            />
          </div>

          {error && <div className="text-red-400 text-sm">{error}</div>}
          {info && <div className="text-emerald-400 text-sm">{info}</div>}

          <button
            type="submit"
            disabled={busy || !isSupabaseConfigured}
            className="w-full rounded-lg bg-blue-600 active:bg-blue-700 disabled:opacity-50 text-white font-semibold text-base py-3.5 mt-2"
          >
            {busy ? 'Please wait…' : mode === 'sign_in' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === 'sign_in' ? 'sign_up' : 'sign_in')}
          className="w-full text-center text-sm text-zinc-400 mt-4"
        >
          {mode === 'sign_in' ? "No account yet? Create one" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
