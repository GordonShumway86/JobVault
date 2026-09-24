import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { startBackgroundSync } from '../lib/sync';

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  configured: boolean;
}

const AuthContext = createContext<AuthState>({ session: null, user: null, loading: true, configured: false });

// The sync layer needs the current owner id outside of React (queue
// flushing runs from timers/event listeners), so we mirror it here.
let currentOwnerId: string | null = null;
export function getOwnerId() {
  return currentOwnerId;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      currentOwnerId = data.session?.user.id ?? null;
      setLoading(false);
    });
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
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, configured: isSupabaseConfigured }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
