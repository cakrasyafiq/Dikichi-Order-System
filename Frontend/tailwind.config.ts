import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--color-canvas)',
        surface: 'var(--color-surface)',
        brand: 'var(--color-brand-accent)',
        muted: 'var(--color-violet-near-black)',
        inverse: 'var(--color-inverse-text)',
        line: 'var(--color-border)',
        tint: 'var(--color-border-strong)',
        lime: 'var(--color-lime)',
        magenta: {
          DEFAULT: 'var(--color-magenta-mid)',
          hover: 'var(--color-magenta-hover)',
        },
      },
      borderRadius: { sm: '8px', md: '14px', lg: '20px' },
      boxShadow: {
        card: 'var(--shadow-card)',
        'mode-active': 'var(--shadow-mode-active)',
      },
      fontFamily: {
        sans: [
          '"Plus Jakarta Sans"',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'sans-serif',
        ],
        display: ['Poppins', 'sans-serif'],
      },
      maxWidth: { container: 'var(--container-max-width)' },
      padding: { page: 'var(--page-padding-x)' },
      gap: { section: 'var(--section-gap)' },
      transitionDuration: { fast: '150ms' },
      // WHY: the reference design is desktop-first with max-width breakpoints, so these keep its exact cut points.
      screens: {
        tablet: { max: '1024px' },
        mobile: { max: '768px' },
        narrow: { max: '520px' },
      },
    },
  },
} satisfies Config;
