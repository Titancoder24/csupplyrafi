/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Customer (deep blue + orange)
        primary: {
          DEFAULT: '#0F4C81',
          50: '#EFF6FB',
          100: '#D9E8F4',
          200: '#B0D0E8',
          300: '#7FB1D7',
          400: '#4F90C5',
          500: '#0F4C81',
          600: '#0B3A63',
          700: '#082B49',
        },
        accent: {
          DEFAULT: '#F97316',
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          400: '#FB923C',
          500: '#F97316',
          600: '#EA580C',
          700: '#C2410C',
        },
        // Vendor / Transporter (greens)
        brand: {
          DEFAULT: '#1F7A3C',
          50: '#E8F5EC',
          100: '#D1EBD9',
          200: '#A6D7B4',
          400: '#2E8B4A',
          500: '#1F7A3C',
          600: '#16653A',
          700: '#0F4F2D',
        },
        ink: {
          DEFAULT: '#0F1A14',
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },
        success: {
          DEFAULT: '#16A34A',
          50: '#DCFCE7',
          600: '#15803D',
        },
        warning: {
          DEFAULT: '#F59E0B',
          50: '#FEF3C7',
          600: '#B45309',
        },
        danger: {
          DEFAULT: '#EF4444',
          50: '#FEE2E2',
          600: '#B91C1C',
        },
        info: {
          DEFAULT: '#3B82F6',
          50: '#DBEAFE',
          600: '#1E40AF',
        },
      },
      fontFamily: {
        sans: ['Inter_400Regular', 'system-ui', '-apple-system', 'sans-serif'],
        medium: ['Inter_500Medium'],
        semibold: ['Inter_600SemiBold'],
        bold: ['Inter_700Bold'],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        pill: '999px',
      },
    },
  },
  plugins: [],
};
