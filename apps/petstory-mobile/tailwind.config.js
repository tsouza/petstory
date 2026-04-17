const nativewindPreset = require('nativewind/preset');
const brandPreset = require('@petstory/config/tailwind.preset.js');

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [nativewindPreset, brandPreset.default ?? brandPreset],
  content: [
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    // Include monorepo packages that ship NativeWind className strings so
    // Tailwind's JIT discovers them at build time.
    '../../packages/conversation/src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
};
