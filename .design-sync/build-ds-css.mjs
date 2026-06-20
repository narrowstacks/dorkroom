// design-sync: compile the app's Tailwind CSS 4 stylesheet into a single
// fully-resolved CSS file that the converter appends to _ds_bundle.css.
//
// @dorkroom/ui ships NO compiled CSS — components style themselves with
// Tailwind utility classes plus theme tokens defined in the app's
// `@theme`/`[data-theme]` blocks. The converter's cssEntry is appended
// VERBATIM (no Tailwind run), so it needs a pre-compiled stylesheet. The app
// entry `apps/dorkroom/src/styles.css` `@source`s the whole monorepo, so the
// output includes every utility every UI component uses, plus the tokens.
//
// cssEntry must resolve inside PKG_DIR (packages/ui), hence the dist/ target.
// Run from the repo root: `node .design-sync/build-ds-css.mjs`.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';

const repoRoot = resolve(dirname(new URL(import.meta.url).pathname), '..');
const input = resolve(repoRoot, 'apps/dorkroom/src/styles.css');
const output = resolve(repoRoot, 'packages/ui/dist/ds.css');

const css = readFileSync(input, 'utf8');
const result = await postcss([tailwind()]).process(css, { from: input, to: output });
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, result.css);
console.error(`build-ds-css: wrote ${output} (${(result.css.length / 1024).toFixed(0)} KB)`);
