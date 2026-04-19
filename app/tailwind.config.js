/** @type {import('tailwindcss').Config} */
const nativewindPreset = require('nativewind/preset');

module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [nativewindPreset],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary — warm amber for Chronos identity
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
        // Semantic tokens resolved at runtime via useTheme()
        surface: {
          light: '#FFFFFF',
          dark: '#0B0F19',
        },
        surfaceAlt: {
          light: '#F8FAFC',
          dark: '#111827',
        },
        text: {
          light: '#0F172A',
          dark: '#F8FAFC',
        },
        textMuted: {
          light: '#64748B',
          dark: '#94A3B8',
        },
        border: {
          light: '#E2E8F0',
          dark: '#1F2937',
        },
        success: '#10B981',
        danger: '#EF4444',
      },
      fontSize: {
        xs: ['12px', { lineHeight: '16px' }],
        sm: ['14px', { lineHeight: '20px' }],
        base: ['16px', { lineHeight: '24px' }],
        lg: ['18px', { lineHeight: '26px' }],
        xl: ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['30px', { lineHeight: '36px' }],
      },
      spacing: {
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        6: '24px',
        8: '32px',
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '16px',
        full: '9999px',
      },
    },
  },
  plugins: [],
};
