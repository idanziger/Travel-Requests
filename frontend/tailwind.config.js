/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Newsreader', 'Georgia', 'serif'],
        sans: ['Hanken Grotesk', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        sand: '#EFE8DB',
        canvas: '#F3ECDF',
        linen: '#FBF7F0',
        shell: '#FAF6EF',
        ink: '#2C281F',
        muted: '#7A7264',
        faint: '#9A9082',
        placeholder: '#B0A695',
        sky: {
          DEFAULT: '#2F6F99',
          hover: '#285F84',
          tint: '#E7F0F6',
        },
        gold: {
          DEFAULT: '#D99A4E',
          deep: '#B07A2E',
          tint: '#F6EAD6',
        },
      },
      borderRadius: {
        field: '10px',
        button: '11px',
        card: '16px',
        pill: '20px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(40,33,24,.04)',
        raised: '0 14px 30px -20px rgba(40,33,24,.45)',
      },
      transitionTimingFunction: {
        window: 'cubic-bezier(.42,0,.2,1)',
      },
    },
  },
  plugins: [],
}
