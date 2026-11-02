import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  FILM_IMAGE_QUALITY,
  FILM_IMAGE_SOURCE_PREFIX,
} from '../../apps/dorkroom/src/app/lib/film-image-loader';
import { FILM_IMAGE_WIDTHS } from '../../packages/ui/src/components/films/film-image-sources';

/**
 * Keeps `vercel.json` `images` in step with the URLs the films page builds.
 *
 * `/_vercel/image` rejects any `w`, `q`, or source URL the config doesn't
 * allow, and `FilmImage` then quietly falls back to the full-size original, so
 * drift wouldn't break anything visibly: it would just bring back #353. It
 * lives here rather than in the app so a `vercel.json`-only edit still busts
 * turbo's cache.
 */

interface RemotePattern {
  protocol?: string;
  hostname: string;
  pathname?: string;
}

interface VercelImagesConfig {
  sizes: number[];
  qualities?: number[];
  remotePatterns?: RemotePattern[];
}

const REPO_ROOT = join(import.meta.dirname, '..', '..');

// SAFETY: vercel.json is checked-in config; the assertions below fail loudly
// if `images` is missing or shaped differently.
const { images } = JSON.parse(
  readFileSync(join(REPO_ROOT, 'vercel.json'), 'utf8')
) as { images?: VercelImagesConfig };

describe('vercel.json images config', () => {
  it('allows exactly the widths FilmImage requests', () => {
    expect(images?.sizes).toEqual([...FILM_IMAGE_WIDTHS]);
  });

  it('allows the quality the loader requests', () => {
    expect(images?.qualities).toContain(FILM_IMAGE_QUALITY);
  });

  it('allows the film photo bucket as a remote source', () => {
    const source = new URL(`${FILM_IMAGE_SOURCE_PREFIX}film.jpeg`);
    const allowed = (images?.remotePatterns ?? []).some(
      (pattern) =>
        `${pattern.protocol ?? 'https'}:` === source.protocol &&
        new RegExp(pattern.hostname).test(source.hostname) &&
        new RegExp(pattern.pathname ?? '.*').test(source.pathname)
    );
    expect(allowed).toBe(true);
  });
});
