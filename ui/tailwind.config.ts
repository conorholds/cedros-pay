import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './stories/**/*.{ts,tsx}',
    './.storybook/**/*.{ts,tsx,css}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
