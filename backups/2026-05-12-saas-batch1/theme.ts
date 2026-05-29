/**
 * C-Supply Design System
 * Enterprise tokens. No glassmorphism. Use semantic names everywhere.
 */

/* ─── Brand palette ────────────────────────────────────────────────────────── */
export const Brand = {
  primary:      '#0F4C81',
  primaryDark:  '#0B3A63',
  primaryLight: '#E6EEF6',
  accent:       '#F97316',
  accentDark:   '#EA580C',
  accentLight:  '#FFF1E6',
} as const;

/* ─── Neutral scale ────────────────────────────────────────────────────────── */
export const Ink = {
  900: '#0F172A',
  800: '#1E293B',
  700: '#334155',
  600: '#475569',
  500: '#64748B',
  400: '#94A3B8',
  300: '#CBD5E1',
  200: '#E2E8F0',
  100: '#F1F5F9',
  50:  '#F8FAFC',
  0:   '#FFFFFF',
} as const;

/* ─── Semantic colors ──────────────────────────────────────────────────────── */
export const Semantic = {
  successFg:     '#15803D',
  successBg:     '#DCFCE7',
  successBorder: '#BBF7D0',
  warningFg:     '#B45309',
  warningBg:     '#FFFBEB',
  warningBorder: '#FDE68A',
  dangerFg:      '#B91C1C',
  dangerBg:      '#FEF2F2',
  dangerBorder:  '#FECACA',
  infoFg:        '#1D4ED8',
  infoBg:        '#EFF6FF',
  infoBorder:    '#BFDBFE',
  purpleFg:      '#6D28D9',
  purpleBg:      '#F5F3FF',
  star:          '#F59E0B',
} as const;

/* ─── Typography ───────────────────────────────────────────────────────────── */
export const FontFamily = {
  regular:  'Poppins_400Regular',
  medium:   'Poppins_500Medium',
  semiBold: 'Poppins_600SemiBold',
  bold:     'Poppins_700Bold',
  altReg:   'Roboto_400Regular',
  altMed:   'Roboto_500Medium',
  altBold:  'Roboto_700Bold',
};

export const FontSize = {
  xs:   11,
  sm:   12,
  base: 13,
  md:   14,
  lg:   16,
  xl:   18,
  '2xl':22,
  '3xl':28,
  '4xl':34,
} as const;

/* ─── Spacing (4-pt grid) ──────────────────────────────────────────────────── */
export const Space = {
  0: 0,  1: 4,  2: 8,  3: 12, 4: 16, 5: 20, 6: 24, 7: 32, 8: 40, 9: 48, 10: 64,
} as const;

/* ─── Radii ────────────────────────────────────────────────────────────────── */
export const Radius = {
  xs:   6,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
  full: 999,
};

/* ─── Elevation (solid shadows, no blur) ───────────────────────────────────── */
export const Shadow = {
  none: {},
  sm: { shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 4,  shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  md: { shadowColor: '#0F172A', shadowOpacity: 0.06, shadowRadius: 8,  shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  lg: { shadowColor: '#0F172A', shadowOpacity: 0.10, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  card: { shadowColor: '#0F172A', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
};

/* ─── Mobile breakpoints ──────────────────────────────────────────────────── */
export const Breakpoint = {
  xs: 360,
  sm: 480,
  md: 768,
  lg: 1024,
} as const;

/* ─── Legacy aliases (kept for backward-compat — existing screens import these) */
export const Colors = {
  primary:       Brand.primary,
  primaryDark:   Brand.primaryDark,
  orange:        Brand.accent,
  orangeDark:    Brand.accentDark,
  lightGray:     Ink[50],
  darkGray:      Ink[700],
  green:         '#22C55E',
  greenBg:       Semantic.successBg,
  red:           '#EF4444',
  white:         Ink[0],
  black:         Ink[900],
  textPrimary:   '#1E293B',
  textSecondary: Ink[600],
  textMuted:     Ink[400],
  border:        Ink[200],
  surface:       Ink[0],
  muted:         Ink[100],
  star:          '#FBBF24',
};
