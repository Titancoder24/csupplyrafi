import React, { createContext, useContext, useEffect, useMemo, useCallback, useState } from 'react';
import { supabase } from '@/services/supabase';
import type { Session, User } from '@supabase/supabase-js';

type Role = 'customer' | 'vendor' | 'transporter' | 'admin' | 'super_admin' | 'system';

export type ProfileRow = {
  id: string;
  phone: string | null;
  email: string | null;
  full_name: string | null;
  role: Role;
  language: string;
  avatar_url: string | null;
  verified: boolean;
  is_demo: boolean;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: ProfileRow | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Fetch a profile with retry logic. The server-side `handle_new_user` trigger
 * creates the profile row asynchronously, so it may not be available immediately
 * after signup. We retry up to 3 times with a 500ms delay.
 */
async function fetchProfileWithRetry(userId: string, retries = 3): Promise<ProfileRow | null> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, phone, email, full_name, role, language, avatar_url, verified, is_demo')
      .eq('id', userId)
      .maybeSingle();
    if (!error && data) return data as ProfileRow;
    if (attempt < retries - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    if (!session?.user?.id) return;
    const next = await fetchProfileWithRetry(session.user.id, 1);
    setProfile(next);
  }, [session?.user?.id]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session ?? null);
      if (data.session?.user) {
        const p = await fetchProfileWithRetry(data.session.user.id, 1);
        if (active) setProfile(p);
      }
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      setSession(sess);
      if (sess?.user) {
        // Profile is created by the server-side handle_new_user trigger.
        // Use retry logic for new signups where the trigger may take a moment.
        const p = await fetchProfileWithRetry(sess.user.id, 3);
        setProfile(p);
      } else {
        setProfile(null);
      }
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    profile,
    loading,
    refreshProfile,
    signOut,
  }), [session, profile, loading, refreshProfile, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
