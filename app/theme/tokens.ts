/**
 * Chronos design tokens — mirrored between Tailwind (NativeWind) and JS.
 * Keep in sync with tailwind.config.js.
 */

export type ColorScheme = 'light' | 'dark';

export const colors = {
  primary: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },
  surface: { light: '#FFFFFF', dark: '#0B0F19' },
  surfaceAlt: { light: '#F8FAFC', dark: '#111827' },
  text: { light: '#0F172A', dark: '#F8FAFC' },
  textMuted: { light: '#64748B', dark: '#94A3B8' },
  border: { light: '#E2E8F0', dark: '#1F2937' },
  success: '#10B981',
  danger: '#EF4444',
} as const;

export const typography = {
  xs: { fontSize: 12, lineHeight: 16 },
  sm: { fontSize: 14, lineHeight: 20 },
  base: { fontSize: 16, lineHeight: 24 },
  lg: { fontSize: 18, lineHeight: 26 },
  xl: { fontSize: 20, lineHeight: 28 },
  '2xl': { fontSize: 24, lineHeight: 32 },
  '3xl': { fontSize: 30, lineHeight: 36 },
} as const;

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  6: 24,
  8: 32,
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 16,
  full: 9999,
} as const;

export function resolveSemantic(scheme: ColorScheme) {
  return {
    surface: colors.surface[scheme],
    surfaceAlt: colors.surfaceAlt[scheme],
    text: colors.text[scheme],
    textMuted: colors.textMuted[scheme],
    border: colors.border[scheme],
    primary: colors.primary[500],
    success: colors.success,
    danger: colors.danger,
  };
}
