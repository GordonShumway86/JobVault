import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { startBackgroundSync } from '../lib/sync';

// Single-owner personal app: there's no sign-in screen. The app logs itself
// in automatically using a fixed account (credentials baked in at build
// time via env vars), so there's nothing to type and nothing to get locked
// out of. Auth is still real under the hood (Supabase session + RLS scoped
// by owner_id) — it's just invisible to the person using the app.
const APP_EMAIL = import.meta.env.VITE_APP_EMAIL as string | undefined;
const APP_PASSWORD = import.meta.env.VITE_APP_PASSWORD as string | undefined;

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  configured: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthState>({ session: null, user: null, loading: true, configured: false, error: null });

// The sync layer needs the current owner id outside of React (queue
// flushing runs from timers/event listeners), so we mirror it here.
let currentOwnerId: string | null = null;
export function getOwnerId() {
  return currentOwnerId;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setSession(data.session);
        currentOwnerId = data.session.user.id;
        setLoading(false);
        return;
      }

      if (!APP_EMAIL || !APP_PASSWORD) {
        setError('App account not configured (VITE_APP_EMAIL / VITE_APP_PASSWORD missing).');
        setLoading(false);
        return;
      }

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: APP_EMAIL,
        password: APP_PASSWORD,
      });
      if (signInError) {
        setError(signInError.message);
      } else {
        setSession(signInData.session);
        currentOwnerId = signInData.session?.user.id ?? null;
      }
      setLoading(false);
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      currentOwnerId = s?.user.id ?? null;
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user.id) return;
    return startBackgroundSync(() => currentOwnerId);
  }, [session?.user.id]);

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, configured: isSupabaseConfigured, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
