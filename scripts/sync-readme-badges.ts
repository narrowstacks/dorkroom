/**
 * Sync hardcoded shields.io version badges in README.md with installed
 * dependency versions. Usage: bun run scripts/sync-readme-badges.ts
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface BadgeValues {
  version: string;
  react: string;
  tailwind: string;
  typescript: string;
}

interface PackageJson {
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

const stripRange = (v: string): string => v.replace(/^[\^~]/, '');

/**
 * The build compiler is pinned as `typescript-7: npm:typescript@rc`, so
 * package.json only records the `rc` dist-tag — the concrete resolved version
 * lives in bun.lock. Pull it from there so the badge tracks the real version.
 */
export function parseTypescriptVersion(lock: string): string {
  const match = lock.match(/"typescript-7":\s*\[\s*"typescript@([^"]+)"/);
  if (!match) {
    throw new Error(
      'Could not find resolved "typescript-7" version in bun.lock'
    );
  }
  return match[1];
}

export function deriveBadgeValues(
  pkg: PackageJson,
  tsVersion: string
): BadgeValues {
  const react = stripRange(pkg.dependencies?.react ?? '');
  const tailwind = stripRange(pkg.devDependencies?.tailwindcss ?? '');
  // '7.0.1-rc' -> base '7.0.1', prerelease 'rc' -> major.minor '7.0' -> '7.0_rc'
  const [tsBase, tsPre = ''] = tsVersion.split('-');
  const [tsMajor, tsMinor] = tsBase.split('.');
  const tsTag = tsPre.match(/^[a-z]+/i)?.[0];
  if (!react) throw new Error('Missing dependencies.react in package.json');
  if (!tailwind)
    throw new Error('Missing devDependencies.tailwindcss in package.json');
  if (!tsMajor || !tsMinor) {
    throw new Error(`Unexpected typescript version: "${tsVersion}"`);
  }
  return {
    version: pkg.version,
    react: react.split('.')[0],
    tailwind,
    typescript: tsTag
      ? `${tsMajor}.${tsMinor}_${tsTag}`
      : `${tsMajor}.${tsMinor}`,
  };
}

export function applyBadgeUpdates(readme: string, v: BadgeValues): string {
  // Each badge value segment is `[^-]+` between the label and the trailing
  // color, so it stops at the color separator and never spans badges.
  const replacements: Array<[RegExp, string]> = [
    [/badge\/Version-[^-]+-red/g, `badge/Version-${v.version}-red`],
    [/badge\/React-[^-]+-61DAFB/g, `badge/React-${v.react}-61DAFB`],
    [
      /badge\/TypeScript-[^-]+-3178C6/g,
      `badge/TypeScript-${v.typescript}-3178C6`,
    ],
    [/badge\/Tailwind-[^-]+-06B6D4/g, `badge/Tailwind-${v.tailwind}-06B6D4`],
  ];
  return replacements.reduce((acc, [re, to]) => acc.replace(re, to), readme);
}

async function main(): Promise<void> {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const pkg = JSON.parse(
    await readFile(join(root, 'package.json'), 'utf8')
  ) as PackageJson;
  const tsVersion = parseTypescriptVersion(
    await readFile(join(root, 'bun.lock'), 'utf8')
  );
  const readmePath = join(root, 'README.md');
  const readme = await readFile(readmePath, 'utf8');
  const updated = applyBadgeUpdates(readme, deriveBadgeValues(pkg, tsVersion));
  if (updated !== readme) {
    await writeFile(readmePath, updated);
    console.log('README badges updated.');
  } else {
    console.log('README badges already in sync.');
  }
}

// Bun sets import.meta.main for the entry module; under Vitest (node) it is
// undefined, so importing this file in tests does not run main().
if (import.meta.main) {
  await main();
}
