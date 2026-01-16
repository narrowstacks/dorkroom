import { shouldUseWebShare } from '@dorkroom/logic';
import { Loader2, Share2 } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '../lib/cn';
import { useOptionalToast } from './toast';

/**
 * Result returned from ShareButton's onClick callback to control toast display
 */
export interface ShareResult {
  /** Whether to show a toast notification */
  showToast?: boolean;
  /** The method used for sharing */
  method?: 'clipboard' | 'webshare';
}

export interface ShareButtonProps {
  onClick: () => undefined | ShareResult | Promise<undefined | ShareResult>;
  isLoading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children?: React.ReactNode;
  /** When true, only show the icon without text label */
  iconOnly?: boolean;
}

/**
 * Get CSS classes for button variants with hover states.
 * Uses CSS for hover to prevent flickering on re-render.
 */
function getVariantClasses(
  variant: 'primary' | 'secondary' | 'outline',
  isDarkroom: boolean,
  isDarkTheme: boolean
): { buttonClasses: string; iconClasses: string } {
  switch (variant) {
    case 'primary':
      return {
        buttonClasses: cn(
          'bg-[var(--color-semantic-info)] text-[var(--color-surface)]',
          // Hover: slightly darker/more saturated
          'hover:[background-color:color-mix(in_srgb,var(--color-semantic-info)_85%,black)]',
          isDarkroom && 'hover:text-black'
        ),
        iconClasses: 'stroke-[var(--color-surface)]',
      };
    case 'secondary':
      return {
        buttonClasses: cn(
          'bg-[var(--color-text-tertiary)] text-[var(--color-surface)]',
          'hover:bg-[var(--color-text-secondary)]',
          isDarkroom && 'hover:text-black'
        ),
        iconClasses: 'stroke-[var(--color-surface)]',
      };
    case 'outline':
      if (isDarkroom) {
        return {
          buttonClasses: cn(
            'bg-transparent border border-[var(--color-semantic-info)] text-[var(--color-semantic-info)]',
            'hover:bg-[var(--color-semantic-info)] hover:text-black'
          ),
          iconClasses:
            'stroke-[var(--color-semantic-info)] group-hover:stroke-black',
        };
      }
      return {
        buttonClasses: cn(
          'bg-transparent border border-[var(--color-border-primary)] text-[var(--color-text-secondary)]',
          'hover:bg-[var(--color-border-secondary)]',
          isDarkTheme ? 'hover:text-white' : 'hover:text-black'
        ),
        iconClasses: cn(
          'stroke-[var(--color-text-secondary)]',
          isDarkTheme ? 'group-hover:stroke-white' : 'group-hover:stroke-black'
        ),
      };
    default:
      return { buttonClasses: '', iconClasses: '' };
  }
}

export function ShareButton({
  onClick,
  isLoading = false,
  disabled = false,
  variant = 'primary',
  size = 'md',
  className,
  children,
  iconOnly = false,
}: ShareButtonProps) {
  const [showToast, setShowToast] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toast = useOptionalToast();

  // Cleanup timeout on component unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const theme = document.documentElement.getAttribute('data-theme');
  const isDarkroom = theme === 'darkroom';
  const isDarkTheme = theme === 'dark' || theme === 'high-contrast';

  const { buttonClasses, iconClasses } = getVariantClasses(
    variant,
    isDarkroom,
    isDarkTheme
  );

  const baseClasses = cn(
    'group inline-flex items-center justify-center font-medium transition-colors',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    // Use rounded-md for icon-only buttons to match ActionIconButton
    iconOnly ? 'rounded-md' : 'rounded-lg',
    {
      // Size variants - use square padding for iconOnly
      'p-1.5 text-sm': size === 'sm' && iconOnly,
      'px-3 py-1.5 text-sm': size === 'sm' && !iconOnly,
      'px-4 py-2 text-sm': size === 'md',
      'px-6 py-3 text-base': size === 'lg',

      // Loading state
      'cursor-wait': isLoading,
    },
    buttonClasses,
    className
  );

  const handleClick = async () => {
    const isWebShare = shouldUseWebShare();

    let shouldShowToast = !isWebShare;

    try {
      const result = onClick();
      const resolved = result instanceof Promise ? await result : result;

      // If the caller indicates a clipboard path or explicit toast, show it
      if (!shouldShowToast && resolved && typeof resolved === 'object') {
        if (resolved.showToast === true || resolved.method === 'clipboard') {
          shouldShowToast = true;
        }
      }
    } catch {
      // On errors from caller, do not show toast here; leave it to caller to handle
    }

    if (shouldShowToast) {
      if (toast) {
        toast.showToast('Copied to clipboard!', 'success');
      } else {
        if (toastTimeoutRef.current) {
          clearTimeout(toastTimeoutRef.current);
        }
        setShowToast(true);
        toastTimeoutRef.current = setTimeout(() => setShowToast(false), 3000);
      }
    }
  };

  return (
    <div className={cn('relative', iconOnly && 'inline-flex')}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          void handleClick();
        }}
        disabled={disabled || isLoading}
        className={baseClasses}
        aria-label={
          iconOnly ? (shouldUseWebShare() ? 'Share' : 'Copy link') : undefined
        }
        title={
          iconOnly ? (shouldUseWebShare() ? 'Share' : 'Copy link') : undefined
        }
      >
        {isLoading ? (
          <Loader2
            className={cn(
              'pointer-events-none h-4 w-4 animate-spin',
              !iconOnly && 'mr-2'
            )}
            aria-hidden="true"
          />
        ) : (
          <Share2
            className={cn(
              'pointer-events-none h-4 w-4 transition-colors',
              iconClasses,
              !iconOnly && 'mr-2'
            )}
            aria-hidden="true"
            strokeWidth={2}
          />
        )}

        {!iconOnly &&
          (children ||
            (isLoading
              ? 'Sharing...'
              : shouldUseWebShare()
                ? 'Share'
                : 'Copy link'))}
      </button>

      {/* Local toast notification that appears below the button */}
      {!toast && showToast && (
        <div
          className={cn(
            'absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-[9999]',
            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium shadow-lg',
            'border border-solid transition-all duration-500 ease-in-out pointer-events-none',
            showToast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
          )}
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-semantic-success)',
            color: 'var(--color-text-primary)',
          }}
        >
          <svg
            className="h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span>Copied to clipboard!</span>
        </div>
      )}
    </div>
  );
}
