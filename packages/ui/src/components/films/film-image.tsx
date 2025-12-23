import { Film } from 'lucide-react';
import { type FC, useEffect, useState } from 'react';
import { cn } from '../../lib/cn';

interface FilmImageProps {
  src: string | null;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 40,
  md: 60,
  lg: 80,
} as const;

// Module-level cache to track which images have been successfully loaded
// This prevents showing loading state for images that are already in browser cache
const loadedImageCache = new Set<string>();

/**
 * Check if an image is already loaded in the browser cache
 * Uses the browser's native image complete check
 */
function isImageCached(src: string): boolean {
  if (loadedImageCache.has(src)) return true;

  // Check if browser has the image cached
  const img = new Image();
  img.src = src;
  // If complete is true and naturalWidth > 0, the image is cached
  if (img.complete && img.naturalWidth > 0) {
    loadedImageCache.add(src);
    return true;
  }
  return false;
}

export const FilmImage: FC<FilmImageProps> = ({
  src,
  alt,
  size = 'md',
  className,
}) => {
  const [hasError, setHasError] = useState(false);
  // Check cache first - skip loading state if image is already cached
  const [isLoading, setIsLoading] = useState(
    () => !!src && !isImageCached(src)
  );
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const dimension = sizeMap[size];

  // Reset state when src changes to ensure correct display for new film
  useEffect(() => {
    setHasError(false);
    setHasTimedOut(false);
    // Only show loading state if we have a src to load and it's not cached
    setIsLoading(!!src && !isImageCached(src));
  }, [src]);

  // Timeout after 5 seconds - show fallback icon instead of loading animation
  useEffect(() => {
    if (!src || !isLoading) return;

    const timeoutId = setTimeout(() => {
      if (isLoading) {
        setHasTimedOut(true);
        setIsLoading(false);
      }
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, [src, isLoading]);

  const showFallback = !src || hasError || hasTimedOut;

  return (
    <div
      className={cn(
        'aspect-square flex items-center justify-center rounded-lg overflow-hidden flex-shrink-0',
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
                animation: 'shimmer 1.5s ease-in-out infinite',
              }}
            />
          )}
          <img
            src={src}
            alt={alt}
            loading="lazy"
            onError={() => {
              setHasError(true);
              setIsLoading(false);
            }}
            onLoad={() => {
              if (src) loadedImageCache.add(src);
              setIsLoading(false);
            }}
            className={cn(
              'w-full h-full object-cover transition-opacity duration-300',
              isLoading && 'opacity-0'
            )}
          />
        </>
      )}
    </div>
  );
};
