import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#0a0a0a',
        'surface-1': '#141414',
        'surface-2': '#1e1e1e',
        'surface-3': '#282828',
        hairline: 'rgba(255,255,255,0.08)',
        ink: '#ffffff',
        'ink-muted': '#999999',
        'ink-subtle': '#666666',
        accent: '#0099ff',
        success: '#00c853',
        warning: '#ffab00',
        danger: '#ff3d3d',
        'status-not-started': '#666666',
        'status-in-progress': '#0099ff',
        'status-on-hold': '#ffab00',
        'status-done': '#00c853',
        'gradient-magenta': '#ff0080',
        'gradient-violet': '#7c3aed',
        'gradient-orange': '#ff6b00',
        'gradient-coral': '#ff4757',
      },
      spacing: {
        '1': '1px',
        '4': '4px',
        '8': '8px',
        '12': '12px',
        '15': '15px',
        '20': '20px',
        '30': '30px',
        '40': '40px',
        '96': '96px',
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '10px',
        lg: '15px',
        xl: '20px',
        '2xl': '30px',
        pill: '100px',
        full: '9999px',
      },
      fontFamily: {
        sans: [
          '"Inter Variable"',
          '"Inter"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
      letterSpacing: {
        display: '-0.035em',
        heading: '-0.025em',
        body: '-0.15px',
      },
      animation: {
        'slide-in-right': 'slideInRight 250ms ease-out',
        'slide-out-right': 'slideOutRight 250ms ease-out',
        'slide-up': 'slideUp 250ms ease-out',
        'fade-in': 'fadeIn 200ms ease-out',
        'fade-out': 'fadeOut 200ms ease-out',
        'toast-in': 'toastIn 300ms ease-out',
        'toast-out': 'toastOut 300ms ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'skeleton': 'skeleton 1.8s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideOutRight: {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(100%)', opacity: '0' },
        },
        slideUp: {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        toastIn: {
          '0%': { transform: 'translateX(100%) scale(0.95)', opacity: '0' },
          '100%': { transform: 'translateX(0) scale(1)', opacity: '1' },
        },
        toastOut: {
          '0%': { transform: 'translateX(0) scale(1)', opacity: '1' },
          '100%': { transform: 'translateX(100%) scale(0.95)', opacity: '0' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        skeleton: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};

export default config;
