/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink:      '#0A1A2A',
        ink2:     '#13314F',
        sea:      '#0E7C86',
        amber:    '#8C5912',
        rust:     '#8B2E1F',
        sage:     '#3F8A66',
        bone:     '#F4EFE3',
        sand:     '#EAE3D2',
        paper:    '#FAF7EE',
        muted:    '#52504A',
        rule:     'rgba(10, 26, 42, 0.14)',
        'rule-strong': 'rgba(10, 26, 42, 0.28)',
      },
      fontFamily: {
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans:    ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      maxWidth: {
        app:    '480px',
        prose:  '720px',
        canvas: '1080px',
        shell:  '1440px',
      },
      gridTemplateColumns: {
        shell:  '240px minmax(0, 1fr)',
        wide:   '280px minmax(0, 1fr)',
      },
      boxShadow: {
        card:  '0 1px 0 rgba(10,26,42,0.04), 0 0 0 1px rgba(10,26,42,0.06)',
        ring:  '0 0 0 1px rgba(10,26,42,0.12)',
        plate: '0 24px 48px -32px rgba(10,26,42,0.30)',
      },
      letterSpacing: {
        eyebrow: '0.18em',
      },
    },
  },
  plugins: [],
};
