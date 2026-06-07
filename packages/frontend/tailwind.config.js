/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        board: {
          bg: '#1a2236',
          line: '#27374e',
        },
        surface: {
          DEFAULT: '#0f1829',
          2: '#192135',
        },
        accent: {
          DEFAULT: '#4361ee',
          hover: '#3350d6',
        },
      },
      backgroundColor: {
        app: '#080c17',
      },
      animation: {
        'spin-slow': 'spin 2s linear infinite',
        'pulse-fast': 'pulse 0.8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-in': 'bounceIn 0.38s cubic-bezier(0.25, 1, 0.5, 1)',
        'fade-in': 'fadeIn 0.28s cubic-bezier(0.25, 1, 0.5, 1)',
        'slide-up': 'slideUp 0.38s cubic-bezier(0.25, 1, 0.5, 1)',
      },
      keyframes: {
        bounceIn: {
          '0%': { transform: 'scale(0.82)', opacity: '0' },
          '65%': { transform: 'scale(1.04)', opacity: '1' },
          '100%': { transform: 'scale(1)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(18px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
