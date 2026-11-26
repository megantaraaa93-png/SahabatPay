/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // === SahabatPay Brand Palette ===
        brand: {
          forest:  '#123D35',   // Primary identity, nav active, brand elements
          emerald: '#176B55',   // Success, positive actions
          cream:   '#F4F1E8',   // Alt background
          coral:   '#E85D4A',   // CTA accent, important notifications
          charcoal:'#252B2A',   // Deep text
          muted:   '#78827D',   // Secondary text
          border:  '#E5E8E2',   // Borders & dividers
        },
        // Legacy aliases kept for backward compat (components still use these)
        primary: {
          DEFAULT: '#123D35',
          light:   '#176B55',
          dark:    '#0D2E28',
        },
        secondary: {
          DEFAULT: '#176B55',
          light:   '#1E8A6E',
          dark:    '#0F5242',
        },
        background: '#F4F1E8',
        surface:    '#FFFFFF',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem' }],
      },
      opacity: {
        8: '0.08',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
        '4xl': '1.5rem',
      },
      boxShadow: {
        'card':   '0 1px 3px 0 rgba(18,61,53,0.08), 0 1px 2px -1px rgba(18,61,53,0.06)',
        'card-md':'0 4px 12px 0 rgba(18,61,53,0.10), 0 2px 4px -2px rgba(18,61,53,0.06)',
        'card-lg':'0 8px 24px 0 rgba(18,61,53,0.12), 0 4px 8px -4px rgba(18,61,53,0.08)',
        'balance':'0 8px 32px 0 rgba(18,61,53,0.25)',
      },
      animation: {
        'fade-in':    'fadeIn 0.2s ease-out',
        'slide-up':   'slideUp 0.25s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:    { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideUp:   { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        pulseSoft: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.6 } },
      },
    },
  },
  plugins: [],
};
