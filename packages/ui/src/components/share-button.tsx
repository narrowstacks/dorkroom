import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../lib/cn';
import { shouldUseWebShare } from '@dorkroom/logic';

export interface ShareButtonProps {
  onClick: () => void | Promise<unknown>;
  isLoading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children?: React.ReactNode;
}

export function ShareButton({
  onClick,
  isLoading = false,
  disabled = false,
  variant = 'primary',
  size = 'md',
  className,
  children,
}: ShareButtonProps) {
  const [showToast, setShowToast] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on component unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const baseClasses = cn(
    'inline-flex items-center justify-center font-medium transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'rounded-lg',
    {
      // Size variants
      'px-3 py-1.5 text-sm': size === 'sm',
      'px-4 py-2 text-sm': size === 'md',
      'px-6 py-3 text-base': size === 'lg',

      // Loading state
      'cursor-wait': isLoading,
    },
    className
  );

  const getVariantStyle = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: 'var(--color-semantic-info)',
          color: 'var(--color-surface)',
        };
      case 'secondary':
        return {
          backgroundColor: 'var(--color-text-tertiary)',
          color: 'var(--color-surface)',
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderColor: 'var(--color-border-primary)',
          color: 'var(--color-text-secondary)',
        };
      default:
        return {};
    }
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || isLoading) return;
    const isDarkroomMode = document.documentElement.getAttribute('data-theme') === 'darkroom';
    
    switch (variant) {
      case 'primary':
        e.currentTarget.style.backgroundColor =
          'color-mix(in srgb, var(--color-semantic-info) 85%, transparent)';
        // In darkroom mode, change text color to black for better contrast against red background
        if (isDarkroomMode) {
          e.currentTarget.style.color = '#000000';
        }
        break;
      case 'secondary':
        e.currentTarget.style.backgroundColor = 'var(--color-text-secondary)';
        if (isDarkroomMode) {
          e.currentTarget.style.color = '#000000';
        }
        break;
      case 'outline':
        e.currentTarget.style.backgroundColor = 'var(--color-surface-muted)';
        break;
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || isLoading) return;
    const style = getVariantStyle();
    e.currentTarget.style.backgroundColor = style.backgroundColor || '';
    e.currentTarget.style.color = style.color || '';
  };

  const handleClick = async () => {
    const isWebShare = shouldUseWebShare();

    let shouldShowToast = !isWebShare;

    try {
      const result = onClick();
      const resolved = result instanceof Promise ? await result : result;

      // If the caller indicates a clipboard path or explicit toast, show it
      if (!shouldShowToast && resolved && typeof resolved === 'object') {
        const maybe: any = resolved;
        if (maybe.showToast === true || maybe.method === 'clipboard') {
          shouldShowToast = true;
        }
      }
    } catch (e) {
      // On errors from caller, do not show toast here; leave it to caller to handle
    }

    if (shouldShowToast) {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
      setShowToast(true);
      toastTimeoutRef.current = setTimeout(() => setShowToast(false), 3000);
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        disabled={disabled || isLoading}
        className={baseClasses}
        style={getVariantStyle()}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
      {isLoading && (
        <svg
          className="mr-2 h-4 w-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}

      {!isLoading && (
        <svg
          className="mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
          />
        </svg>
      )}

        {children || (isLoading ? 'Sharing...' : shouldUseWebShare() ? 'Share' : 'Copy link')}
      </button>

      {/* Local toast notification that appears below the button */}
      {showToast && (
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
