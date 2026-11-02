import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FilmImage } from '../../../components/films/film-image';
import { FilmImageLoaderContext } from '../../../components/films/film-image-loader-context';
import type { FilmImageLoader } from '../../../components/films/film-image-sources';
import { FilmImagesEnabledContext } from '../../../components/films/film-images-enabled-context';

describe('FilmImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('does not construct Image objects or set src outside the rendered <img> elements', () => {
    // happy-dom's native Image constructor throws "Illegal constructor" when
    // invoked through vi.spyOn's default call-through wrapper, so give it a
    // safe stand-in implementation instead of calling through.
    const ImageSpy = vi
      .spyOn(window, 'Image')
      .mockImplementation(() => document.createElement('img'));

    const srcs = Array.from(
      { length: 20 },
      (_, i) => `https://example.com/film-${i}.jpeg`
    );

    const { container } = render(
      <div>
        {srcs.map((src) => (
          <FilmImage key={src} src={src} alt={`film ${src}`} />
        ))}
      </div>
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

  describe('cached-image detection (complete + naturalWidth on the real <img>)', () => {
    // Stub the properties a genuinely browser-cached image reports, on the
    // HTMLImageElement prototype, rather than relying on happy-dom to
    // actually fetch anything (it won't, for a plain http(s) src).
    function stubImageCompleteness(complete: boolean, naturalWidth: number) {
      Object.defineProperty(HTMLImageElement.prototype, 'complete', {
        configurable: true,
        get: () => complete,
      });
      Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', {
        configurable: true,
        get: () => naturalWidth,
      });
    }

    afterEach(() => {
      // Remove the stubbed own-property getters so the prototype falls back
      // to happy-dom's real `complete`/`naturalWidth` accessors again.
      Reflect.deleteProperty(HTMLImageElement.prototype, 'complete');
      Reflect.deleteProperty(HTMLImageElement.prototype, 'naturalWidth');
    });

    it('skips the skeleton when the <img> reports complete=true and naturalWidth>0 (cached)', () => {
      stubImageCompleteness(true, 1);

      const ImageSpy = vi
        .spyOn(window, 'Image')
        .mockImplementation(() => document.createElement('img'));

      const { container } = render(
        <FilmImage src="https://example.com/cached.jpeg" alt="a cached film" />
      );

      // The complete/naturalWidth check never constructs an Image itself.
      expect(ImageSpy).not.toHaveBeenCalled();

      expect(container.querySelector('.shimmer-loading')).toBeNull();
      const img = container.querySelector('img');
      expect(img).not.toHaveClass('opacity-0');
    });

    it('keeps the skeleton when complete=true but naturalWidth=0 (not actually loaded)', () => {
      stubImageCompleteness(true, 0);

      const { container } = render(
        <FilmImage
          src="https://example.com/not-cached.jpeg"
          alt="an uncached film"
        />
      );

      expect(container.querySelector('.shimmer-loading')).not.toBeNull();
      expect(container.querySelector('img')).toHaveClass('opacity-0');
    });
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

  it('keeps the <img> mounted past the 5s timeout, and a late load still recovers it', () => {
    vi.useFakeTimers();

    const { container } = render(
      <FilmImage src="https://example.com/slow.jpeg" alt="a slow film" />
    );

    let img = container.querySelector('img');
    if (!img) throw new Error('expected an <img> to be rendered');

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // The fallback icon shows as an overlay, but the real <img> is still
    // mounted underneath (hidden via opacity), not unmounted.
    expect(container.querySelector('svg')).not.toBeNull();
    img = container.querySelector('img');
    if (!img) throw new Error('<img> must stay mounted after the timeout');
    expect(img).toHaveClass('opacity-0');

    fireEvent.load(img);

    // A late load — the browser finally fetched the lazily-deferred image —
    // clears the timed-out icon and reveals the real image.
    expect(container.querySelector('svg')).toBeNull();
    expect(container.querySelector('img')).not.toHaveClass('opacity-0');
  });

  describe('with an image loader (resized thumbnails)', () => {
    const loader: FilmImageLoader = (src, width) =>
      src.startsWith('https://storage.example/')
        ? `/opt?url=${encodeURIComponent(src)}&w=${width}`
        : null;
    const original = 'https://storage.example/film.jpeg';

    function renderWithLoader(ui: React.ReactElement) {
      return render(
        <FilmImageLoaderContext value={loader}>{ui}</FilmImageLoaderContext>
      );
    }

    it('requests a resized 1x/2x pair instead of the original', () => {
      const { container } = renderWithLoader(
        <FilmImage src={original} alt="a film" size="md" />
      );

      const img = container.querySelector('img');
      const encoded = encodeURIComponent(original);
      expect(img).toHaveAttribute('src', `/opt?url=${encoded}&w=64`);
      expect(img).toHaveAttribute(
        'srcset',
        `/opt?url=${encoded}&w=64 1x, /opt?url=${encoded}&w=128 2x`
      );
      // Still lazy: the resized URL doesn't change when it's fetched.
      expect(img).toHaveAttribute('loading', 'lazy');
    });

    it('sizes the request from renderedSize when a className enlarges it', () => {
      const { container } = renderWithLoader(
        <FilmImage src={original} alt="a film" size="lg" renderedSize={224} />
      );

      expect(container.querySelector('img')?.getAttribute('src')).toMatch(
        /&w=256$/
      );
    });

    it('loads hosts the loader declines as the original URL', () => {
      const { container } = renderWithLoader(
        <FilmImage src="https://elsewhere.example/film.jpg" alt="a film" />
      );

      const img = container.querySelector('img');
      expect(img).toHaveAttribute('src', 'https://elsewhere.example/film.jpg');
      expect(img).not.toHaveAttribute('srcset');
    });

    it('falls back to the original when the resized URL fails, then to the icon', () => {
      const { container } = renderWithLoader(
        <FilmImage src={original} alt="a film" />
      );

      let img = container.querySelector('img');
      if (!img) throw new Error('expected an <img> to be rendered');
      fireEvent.error(img);

      // Optimizer unavailable (dev, non-Vercel host, over quota): retry the
      // original, with no srcset left to override it.
      img = container.querySelector('img');
      if (!img) throw new Error('<img> must stay mounted for the retry');
      expect(img).toHaveAttribute('src', original);
      expect(img).not.toHaveAttribute('srcset');
      expect(container.querySelector('svg')).toBeNull();

      // The original failing too is a real error.
      fireEvent.error(img);
      expect(container.querySelector('img')).toBeNull();
      expect(container.querySelector('svg')).not.toBeNull();
    });
  });

  describe('with images disabled (legacy browsers, #636)', () => {
    it('shows the placeholder icon and mounts no <img>, so nothing is fetched', () => {
      vi.useFakeTimers();
      const { container } = render(
        <FilmImagesEnabledContext value={false}>
          <FilmImage src="https://example.com/film.jpeg" alt="a film" />
        </FilmImagesEnabledContext>
      );

      expect(container.querySelector('img')).toBeNull();
      expect(container.querySelector('svg')).not.toBeNull();
      // No loading shimmer, and no 5s timeout swapping anything in later.
      expect(container.querySelector('.shimmer-loading')).toBeNull();
      act(() => {
        vi.advanceTimersByTime(6000);
      });
      expect(container.querySelector('img')).toBeNull();
    });

    it('loads the image when the context is left at its default', () => {
      const { container } = render(
        <FilmImagesEnabledContext value={true}>
          <FilmImage src="https://example.com/film.jpeg" alt="a film" />
        </FilmImagesEnabledContext>
      );

      expect(container.querySelector('img')).toHaveAttribute(
        'src',
        'https://example.com/film.jpeg'
      );
    });
  });
});
