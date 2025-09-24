import React from 'react';
import { cn } from '../lib/cn';

export interface ShareButtonProps {
  onClick: () => void;
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
    switch (variant) {
      case 'primary':
        e.currentTarget.style.backgroundColor =
          'color-mix(in srgb, var(--color-semantic-info) 85%, transparent)';
        break;
      case 'secondary':
        e.currentTarget.style.backgroundColor = 'var(--color-text-secondary)';
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
  };

  return (
    <button
      type="button"
      onClick={onClick}
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

      {children || (isLoading ? 'Sharing...' : 'Share')}
    </button>
  );
}
