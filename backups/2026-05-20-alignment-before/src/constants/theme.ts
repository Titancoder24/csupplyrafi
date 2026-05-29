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
/**
 * Inter is the primary product font — used everywhere except the customer
 * booking flow which intentionally stays warmer (Poppins). Inter is the
 * default for FontFamily; Poppins is exposed as `FontFamilyPoppins` for the
 * screens that still want it (welcome / onboarding / book / customer home).
 */
export const FontFamily = {
  regular:  'Inter_400Regular',
  medium:   'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold:     'Inter_700Bold',
  altReg:   'Roboto_400Regular',
  altMed:   'Roboto_500Medium',
  altBold:  'Roboto_700Bold',
};

/** Legacy Poppins weights — keep onboarding/booking warm. */
export const FontFamilyPoppins = {
  regular:  'Poppins_400Regular',
  medium:   'Poppins_500Medium',
  semiBold: 'Poppins_600SemiBold',
  bold:     'Poppins_700Bold',
};

export const FontSize = {
  xs:    11,
  sm:    12,
  base:  13,
  md:    14,
  lg:    16,
  xl:    18,
  '2xl': 22,
  '3xl': 28,
  '4xl': 34,
} as const;

/** Type scale aligned with Linear / Stripe / Supabase Studio. */
export const Type = {
  // Headings
  pageTitle:    { fontFamily: 'Inter_700Bold',     fontSize: 32, lineHeight: 36, letterSpacing: -0.6 },
  sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14, lineHeight: 18, letterSpacing: -0.1 },
  cardTitle:    { fontFamily: 'Inter_600SemiBold', fontSize: 13.5, lineHeight: 18 },
  // Body
  body:         { fontFamily: 'Inter_400Regular',  fontSize: 13, lineHeight: 18 },
  bodyStrong:   { fontFamily: 'Inter_500Medium',   fontSize: 13, lineHeight: 18 },
  // Small / meta
  caption:      { fontFamily: 'Inter_400Regular',  fontSize: 12, lineHeight: 16, color: '#64748B' },
  label:        { fontFamily: 'Inter_500Medium',   fontSize: 13, lineHeight: 18 },
  // Section group labels (sidebar group headers, table column headers)
  group:        { fontFamily: 'Inter_500Medium',   fontSize: 11, lineHeight: 14, letterSpacing: 1, textTransform: 'uppercase' as const },
  // Metrics — large, bold, tight
  metric:       { fontFamily: 'Inter_700Bold',     fontSize: 28, lineHeight: 32, letterSpacing: -0.8 },
  metricSmall:  { fontFamily: 'Inter_600SemiBold', fontSize: 18, lineHeight: 22, letterSpacing: -0.3 },
  // Buttons
  button:       { fontFamily: 'Inter_600SemiBold', fontSize: 13, lineHeight: 16, letterSpacing: 0.1 },
  // Pills / badges
  pill:         { fontFamily: 'Inter_600SemiBold', fontSize: 11, lineHeight: 14, letterSpacing: 0.4 },
} as const;

/** Icon system — fixed sizes + stroke width for cross-component consistency. */
export const Icon = {
  size:        18,  // default icon size
  sizeSmall:   14,  // inline / chip icons
  sizeLarge:   20,  // section / page icons
  stroke:      1.75,
  strokeBold:  2,
} as const;

/* ─── Spacing (4-pt grid) ──────────────────────────────────────────────────── */
export const Space = {
  0: 0,  1: 4,  2: 8,  3: 12, 4: 16, 5: 20, 6: 24, 7: 32, 8: 40, 9: 48, 10: 64,
} as const;

/* ─── Radii — tightened to Linear/Stripe densities ─────────────────────────── */
export const Radius = {
  xs:   4,
  sm:   6,
  md:   8,
  lg:   12,
  xl:   16,
  xxl:  20,
  full: 999,
};

/* ─── Elevation — subtle, single-direction shadows only ────────────────────── */
export const Shadow = {
  none: {},
  sm:   { shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  md:   { shadowColor: '#0F172A', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  lg:   { shadowColor: '#0F172A', shadowOpacity: 0.10, shadowRadius: 12,shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  card: { shadowColor: '#0F172A', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
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
