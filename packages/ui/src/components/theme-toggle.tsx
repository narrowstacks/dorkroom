import {
  Camera,
  ChevronDown,
  Contrast,
  Monitor,
  Moon,
  Sun,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../contexts/theme-context';
import { cn } from '../lib/cn';
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

function ThemeMenuItems({
  currentTheme,
  onSelect,
  menuItemRefs,
  onKeyDown,
}: {
  currentTheme: Theme;
  onSelect: (theme: Theme) => void;
  menuItemRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>;
  onKeyDown: (event: React.KeyboardEvent) => void;
}) {
  return (
    <>
      {themeOptions.map((option, index) => {
        const OptionIcon = option.icon;
        const isSelected = option.value === currentTheme;

        return (
          <button
            key={option.value}
            ref={(el) => {
              menuItemRefs.current[index] = el;
            }}
            type="button"
            onClick={() => onSelect(option.value)}
            onKeyDown={onKeyDown}
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
                'flex size-8 items-center justify-center rounded-xl',
                isSelected
                  ? 'theme-toggle-icon-bg-selected'
                  : 'theme-toggle-icon-bg'
              )}
            >
              <OptionIcon className="size-4" />
            </span>
            <span className="flex-1">{option.label}</span>
          </button>
        );
      })}
    </>
  );
}

