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

const DEMO_NUMBERS: Record<string, { role: Role; name: string }> = {
  '+919000000001': { role: 'customer', name: 'Ramesh Kumar (Demo)' },
  '+919000000002': { role: 'vendor', name: 'Sri Balaji Building Materials (Demo)' },
  '+919000000003': { role: 'transporter', name: 'Suresh Reddy (Demo)' },
  '+919000000004': { role: 'admin', name: 'Demo Admin' },
  '+919000000005': { role: 'super_admin', name: 'Demo Super Admin' },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string): Promise<ProfileRow | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, phone, email, full_name, role, language, avatar_url, verified, is_demo')
      .eq('id', userId)
      .maybeSingle();
    if (error) return null;
    return (data as ProfileRow) ?? null;
  };

  const refreshProfile = useCallback(async () => {
    if (!session?.user?.id) return;
    const next = await fetchProfile(session.user.id);
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
        const p = await fetchProfile(data.session.user.id);
        if (active) setProfile(p);
      }
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      setSession(sess);
      if (sess?.user) {
        let p = await fetchProfile(sess.user.id);
        if (!p) {
          // New user — auto-create a customer profile so routing never gets stuck
          await supabase.from('profiles').upsert({
            id: sess.user.id,
            phone: sess.user.phone ?? null,
            email: sess.user.email ?? null,
            full_name: null,
            role: 'customer',
            language: 'en',
            avatar_url: null,
            verified: false,
            is_demo: false,
          }, { onConflict: 'id' });
          p = await fetchProfile(sess.user.id);
        }
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

export function isDemoNumber(phone: string) {
  return phone in DEMO_NUMBERS;
}

export function demoRoleFor(phone: string): Role | null {
  return DEMO_NUMBERS[phone]?.role ?? null;
}

export function demoNameFor(phone: string): string | null {
  return DEMO_NUMBERS[phone]?.name ?? null;
}
