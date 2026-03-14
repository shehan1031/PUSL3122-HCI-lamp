import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:       'var(--bg)',
        surface:  'var(--s)',
        surface2: 'var(--s2)',
        surface3: 'var(--s3)',
        border:   'var(--b)',
        gold:     'var(--gold)',
        'gold-light': 'var(--gl)',
        'gold-dim':   'var(--gd)',
        cream:    'var(--cr)',
        success:  'var(--ok)',
        error:    'var(--er)',
      },
      fontFamily: {
        display: ['var(--font-playfair)', 'Georgia', 'serif'],
        sans:    ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-dm-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;