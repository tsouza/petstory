// Shared Tailwind preset for NativeWind v4 — consumed by every workspace that
// ships styled components (apps + `@petstory/ui` + `@petstory/conversation`).
// Tokens mirror docs/brand.md exactly; do not invent values.
//
// Usage (in an app or package):
//   import preset from '@petstory/config/tailwind.preset.js';
//   export default { presets: [preset], content: [...], ... };

/** @type {import('tailwindcss').Config} */
const preset = {
  theme: {
    extend: {
      colors: {
        teal: {
          100: '#B4EDE8',
          400: '#2EC4B6',
          600: '#148a9c', // PRIMARY brand teal
          800: '#0D5C6A',
        },
        ink: {
          300: '#8A9BB0',
          500: '#3D5A73',
          700: '#1B4965',
          900: '#0D1B2A',
        },
        danger: '#E76F51',
        gold: '#F2C94C',
        success: '#2EC4B6', // alias of teal-400
        // App cool-mode backgrounds (per docs/brand.md — apps are cool, not warm).
        'app-bg': '#F7F9FB',
        'app-bg-card': '#FFFFFF',
        'app-bg-elevated': '#EEF3F8',
        // App dark mode.
        'app-bg-dark': '#0B1622',
        'app-bg-card-dark': '#121E2D',
        'app-bg-elevated-dark': '#182838',
        // Marketing warm palette.
        'marketing-bg': '#f6f1e7',
        'marketing-bg-alt': '#ece5d4',
      },
      fontFamily: {
        heading: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
};

export default preset;
