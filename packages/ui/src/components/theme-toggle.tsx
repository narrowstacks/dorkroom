import { useState, useRef, useEffect } from 'react';
import {
  Moon,
  Sun,
  Monitor,
  Contrast,
  Camera,
  ChevronDown,
} from 'lucide-react';
import { cn } from '../lib/cn';
import { useTheme } from '../contexts/theme-context';
import type { Theme } from '../lib/themes';

interface ThemeOption {
  value: Theme;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const themeOptions: ThemeOption[] = [
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'high-contrast', label: 'High Contrast', icon: Contrast },
  { value: 'darkroom', label: 'Darkroom', icon: Camera },
  { value: 'system', label: 'System', icon: Monitor },
];

export interface ThemeToggleProps {
  variant?: 'button' | 'icon';
  className?: string;
}

export function ThemeToggle({ variant = 'icon', className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuItemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const currentTheme = themeOptions.find((option) => option.value === theme);
  const CurrentIcon = currentTheme?.icon || Monitor;

  // Reset focused index when menu opens
  useEffect(() => {
    if (isOpen) {
      setFocusedIndex(-1);
    }
  }, [isOpen]);

  // Focus menu item when focused index changes
  useEffect(() => {
    if (focusedIndex >= 0 && focusedIndex < menuItemRefs.current.length) {
      menuItemRefs.current[focusedIndex]?.focus();
    }
  }, [focusedIndex]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }

    return undefined;
  }, [isOpen]);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  const handleButtonKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsOpen(!isOpen);
      if (!isOpen) {
        setFocusedIndex(0);
      }
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setFocusedIndex(0);
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setFocusedIndex(themeOptions.length - 1);
      }
    }
  };

  const handleMenuKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setFocusedIndex((prev) =>
        prev < themeOptions.length - 1 ? prev + 1 : 0
      );
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setFocusedIndex((prev) =>
        prev > 0 ? prev - 1 : themeOptions.length - 1
      );
    } else if (event.key === 'Home') {
      event.preventDefault();
      setFocusedIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setFocusedIndex(themeOptions.length - 1);
    }
  };

  if (variant === 'button') {
    return (
      <div ref={dropdownRef} className={cn('relative', className)}>
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={handleButtonKeyDown}
          className={cn(
            'flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition focus-visible:outline-none',
            'text-[color:var(--color-text-secondary)] hover-surface-tint hover:text-[color:var(--nav-hover-text)]'
          )}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          aria-label="Theme"
        >
          <span className="theme-toggle-icon-bg flex h-9 w-9 items-center justify-center rounded-2xl">
            <CurrentIcon className="h-4 w-4" />
          </span>
          <span className="flex-1 text-left">Theme</span>
          <ChevronDown
            className={cn(
              'h-4 w-4 transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </button>

        {isOpen && (
          <div
            className="absolute bottom-full left-0 z-50 mb-2 min-w-56 rounded-2xl border p-2 shadow-xl"
            style={{
              backgroundColor: 'var(--color-background)',
              borderColor: 'var(--color-border-primary)',
            }}
            role="menu"
          >
            {themeOptions.map((option, index) => {
              const OptionIcon = option.icon;
              const isSelected = option.value === theme;

              return (
                <button
                  key={option.value}
                  ref={(el) => {
                    menuItemRefs.current[index] = el;
                  }}
                  type="button"
                  onClick={() => handleThemeChange(option.value)}
                  onKeyDown={handleMenuKeyDown}
                  className={cn(
                    'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition focus-visible:outline-none',
                    'text-[color:var(--color-text-secondary)] hover:bg-[color:var(--color-border-muted)] hover:text-[color:var(--color-text-primary)]',
                    isSelected &&
                      'bg-[color:var(--color-text-primary)] text-[color:var(--color-background)] shadow-subtle'
                  )}
                  role="menuitem"
                >
                  <span
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-xl',
                      isSelected
                        ? 'theme-toggle-icon-bg-selected'
                        : 'theme-toggle-icon-bg'
                    )}
                  >
                    <OptionIcon className="h-4 w-4" />
                  </span>
                  <span className="flex-1">{option.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Icon variant for desktop nav
  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleButtonKeyDown}
        className={cn(
          'nav-button flex h-9 w-9 items-center justify-center rounded-full transition focus-visible:outline-none',
          'focus-visible:ring-2',
          'focus-visible:ring-[color:var(--color-border-primary)]',
          'text-[color:var(--color-text-primary)] hover:bg-[color:var(--color-border-muted)]'
        )}
        style={{
          borderColor: 'var(--color-border-secondary)',
          borderWidth: 1,
          backgroundColor: 'transparent',
        }}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Theme"
      >
        <CurrentIcon className="h-4 w-4" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full z-50 mt-2 min-w-56 rounded-2xl border p-2 shadow-xl"
          style={{
            backgroundColor: 'var(--color-background)',
            borderColor: 'var(--color-border-primary)',
          }}
          role="menu"
        >
          {themeOptions.map((option, index) => {
            const OptionIcon = option.icon;
            const isSelected = option.value === theme;

            return (
              <button
                key={option.value}
                ref={(el) => {
                  menuItemRefs.current[index] = el;
                }}
                type="button"
                onClick={() => handleThemeChange(option.value)}
                onKeyDown={handleMenuKeyDown}
                className={cn(
                  'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition focus-visible:outline-none',
                  'text-[color:var(--color-text-secondary)] hover:bg-[color:var(--color-border-muted)] hover:text-[color:var(--color-text-primary)]',
                  isSelected &&
                    'bg-[color:var(--color-text-primary)] text-[color:var(--color-background)] shadow-subtle'
                )}
                role="menuitem"
              >
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-xl',
                    isSelected
                      ? 'theme-toggle-icon-bg-selected'
                      : 'theme-toggle-icon-bg'
                  )}
                >
                  <OptionIcon className="h-4 w-4" />
                </span>
                <span className="flex-1">{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