function ThemeMenuPanel({
  isOpen,
  className,
  currentTheme,
  onSelect,
  menuItemRefs,
  onKeyDown,
}: {
  isOpen: boolean;
  className: string;
  currentTheme: Theme;
  onSelect: (theme: Theme) => void;
  menuItemRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>;
  onKeyDown: (event: React.KeyboardEvent) => void;
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={className}
      style={{
        backgroundColor: 'var(--color-background)',
        borderColor: 'var(--color-border-primary)',
      }}
      role="menu"
    >
      <ThemeMenuItems
        currentTheme={currentTheme}
        onSelect={onSelect}
        menuItemRefs={menuItemRefs}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}

export interface ThemeToggleProps {
  variant?: 'button' | 'icon' | 'grid' | 'sidebar';
  className?: string;
  onSelect?: () => void;
}

export function ThemeToggle({
  variant = 'icon',
  className,
  onSelect,
}: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  // Tracks the active menu item index. It only ever drives imperative focus
  // (never the rendered output), so a ref avoids needless re-renders.
  const focusedIndexRef = useRef(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuItemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const currentTheme = themeOptions.find((option) => option.value === theme);
  const CurrentIcon = currentTheme?.icon || Monitor;

  // Move focus to a menu item by index, deferring to the next frame so the
  // menu has rendered when opening. Keeps focus management in the handlers
  // that originate it instead of chaining effects.
  const focusMenuItem = (index: number) => {
    focusedIndexRef.current = index;
    if (index < 0) return;
    requestAnimationFrame(() => {
      if (index >= 0 && index < menuItemRefs.current.length) {
        menuItemRefs.current[index]?.focus();
      }
    });
  };

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

  // Toggle the dropdown via pointer. Reset focus tracking when opening to
  // match the previous reset-on-open behavior.
  const toggleOpen = () => {
    setIsOpen((prev) => {
      if (!prev) {
        focusedIndexRef.current = -1;
      }
      return !prev;
    });
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    setIsOpen(false);
    buttonRef.current?.focus();
    onSelect?.();
  };

  const handleButtonKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const willOpen = !isOpen;
      setIsOpen(willOpen);
      focusMenuItem(willOpen ? 0 : -1);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        focusMenuItem(0);
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        focusMenuItem(themeOptions.length - 1);
      }
    }
  };

  const handleMenuKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const prev = focusedIndexRef.current;
      focusMenuItem(prev < themeOptions.length - 1 ? prev + 1 : 0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prev = focusedIndexRef.current;
      focusMenuItem(prev > 0 ? prev - 1 : themeOptions.length - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusMenuItem(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusMenuItem(themeOptions.length - 1);
    }
  };

  const handleGridThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    setIsOpen(false);
    onSelect?.();
  };

  if (variant === 'grid') {
    return (
      <div ref={dropdownRef} className={cn('relative', className)}>
        <button
          ref={buttonRef}
          type="button"
          onClick={toggleOpen}
          onKeyDown={handleButtonKeyDown}
          className={cn(
            'flex w-full flex-col items-center justify-center gap-1.5 rounded-xl p-3',
            'min-h-[72px]',
            'text-[color:var(--color-text-secondary)]',
            'hover-surface-tint hover:text-[color:var(--nav-hover-text)]',
            'transition focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-[color:var(--color-border-primary)]'
          )}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          aria-label="Change theme"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-[rgba(var(--color-background-rgb),0.08)]">
            <CurrentIcon className="size-5" />
          </span>
          <span className="text-[11px] font-medium">Theme</span>
        </button>

        <ThemeMenuPanel
          isOpen={isOpen}
          className="absolute bottom-full left-1/2 z-50 mb-2 min-w-48 -translate-x-1/2 rounded-2xl border p-2 shadow-xl"
          currentTheme={theme}
          onSelect={handleGridThemeChange}
          menuItemRefs={menuItemRefs}
          onKeyDown={handleMenuKeyDown}
        />
      </div>
    );
  }

  if (variant === 'sidebar') {
    return (
      <div ref={dropdownRef} className={cn('relative flex-1', className)}>
        <button
          ref={buttonRef}
          type="button"
          onClick={toggleOpen}
          onKeyDown={handleButtonKeyDown}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium',
            'transition focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-[color:var(--color-border-primary)]',
            'text-[color:var(--color-text-secondary)]',
            'hover-surface-tint hover:text-[color:var(--nav-hover-text)]'
          )}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          aria-label="Change theme"
        >
          <CurrentIcon className="size-4" />
          <span>Theme</span>
        </button>

        <ThemeMenuPanel
          isOpen={isOpen}
          className="absolute bottom-full left-0 z-[60] mb-2 min-w-48 rounded-2xl border p-2 shadow-xl"
          currentTheme={theme}
          onSelect={handleGridThemeChange}
          menuItemRefs={menuItemRefs}
          onKeyDown={handleMenuKeyDown}
        />
      </div>
    );
  }

  if (variant === 'button') {
    return (
      <div ref={dropdownRef} className={cn('relative', className)}>
        <button
          ref={buttonRef}
          type="button"
          onClick={toggleOpen}
          onKeyDown={handleButtonKeyDown}
          className={cn(
            'flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition focus-visible:outline-none',
            'text-[color:var(--color-text-secondary)] hover-surface-tint hover:text-[color:var(--nav-hover-text)]'
          )}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          aria-label="Theme"
        >
          <span className="theme-toggle-icon-bg flex size-9 items-center justify-center rounded-2xl">
            <CurrentIcon className="size-4" />
          </span>
          <span className="flex-1 text-left">Theme</span>
          <ChevronDown
            className={cn(
              'size-4 transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </button>

        <ThemeMenuPanel
          isOpen={isOpen}
          className="absolute bottom-full left-0 z-50 mb-2 min-w-56 rounded-2xl border p-2 shadow-xl"
          currentTheme={theme}
          onSelect={handleThemeChange}
          menuItemRefs={menuItemRefs}
          onKeyDown={handleMenuKeyDown}
        />
      </div>
    );
  }

  // Icon variant for desktop nav
  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        onKeyDown={handleButtonKeyDown}
        className={cn(
          'nav-button flex size-9 items-center justify-center rounded-full transition focus-visible:outline-none',
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
        <CurrentIcon className="size-4" />
      </button>

      <ThemeMenuPanel
        isOpen={isOpen}
        className="absolute right-0 top-full z-50 mt-2 min-w-56 rounded-2xl border p-2 shadow-xl"
        currentTheme={theme}
        onSelect={handleThemeChange}
        menuItemRefs={menuItemRefs}
        onKeyDown={handleMenuKeyDown}
      />
    </div>
  );
}
