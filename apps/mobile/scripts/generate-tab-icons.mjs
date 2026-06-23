// Rasterizes Lucide SVGs into white template PNGs for the native tab bar.
// Keep ICON_NAMES in sync with src/lib/tools.ts (+ the 'more' tab).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, '..', 'assets', 'tab-icons');
const LUCIDE = join(
  here,
  '..',
  '..',
  '..',
  'node_modules',
  'lucide-static',
  'icons'
);

// id -> lucide kebab name (mirror src/lib/tools.ts + 'more')
const ICON_NAMES = {
  border: 'crop',
  resize: 'ruler',
  exposure: 'gauge',
  mat: 'frame',
  reciprocity: 'timer',
  lens: 'focus',
  'camera-exposure': 'aperture',
  meter: 'sun-medium',
  settings: 'settings',
  more: 'menu',
};

const SIZES = [
  { suffix: '', px: 25 },
  { suffix: '@2x', px: 50 },
  { suffix: '@3x', px: 75 },
];

mkdirSync(OUT, { recursive: true });

for (const [id, name] of Object.entries(ICON_NAMES)) {
  const svgRaw = readFileSync(join(LUCIDE, `${name}.svg`), 'utf8');
  // Lucide strokes use currentColor; force white so iOS template-tints it.
  const svg = svgRaw.replaceAll('currentColor', '#ffffff');
  for (const { suffix, px } of SIZES) {
    const png = await sharp(Buffer.from(svg)).resize(px, px).png().toBuffer();
    writeFileSync(join(OUT, `${id}${suffix}.png`), png);
  }
  console.log(`generated ${id} (${name})`);
}
