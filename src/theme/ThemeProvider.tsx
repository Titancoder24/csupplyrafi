import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { defaultThemes, type ThemeSurface, type ThemeTokens, motion, elevation, typography } from './tokens';
import { supabase } from '@/services/supabase';

type ThemeContextValue = {
  surface: ThemeSurface;
  tokens: ThemeTokens;
  setSurface: (s: ThemeSurface) => void;
  motion: typeof motion;
  elevation: typeof elevation;
  typography: typeof typography;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [surface, setSurface] = useState<ThemeSurface>('customer');
  const [overrides, setOverrides] = useState<Partial<Record<ThemeSurface, ThemeTokens>>>({});

  const tokens = useMemo<ThemeTokens>(() => {
    const base = defaultThemes[surface];
    const override = overrides[surface];
    if (!override) return base;
    return {
      ...base,
      ...override,
      color: { ...base.color, ...(override.color ?? {}) },
      font: { ...base.font, ...(override.font ?? {}) },
      radius: { ...base.radius, ...(override.radius ?? {}) },
    };
  }, [surface, overrides]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase
          .schema('cms')
          .from('theme_config')
          .select('surface, tokens, is_active')
          .eq('is_active', true);
        if (!mounted || !data) return;
        const next: Partial<Record<ThemeSurface, ThemeTokens>> = {};
        for (const row of data) {
          const s = row.surface as ThemeSurface;
          if (s in defaultThemes) next[s] = row.tokens as ThemeTokens;
        }
        setOverrides(next);
      } catch {
        // Fall back to defaults on any failure (offline first launch).
      }
    })();

    const channel = supabase
      .channel('cms-theme-config')
      .on(
        'postgres_changes',
        { event: '*', schema: 'cms', table: 'theme_config' },
        (payload) => {
          const row = (payload.new || payload.old) as { surface?: string; tokens?: ThemeTokens };
          if (!row?.surface) return;
          const s = row.surface as ThemeSurface;
          if (!(s in defaultThemes)) return;
          setOverrides((prev) => ({ ...prev, [s]: row.tokens ?? prev[s] }));
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ surface, setSurface, tokens, motion, elevation, typography }),
    [surface, tokens]
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
