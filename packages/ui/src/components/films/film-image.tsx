import { Film } from 'lucide-react';
import { type FC, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '../../lib/cn';

interface FilmImageProps {
  src: string | null;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /**
   * Native `loading` hint for the underlying `<img>`. Defaults to `'lazy'`,
   * which is correct for thumbnails in scrollable/virtualized lists. Pass
   * `'eager'` only for an image that is guaranteed to be visible as soon as
   * it mounts (e.g. a detail panel that opens with the image already in the
   * viewport), where deferring the fetch would just delay a paint the user
   * is about to see anyway.
   */
  loading?: 'lazy' | 'eager';
}

const sizeMap = {
  sm: 40,
  md: 60,
  lg: 80,
} as const;

// Module-level cache to track which images have been successfully loaded in
// this session. Only ever populated by onLoad/the complete-check below —
// never by probing an image ourselves — so it can only avoid a skeleton
// flash on remount (e.g. a virtualized card scrolling out and back in); it
// never triggers a fetch.
const loadedImageCache = new Set<string>();

interface ImageState {
  hasError: boolean;
  isLoading: boolean;
  hasTimedOut: boolean;
}

function getInitialState(src: string | null): ImageState {
  return {
    hasError: false,
    hasTimedOut: false,
    // Only show loading state if we have a src to load and we haven't
    // already seen it load successfully earlier in this session.
    isLoading: !!src && !loadedImageCache.has(src),
  };
}

export const FilmImage: FC<FilmImageProps> = ({
  src,
  alt,
  size = 'md',
  className,
  loading = 'lazy',
}) => {
  // Single consolidated state so the per-src reset is one update.
  const [state, setState] = useState<ImageState>(() => getInitialState(src));
  const imgRef = useRef<HTMLImageElement>(null);
  // Reset state when src changes (skipping the initial mount, since useState
  // above already initializes correctly for it). A layout effect — not a
  // render-time ref write, which react-doctor's no-ref-current-in-render rule
  // flags, since render must stay pure — runs synchronously after the DOM
  // update but before the browser paints, so there's no visible flash of the
  // previous src's state.
  const isFirstRender = useRef(true);
  useLayoutEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setState(getInitialState(src));
  }, [src]);

  // Right after this src mounts, check whether the real <img> element
  // already reports itself as loaded (e.g. the browser served it from HTTP
  // cache). This only *reads* properties the browser already populated — it
  // never constructs an Image or assigns a src, so it can't trigger a fetch
  // and can't defeat `loading="lazy"`. A subsequent genuine load/error is
  // still handled by onLoad/onError below.
  useLayoutEffect(() => {
    if (!src) return;
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      loadedImageCache.add(src);
      setState((prev) =>
        prev.isLoading ? { ...prev, isLoading: false } : prev
      );
    }
  }, [src]);

  const { hasError, isLoading, hasTimedOut } = state;
  const dimension = sizeMap[size];

  // Timeout after 5 seconds - show fallback icon instead of loading animation
  useEffect(() => {
    if (!src || !isLoading) return;

    const timeoutId = setTimeout(() => {
      setState((prev) =>
        prev.isLoading ? { ...prev, hasTimedOut: true, isLoading: false } : prev
      );
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, [src, isLoading]);

  // Only !src and hasError unmount the real <img>. A timeout must NOT unmount
  // it: with `loading="lazy"` the browser can legitimately defer the fetch
  // well past 5s (e.g. Safari not extending the lazy margin into a nested
  // overflow scroller, so overscan rows stay deferred). Unmounting on
  // timeout would cancel that pending load and there'd be no onLoad handler
  // left to ever recover the thumbnail. Instead the icon renders as an
  // overlay on top of the still-mounted (opacity-0) <img>, and a late
  // onLoad clears hasTimedOut to swap the real image back in.
  const showFallback = !src || hasError;

  return (
    <div
      className={cn(
        'relative aspect-square flex items-center justify-center rounded-lg overflow-hidden flex-shrink-0',
        className
      )}
      style={{
        width: dimension,
        height: dimension,
        backgroundColor: 'var(--color-surface-muted)',
        borderWidth: 1,
        borderColor: 'var(--color-border-secondary)',
      }}
    >
      {showFallback ? (
        // Inline styles required for dynamic sizing based on dimension prop
        <Film
          className="text-current"
          style={{
            width: dimension * 0.6,
            height: dimension * 0.6,
            color: 'var(--color-text-muted)',
          }}
          strokeWidth={1.5}
          aria-hidden="true"
        />
      ) : (
        <>
          {isLoading && (
            <div
              className="absolute inset-0 shimmer-loading"
              style={{
                background:
                  'linear-gradient(90deg, var(--color-surface-muted) 0%, var(--color-border-muted) 50%, var(--color-surface-muted) 100%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 0.9s ease-in-out infinite',
              }}
            />
          )}
          {hasTimedOut && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Film
                className="text-current"
                style={{
                  width: dimension * 0.6,
                  height: dimension * 0.6,
                  color: 'var(--color-text-muted)',
                }}
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </div>
          )}
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            width={dimension}
            height={dimension}
            loading={loading}
            decoding="async"
            onError={() => {
              setState((prev) => ({
                ...prev,
                hasError: true,
                isLoading: false,
              }));
            }}
            onLoad={() => {
              if (src) loadedImageCache.add(src);
              setState((prev) => ({
                ...prev,
                isLoading: false,
                hasTimedOut: false,
              }));
            }}
            className={cn(
              'w-full h-full object-cover transition-opacity duration-300',
              (isLoading || hasTimedOut) && 'opacity-0'
            )}
          />
        </>
      )}
    </div>
  );
};
