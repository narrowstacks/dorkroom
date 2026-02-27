/**
 * Generate OG image previews locally.
 * Usage: bun run scripts/preview-og.tsx
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'og-previews');

// Import the handler — fetches real data from https://dorkroom.art/api/*
const { default: handler } = await import('../api/og');

const previews = [
  { name: 'home', params: { route: '/' } },
  { name: 'border-calculator', params: { route: '/border' } },
  { name: 'resize-calculator', params: { route: '/resize' } },
  { name: 'reciprocity-calculator', params: { route: '/reciprocity' } },
  { name: 'stops-calculator', params: { route: '/stops' } },
  { name: 'exposure-calculator', params: { route: '/exposure' } },
  { name: 'lens-equivalency', params: { route: '/lenses' } },
  { name: 'development-recipes', params: { route: '/development' } },
  { name: 'film-database', params: { route: '/films' } },
  { name: 'docs', params: { route: '/docs' } },
  {
    name: 'film-detail',
    params: { route: '/films', film: 'adox-chs-100-ii' },
  },
  {
    name: 'recipe-film-only',
    params: { route: '/development', film: 'kodak-tri-x-400' },
  },
  {
    name: 'recipe-developer-only',
    params: { route: '/development', developer: 'ilford-perceptol' },
  },
  {
    name: 'recipe-film-and-developer',
    params: {
      route: '/development',
      film: 'cinestill-bwxx-double-x',
      developer: 'ilford-perceptol',
    },
  },
];

await mkdir(outDir, { recursive: true });

for (const { name, params } of previews) {
  const url = new URL('https://dorkroom.art/api/og');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  console.log(`Generating ${name}...`);
  const response = await handler(new Request(url.toString()));
  const buffer = Buffer.from(await response.arrayBuffer());
  const filePath = join(outDir, `${name}.png`);
  await writeFile(filePath, buffer);
  console.log(`  → ${filePath}`);
}

console.log('\nDone! Preview images saved to og-previews/');
