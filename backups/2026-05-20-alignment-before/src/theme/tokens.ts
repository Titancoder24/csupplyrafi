// Design tokens — single source of truth, mirrored to Tailwind & nativewind
export type ThemeSurface = 'customer' | 'vendor' | 'transporter' | 'admin';

export type ThemeTokens = {
  color: {
    primary: string;
    primaryDark: string;
    accent: string;
    accentDark: string;
    surface: string;
    background: string;
    muted: string;
    border: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    success: string;
    successBg: string;
    warning: string;
    warningBg: string;
    danger: string;
    dangerBg: string;
    info: string;
    infoBg: string;
    star: string;
  };
  font: { family: string; scale: number };
  radius: { sm: number; md: number; lg: number; xl: number; pill: number };
  spacing: number;
};

export const baseRadius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 };

// Defaults shipped with app — overridden at runtime by cms.theme_config.
export const defaultThemes: Record<ThemeSurface, ThemeTokens> = {
  customer: {
    color: {
      primary: '#0F4C81',
      primaryDark: '#0B3A63',
      accent: '#F97316',
      accentDark: '#EA580C',
      surface: '#FFFFFF',
      background: '#F8FAFC',
      muted: '#F1F5F9',
      border: '#E2E8F0',
      textPrimary: '#0F1A14',
      textSecondary: '#475569',
      textMuted: '#64748B',
      success: '#16A34A',
      successBg: '#DCFCE7',
      warning: '#F59E0B',
      warningBg: '#FEF3C7',
      danger: '#EF4444',
      dangerBg: '#FEE2E2',
      info: '#3B82F6',
      infoBg: '#DBEAFE',
      star: '#FBBF24',
    },
    font: { family: 'Inter', scale: 1.0 },
    radius: baseRadius,
    spacing: 4,
  },
  vendor: {
    color: {
      primary: '#1F7A3C',
      primaryDark: '#16653A',
      accent: '#1F7A3C',
      accentDark: '#16653A',
      surface: '#FFFFFF',
      background: '#F7F9F8',
      muted: '#F0F2F0',
      border: '#E2E6E3',
      textPrimary: '#0F1A14',
      textSecondary: '#5C6A63',
      textMuted: '#9AA39E',
      success: '#1F7A3C',
      successBg: '#E8F5EC',
      warning: '#F59E0B',
      warningBg: '#FEF3C7',
      danger: '#E5484D',
      dangerBg: '#FDECEC',
      info: '#3B82F6',
      infoBg: '#DBEAFE',
      star: '#FBBF24',
    },
    font: { family: 'Inter', scale: 1.0 },
    radius: baseRadius,
    spacing: 4,
  },
  transporter: {
    color: {
      primary: '#1F7A3C',
      primaryDark: '#16653A',
      accent: '#1F7A3C',
      accentDark: '#16653A',
      surface: '#FFFFFF',
      background: '#F7F9F8',
      muted: '#F0F2F0',
      border: '#E2E6E3',
      textPrimary: '#0F1A14',
      textSecondary: '#5C6A63',
      textMuted: '#9AA39E',
      success: '#1F7A3C',
      successBg: '#E8F5EC',
      warning: '#F59E0B',
      warningBg: '#FEF3C7',
      danger: '#E5484D',
      dangerBg: '#FDECEC',
      info: '#3B82F6',
      infoBg: '#DBEAFE',
      star: '#FBBF24',
    },
    font: { family: 'Inter', scale: 1.0 },
    radius: baseRadius,
    spacing: 4,
  },
  admin: {
    color: {
      primary: '#1E293B',
      primaryDark: '#0F172A',
      accent: '#0EA5E9',
      accentDark: '#0284C7',
      surface: '#FFFFFF',
      background: '#F8FAFC',
      muted: '#F1F5F9',
      border: '#E2E8F0',
      textPrimary: '#0F172A',
      textSecondary: '#475569',
      textMuted: '#64748B',
      success: '#16A34A',
      successBg: '#DCFCE7',
      warning: '#F59E0B',
      warningBg: '#FEF3C7',
      danger: '#EF4444',
      dangerBg: '#FEE2E2',
      info: '#3B82F6',
      infoBg: '#DBEAFE',
      star: '#FBBF24',
    },
    font: { family: 'Inter', scale: 1.0 },
    radius: baseRadius,
    spacing: 4,
  },
};

export const motion = {
  fast: 80,
  normal: 200,
  slow: 320,
  slower: 480,
};

export const elevation = {
  sm: {
    shadowColor: '#0F1A14',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  md: {
    shadowColor: '#0F1A14',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  lg: {
    shadowColor: '#0F1A14',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
};

export const typography = {
  display: { fontSize: 32, lineHeight: 40, fontWeight: '700' as const },
  h1: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const },
  h2: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const },
  h3: { fontSize: 16, lineHeight: 22, fontWeight: '600' as const },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
  bodyMedium: { fontSize: 15, lineHeight: 22, fontWeight: '500' as const },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
  button: { fontSize: 16, lineHeight: 20, fontWeight: '600' as const },
  priceLg: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const },
  priceMd: { fontSize: 18, lineHeight: 24, fontWeight: '700' as const },
  priceSm: { fontSize: 14, lineHeight: 20, fontWeight: '600' as const },
};
