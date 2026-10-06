/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      boxShadow: {
        surface: '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
      },
      colors: {
        background: '#FFFFFF',
        border: '#EEEEEE',
        ink: '#000000',
        surface: '#F9F9F9',
        line: '#EEEEEE',
        chip: '#E2E2E2',
        muted: '#5E5E5E',
        subtle: '#747878',
        body: '#444748',
        fog: '#C9C6C5',
        sidebar: '#0A0A0A',
        paper: '#F4F5F8',
        card: '#FFFFFF',
        'text-muted': '#8A8A8A',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
    },
  },
  plugins: [],
};
