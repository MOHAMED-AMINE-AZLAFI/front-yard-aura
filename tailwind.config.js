import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        aura: {
          ivory: '#f8f4ec',
          porcelain: '#fffdf8',
          linen: '#e8ddcb',
          sand: '#d7c4a3',
          sage: '#7c8a68',
          moss: '#46563b',
          pine: '#173426',
          forest: '#0c2118',
          clay: '#a66f4a',
          brass: '#c5a46a',
          ink: '#162019',
          mist: '#eef1ea'
        }
      },
      fontFamily: {
        sans: ['Manrope', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Cormorant Garamond', 'Georgia', 'serif']
      },
      boxShadow: {
        soft: '0 18px 60px rgba(22, 32, 25, 0.10)',
        premium: '0 28px 80px rgba(12, 33, 24, 0.16)'
      }
    }
  },
  plugins: [typography]
};
