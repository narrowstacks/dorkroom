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

export const FilmImage: FC<FilmImageProps> = ({
  src,
  alt,
  size = 'md',
  className,
}) => {
  const [hasError, setHasError] = useState(false);
  // Only start in loading state if we have a src to load
  const [isLoading, setIsLoading] = useState(!!src);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const dimension = sizeMap[size];

  // Reset state when src changes to ensure correct display for new film
  useEffect(() => {
    setHasError(false);
    setHasTimedOut(false);
    // Only show loading state if we have a src to load
    setIsLoading(!!src);
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
            onLoad={() => setIsLoading(false)}
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
