import { useState, useRef, useEffect } from 'react';
import { ChevronDown, LucideIcon } from 'lucide-react';
import { cn } from '../lib/cn';

export interface NavigationItem {
  label: string;
  to: string;
  icon: LucideIcon;
  summary: string;
}

export interface NavigationDropdownProps {
  label: string;
  icon: LucideIcon;
  items: NavigationItem[];
  currentPath: string;
  onNavigate: (path: string) => void;
  className?: string;
}

export function NavigationDropdown({
  label,
  icon: Icon,
  items,
  currentPath,
  onNavigate,
  className,
}: NavigationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Check if any item in this dropdown is currently active
  const isActive = items.some((item) => item.to === currentPath);

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

  const handleItemClick = (path: string) => {
    onNavigate(path);
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

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex min-w-fit items-center gap-2 rounded-full px-4 py-2 font-medium transition focus-visible:outline-none',
          'focus-visible:ring-2',
          'focus-visible:ring-[color:var(--color-border-primary)]',
          'text-[color:var(--color-text-tertiary)] hover:text-[color:var(--color-text-secondary)]',
          isActive &&
            'bg-[color:var(--color-text-primary)] text-[color:var(--color-background)] shadow-subtle hover:text-[color:var(--color-background)]'
        )}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <Icon className="h-4 w-4" />
        {label}
        <ChevronDown
          className={cn('h-3 w-3 transition-transform', isOpen && 'rotate-180')}
        />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-full z-50 mt-2 min-w-56 rounded-2xl border p-2 shadow-xl backdrop-blur-md"
          style={{
            borderColor: 'var(--color-border-secondary)',
            backgroundColor: 'rgba(var(--color-background-rgb), 0.95)',
            boxShadow:
              '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          }}
          role="menu"
        >
          {items.map((item) => {
            const ItemIcon = item.icon;
            const isItemActive = item.to === currentPath;

            return (
              <button
                key={item.to}
                type="button"
                onClick={() => handleItemClick(item.to)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition focus-visible:outline-none',
                  'text-[color:var(--color-text-secondary)] hover:bg-[color:var(--color-border-muted)] hover:text-[color:var(--color-text-primary)]',
                  isItemActive &&
                    'bg-[color:var(--color-text-primary)] text-[color:var(--color-background)] shadow-subtle'
                )}
                role="menuitem"
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: isItemActive
                      ? 'rgba(var(--color-background-rgb), 0.2)'
                      : 'rgba(var(--color-background-rgb), 0.08)',
                  }}
                >
                  <ItemIcon className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <div className="font-medium">{item.label}</div>
                  <div
                    className="text-xs opacity-75"
                    style={{
                      color: isItemActive
                        ? 'var(--color-background)'
                        : 'var(--color-text-tertiary)',
                    }}
                  >
                    {item.summary}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
