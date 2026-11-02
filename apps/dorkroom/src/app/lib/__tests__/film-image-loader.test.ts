import { describe, expect, it } from 'vitest';
import {
  FILM_IMAGE_QUALITY,
  FILM_IMAGE_SOURCE_PREFIX,
  vercelFilmImageLoader,
} from '../film-image-loader';

const sample = `${FILM_IMAGE_SOURCE_PREFIX}harman-phoenix-ii-200.jpeg`;

describe('vercelFilmImageLoader', () => {
  it('builds a /_vercel/image URL for a Supabase film photo', () => {
    const url = new URL(
      vercelFilmImageLoader(sample, 128) ?? '',
      'https://dorkroom.art'
    );
    expect(url.pathname).toBe('/_vercel/image');
    expect(url.searchParams.get('url')).toBe(sample);
    expect(url.searchParams.get('w')).toBe('128');
    expect(url.searchParams.get('q')).toBe(String(FILM_IMAGE_QUALITY));
  });

  it('declines URLs outside the film photo bucket', () => {
    expect(
      vercelFilmImageLoader('https://silberra.com/thumbs/films/x.jpg', 64)
    ).toBeNull();
  });
});
