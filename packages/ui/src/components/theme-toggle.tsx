import { useState, useRef, useEffect } from 'react';
import { Moon, Sun, Monitor, Contrast, Camera, ChevronDown } from 'lucide-react';
import { cn } from '../lib/cn';
import { useTheme } from '../contexts/theme-context';
import type { Theme } from '../lib/themes';
import '../lib/ui.module.css';

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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const currentTheme = themeOptions.find((option) => option.value === theme);
  const CurrentIcon = currentTheme?.icon || Monitor;

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
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsOpen(!isOpen);
    } else if (event.key === 'ArrowDown' && !isOpen) {
      event.preventDefault();
      setIsOpen(true);
    }
  };

  if (variant === 'button') {
    return (
      <div ref={dropdownRef} className={cn('relative', className)}>
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          className={cn(
            'flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition focus-visible:outline-none',
            'text-[color:var(--color-text-secondary)] hover-surface-tint hover:text-[color:var(--nav-hover-text)]'
          )}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          aria-label="Theme"
        >
          <span
            className="flex h-9 w-9 items-center justify-center rounded-2xl"
            style={{
              backgroundColor: 'rgba(var(--color-background-rgb), 0.08)',
            }}
          >
            <CurrentIcon className="h-4 w-4" />
          </span>
          <span className="flex-1 text-left">Theme</span>
          <ChevronDown
            className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')}
          />
        </button>

        {isOpen && (
          <div
            className="absolute left-0 top-full z-50 mt-2 min-w-56 rounded-2xl border p-2 shadow-xl backdrop-blur-md"
            style={{
              borderColor: 'var(--color-border-primary)',
              backgroundColor: 'rgba(var(--color-background-rgb), 0.95)',
              boxShadow:
                '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            }}
            role="menu"
          >
            {themeOptions.map((option) => {
              const OptionIcon = option.icon;
              const isSelected = option.value === theme;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleThemeChange(option.value)}
                  className={cn(
                    'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition focus-visible:outline-none',
                    'text-[color:var(--color-text-secondary)] hover:bg-[color:var(--color-border-muted)] hover:text-[color:var(--color-text-primary)]',
                    isSelected &&
                      'bg-[color:var(--color-text-primary)] text-[color:var(--color-background)] shadow-subtle'
                  )}
                  role="menuitem"
                >
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-xl"
                    style={{
                      backgroundColor: isSelected
                        ? 'rgba(var(--color-background-rgb), 0.2)'
                        : 'rgba(var(--color-background-rgb), 0.08)',
                    }}
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
        onKeyDown={handleKeyDown}
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-full transition focus-visible:outline-none',
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
          className="absolute right-0 top-full z-50 mt-2 min-w-56 rounded-2xl border p-2 shadow-xl backdrop-blur-md"
          style={{
            borderColor: 'var(--color-border-primary)',
            backgroundColor: 'rgba(var(--color-background-rgb), 0.95)',
            boxShadow:
              '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          }}
          role="menu"
        >
          {themeOptions.map((option) => {
            const OptionIcon = option.icon;
            const isSelected = option.value === theme;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleThemeChange(option.value)}
                className={cn(
                  'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition focus-visible:outline-none',
                  'text-[color:var(--color-text-secondary)] hover:bg-[color:var(--color-border-muted)] hover:text-[color:var(--color-text-primary)]',
                  isSelected &&
                    'bg-[color:var(--color-text-primary)] text-[color:var(--color-background)] shadow-subtle'
                )}
                role="menuitem"
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: isSelected
                      ? 'rgba(var(--color-background-rgb), 0.2)'
                      : 'rgba(var(--color-background-rgb), 0.08)',
                  }}
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

