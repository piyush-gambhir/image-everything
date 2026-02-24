// Optional Local Font stub
//
// We intentionally avoid bundling large local font assets in the template.
// This file exports a type‑compatible stub so you can wire up local fonts
// later without changing imports across the app.
//
// Enable real local fonts:
// 1) Add your font files under `fonts/YourFont/`.
// 2) Replace the stub below with a `localFont({ src: [...] })` call.

import type localFont from 'next/font/local';

type LocalFont = ReturnType<typeof localFont>;

export const NeueMontreal = {
  className: '',
  variable: '--font-neue-montreal',
  style: {},
} as unknown as LocalFont;
