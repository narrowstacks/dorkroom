import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

/*
 * `@dorkroom/logic/calculators` runs in the serverless functions, the OG
 * card on the edge runtime included. Walk its static import graph and fail if
 * it reaches a hook, React, TanStack, or a browser-only service.
 */

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = join(SRC, 'calculators.ts');
const IMPORT_RE = /(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]/g;
/** Bare packages the entry may reach: zod (link validation) and nothing else. */
const ALLOWED_PACKAGES = new Set(['zod']);

function resolveLocal(fromFile: string, specifier: string): string {
  const base = resolve(dirname(fromFile), specifier);
  for (const candidate of [`${base}.ts`, join(base, 'index.ts')]) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(`Cannot resolve ${specifier} from ${fromFile}`);
}

/** Every source file the entry reaches, and every bare package it imports. */
interface ImportGraph {
  files: Set<string>;
  packages: Set<string>;
}

function walkImports(): ImportGraph {
  const files = new Set<string>();
  const packages = new Set<string>();
  const queue = [ENTRY];
  while (queue.length > 0) {
    const file = queue.pop();
    if (file === undefined || files.has(file)) continue;
    files.add(file);
    for (const [, specifier] of readFileSync(file, 'utf8').matchAll(
      IMPORT_RE
    )) {
      if (specifier.startsWith('.')) {
        queue.push(resolveLocal(file, specifier));
      } else {
        packages.add(specifier);
      }
    }
  }
  return { files, packages };
}

describe('@dorkroom/logic/calculators entry', () => {
  const { files, packages } = walkImports();

  it('reaches no hook or service module', () => {
    const offending = [...files]
      .map((file) => relative(SRC, file))
      .filter(
        (file) => file.startsWith('hooks/') || file.startsWith('services/')
      );
    expect(offending).toEqual([]);
  });

  it('reaches no package other than zod', () => {
    expect([...packages].filter((name) => !ALLOWED_PACKAGES.has(name))).toEqual(
      []
    );
  });

  it('is published in the exports map and for TypeScript node10 resolution', () => {
    const packageJson = z
      .object({
        exports: z.record(
          z.string(),
          z.union([z.string(), z.record(z.string(), z.string())])
        ),
        typesVersions: z.record(
          z.string(),
          z.record(z.string(), z.array(z.string()))
        ),
      })
      .parse(JSON.parse(readFileSync(join(SRC, '..', 'package.json'), 'utf8')));
    expect(packageJson.exports['./calculators']).toEqual({
      types: './dist/calculators.d.ts',
      import: './dist/calculators.js',
      default: './dist/calculators.js',
    });
    expect(packageJson.typesVersions['*'].calculators).toEqual([
      './dist/calculators.d.ts',
    ]);
  });
});
