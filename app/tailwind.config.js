/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink:      '#0B1F33',
        ink2:     '#13314F',
        sea:      '#0E7C86',
        amber:    '#B8761C',
        rust:     '#C0392B',
        sage:     '#3F8A66',
        sand:     '#F4F1EA',
        paper:    '#FAFAF8',
        muted:    '#6B7280',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Inter', 'sans-serif'],
      },
      maxWidth: { app: '480px' },
      boxShadow: {
        card: '0 1px 2px rgba(11,31,51,0.06), 0 4px 12px rgba(11,31,51,0.08)',
      },
    },
  },
  plugins: [],
};
