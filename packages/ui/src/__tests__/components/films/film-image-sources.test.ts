import { describe, expect, it } from 'vitest';
import {
  FILM_IMAGE_WIDTHS,
  type FilmImageLoader,
  pickFilmImageWidth,
  resolveFilmImageSources,
} from '../../../components/films/film-image-sources';

const loader: FilmImageLoader = (src, width) => `/opt?url=${src}&w=${width}`;

describe('pickFilmImageWidth', () => {
  it('picks the smallest allowed width that covers the size', () => {
    expect(pickFilmImageWidth(40)).toBe(64);
    expect(pickFilmImageWidth(60)).toBe(64);
    expect(pickFilmImageWidth(64)).toBe(64);
    expect(pickFilmImageWidth(120)).toBe(128);
    expect(pickFilmImageWidth(224)).toBe(256);
  });

  it('caps at the largest allowed width', () => {
    expect(pickFilmImageWidth(4000)).toBe(
      FILM_IMAGE_WIDTHS[FILM_IMAGE_WIDTHS.length - 1]
    );
  });
});

describe('resolveFilmImageSources', () => {
  it('uses the original URL without a loader', () => {
    expect(resolveFilmImageSources('a.jpeg', 60, null)).toEqual({
      src: 'a.jpeg',
    });
  });

  it('uses the original URL when the loader declines the src', () => {
    expect(resolveFilmImageSources('a.jpeg', 60, () => null)).toEqual({
      src: 'a.jpeg',
    });
  });

  it('requests a 1x and a 2x width for a 60px card thumbnail', () => {
    expect(resolveFilmImageSources('a.jpeg', 60, loader)).toEqual({
      src: '/opt?url=a.jpeg&w=64',
      srcSet: '/opt?url=a.jpeg&w=64 1x, /opt?url=a.jpeg&w=128 2x',
    });
  });

  it('requests 256/512 for the 224px expanded detail photo', () => {
    expect(resolveFilmImageSources('a.jpeg', 224, loader).srcSet).toBe(
      '/opt?url=a.jpeg&w=256 1x, /opt?url=a.jpeg&w=512 2x'
    );
  });

  it('drops the 2x candidate when it would repeat the 1x width', () => {
    expect(resolveFilmImageSources('a.jpeg', 600, loader)).toEqual({
      src: '/opt?url=a.jpeg&w=512',
    });
  });
});
