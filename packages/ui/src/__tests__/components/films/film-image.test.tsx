import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FilmImage } from '../../../components/films/film-image';

// A real, minimal 1x1 transparent PNG. happy-dom decodes data: URLs
// synchronously (no network involved), giving a real `naturalWidth > 0`
// after mount — the same signal a genuinely browser-cached image gives.
const CACHED_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

describe('FilmImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('does not construct Image objects or set src outside the rendered <img> elements', () => {
    const ImageSpy = vi.spyOn(window, 'Image');

    const srcs = Array.from(
      { length: 20 },
      (_, i) => `https://example.com/film-${i}.jpeg`
    );

    const { container } = render(
      <>
        {srcs.map((src) => (
          <FilmImage key={src} src={src} alt={`film ${src}`} />
        ))}
      </>
    );

    // No probe Image() constructed anywhere, for any of the 20 cards.
    expect(ImageSpy).not.toHaveBeenCalled();

    // Exactly one real <img> per card, each with its own src, and nothing
    // else (e.g. a hidden probe image) got a src set.
    const imgs = container.querySelectorAll('img');
    expect(imgs).toHaveLength(srcs.length);
    imgs.forEach((img, i) => {
      expect(img.getAttribute('src')).toBe(srcs[i]);
    });
  });

  it('renders the real <img> as lazy with decoding=async and explicit dimensions', () => {
    const { container } = render(
      <FilmImage src="https://example.com/film.jpeg" alt="a film" size="md" />
    );

    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('decoding', 'async');
    expect(img).toHaveAttribute('width', '60');
    expect(img).toHaveAttribute('height', '60');
  });

  it('supports an eager override for above-the-fold usage (e.g. the detail panel)', () => {
    const { container } = render(
      <FilmImage
        src="https://example.com/film.jpeg"
        alt="a film"
        size="lg"
        loading="eager"
      />
    );

    const img = container.querySelector('img');
    expect(img).toHaveAttribute('loading', 'eager');
  });

  it('shows the skeleton for a not-yet-loaded image', () => {
    const { container } = render(
      <FilmImage src="https://example.com/film.jpeg" alt="a film" />
    );

    expect(container.querySelector('.shimmer-loading')).not.toBeNull();
    expect(container.querySelector('img')).toHaveClass('opacity-0');
  });

  it('skips the skeleton when the <img> already reports complete + naturalWidth (cached)', () => {
    const ImageSpy = vi.spyOn(window, 'Image');

    const { container } = render(
      <FilmImage src={CACHED_PNG} alt="a cached film" />
    );

    // The complete/naturalWidth check never constructs an Image itself.
    expect(ImageSpy).not.toHaveBeenCalled();

    expect(container.querySelector('.shimmer-loading')).toBeNull();
    const img = container.querySelector('img');
    expect(img).not.toHaveClass('opacity-0');
  });

  it('falls back to the placeholder icon on load error', () => {
    const { container } = render(
      <FilmImage src="https://example.com/broken.jpeg" alt="a film" />
    );

    const img = container.querySelector('img');
    if (!img) throw new Error('expected an <img> to be rendered');
    expect(container.querySelector('svg')).toBeNull();

    fireEvent.error(img);

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('falls back to the placeholder icon when there is no src', () => {
    const { container } = render(<FilmImage src={null} alt="no film" />);

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('clears the loading state once the <img> fires onLoad', () => {
    const { container } = render(
      <FilmImage src="https://example.com/film.jpeg" alt="a film" />
    );

    const img = container.querySelector('img');
    if (!img) throw new Error('expected an <img> to be rendered');
    expect(img).toHaveClass('opacity-0');

    fireEvent.load(img);

    expect(container.querySelector('img')).not.toHaveClass('opacity-0');
    expect(container.querySelector('.shimmer-loading')).toBeNull();
  });
});
