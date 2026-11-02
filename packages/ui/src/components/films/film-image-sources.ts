/**
 * Widths (in device pixels) a film image may be requested at from an image
 * optimizer. Kept deliberately small: every distinct width is a separate
 * transformation (and cache entry) per source image, which is what image
 * optimization bills for. An app that serves resized images must allow exactly
 * these widths (on Vercel, `images.sizes` in `vercel.json`).
 */
export const FILM_IMAGE_WIDTHS = [64, 128, 256, 512] as const;

export type FilmImageWidth = (typeof FILM_IMAGE_WIDTHS)[number];

/**
 * Builds the URL of `src` resized to `width` device pixels, or returns `null`
 * when `src` can't be optimized (an unknown host, say) and the original should
 * be used as is.
 */
export type FilmImageLoader = (
  src: string,
  width: FilmImageWidth
) => string | null;

export interface FilmImageSources {
  src: string;
  srcSet?: string;
}

/** Smallest allowed width covering `pixels`, capped at the largest one. */
export function pickFilmImageWidth(pixels: number): FilmImageWidth {
  return (
    FILM_IMAGE_WIDTHS.find((width) => width >= pixels) ??
    FILM_IMAGE_WIDTHS[FILM_IMAGE_WIDTHS.length - 1]
  );
}

/**
 * Picks the `src`/`srcSet` for an image displayed at `renderedSize` CSS
 * pixels: a 1x and a 2x candidate from {@link FILM_IMAGE_WIDTHS}. Without a
 * loader, or when the loader declines this `src`, the original URL is used.
 */
export function resolveFilmImageSources(
  src: string,
  renderedSize: number,
  loader: FilmImageLoader | null
): FilmImageSources {
  if (!loader) return { src };

  const width1x = pickFilmImageWidth(renderedSize);
  const width2x = pickFilmImageWidth(renderedSize * 2);
  const url1x = loader(src, width1x);
  if (!url1x) return { src };

  const url2x = width2x === width1x ? null : loader(src, width2x);
  return {
    src: url1x,
    srcSet: url2x ? `${url1x} 1x, ${url2x} 2x` : undefined,
  };
}
