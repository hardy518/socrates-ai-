/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-blue': '#4285f4',
        'brand-violet': '#9b51e0',
        'brand-gray-light': '#f8f9fa',
        'brand-text': '#1f1f1f',
        'footer-bg': '#f1f3f4',
      },
      animation: {
        'shine': 'shine 2s infinite',
        'glow': 'glow 3s ease-in-out infinite',
      },
      keyframes: {
        shine: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        glow: {
          '0%, 100%': { opacity: 0.3, transform: 'scale(1)' },
          '50%': { opacity: 0.6, transform: 'scale(1.1)' },
        }
      }
    },
  },
  plugins: [],
}

