// Make NativeWind v4 resolve Tailwind CSS v3, not the monorepo's hoisted v4.
//
// Why: the web app (@dorkroom/source) pins Tailwind v4, which hoists to the
// repo-root node_modules. NativeWind v4 also hoists to the root and does
// `require("tailwindcss")`, so it finds v4 and refuses to run ("NativeWind
// only supports Tailwind CSS v3"). Tailwind v3 is installed nested at
// apps/mobile/node_modules/tailwindcss. This script symlinks that v3 into
// NativeWind's own node_modules so Node resolves it there first.
//
// Runs as both a local `postinstall` and the `eas-build-post-install` hook,
// so it fixes resolution in local dev and in the EAS Build environment alike.
// Idempotent and best-effort: it no-ops (exit 0) if anything is missing.

import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(appDir, '../..');

function tailwindVersion(dir) {
  try {
    return JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).version;
  } catch {
    return null;
  }
}

// NativeWind is hoisted to the repo root under bun's default linker, but fall
// back to an app-local copy just in case the layout differs.
const nativewindDir = [
  join(repoRoot, 'node_modules/nativewind'),
  join(appDir, 'node_modules/nativewind'),
].find((p) => existsSync(p));

const tailwindV3Dir = join(appDir, 'node_modules/tailwindcss');
const v3 = tailwindVersion(tailwindV3Dir);

if (!nativewindDir) {
  console.log('[link-nw] nativewind not installed yet — skipping');
  process.exit(0);
}
if (!v3 || !v3.startsWith('3.')) {
  console.log(`[link-nw] Tailwind v3 not found at ${tailwindV3Dir} — skipping`);
  process.exit(0);
}

const resolvedByNativewind = tailwindVersion(
  join(nativewindDir, 'node_modules/tailwindcss')
);
if (resolvedByNativewind?.startsWith('3.')) {
  console.log('[link-nw] NativeWind already resolves Tailwind v3 — ok');
  process.exit(0);
}

const linkPath = join(nativewindDir, 'node_modules/tailwindcss');
mkdirSync(dirname(linkPath), { recursive: true });
rmSync(linkPath, { recursive: true, force: true });
symlinkSync(relative(dirname(linkPath), tailwindV3Dir), linkPath, 'dir');
console.log(`[link-nw] linked ${linkPath} -> Tailwind v${v3}`);
