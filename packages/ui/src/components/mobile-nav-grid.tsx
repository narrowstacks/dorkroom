import { Settings } from 'lucide-react';
import { cn } from '../lib/cn';
import type { MobileNavItem } from '../lib/navigation';
import { mobileNavItems } from '../lib/navigation';
import { ThemeToggle } from './theme-toggle';

interface NavGridCellProps {
  item: MobileNavItem;
  isActive: boolean;
  onClick: () => void;
}

function NavGridCell({ item, isActive, onClick }: NavGridCellProps) {
  const Icon = item.icon;

  const cellClasses = cn(
    'flex flex-col items-center justify-center gap-1.5 rounded-xl p-3',
    'min-h-[72px]',
    'transition focus-visible:outline-none focus-visible:ring-2',
    'focus-visible:ring-[color:var(--color-border-primary)]',
    'text-[color:var(--color-text-secondary)]',
    'hover-surface-tint hover:text-[color:var(--nav-hover-text)]',
    isActive &&
      'bg-[color:var(--color-text-primary)] text-[color:var(--color-background)] shadow-subtle hover:text-[color:var(--nav-active-hover-text)]'
  );

  const iconWrapperClasses = cn(
    'flex h-10 w-10 items-center justify-center rounded-xl',
    !isActive && 'bg-[rgba(var(--color-background-rgb),0.08)]'
  );

  if (item.type === 'external' && item.href) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noreferrer"
        className={cellClasses}
        aria-label={item.ariaLabel || item.label}
        onClick={onClick}
      >
        <span className={iconWrapperClasses}>
          <Icon className="h-5 w-5" />
        </span>
        <span className="max-w-full truncate text-[11px] font-medium leading-tight">
          {item.label}
        </span>
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cellClasses}
      aria-current={isActive ? 'page' : undefined}
      aria-label={item.ariaLabel || item.label}
    >
      <span className={iconWrapperClasses}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="max-w-full truncate text-[11px] font-medium leading-tight">
        {item.label}
      </span>
    </button>
  );
}

export interface MobileNavGridProps {
  pathname: string;
  onNavigate: (path: string) => void;
  onClose: () => void;
}

export function MobileNavGrid({
  pathname,
  onNavigate,
  onClose,
}: MobileNavGridProps) {
  // Utilities section: Home, external links, theme, settings
  const homeItem = mobileNavItems.find((item) => item.to === '/');
  const externalItems = mobileNavItems.filter(
    (item) => item.type === 'external'
  );
  const settingsItem = mobileNavItems.find((item) => item.type === 'settings');

  // Calculator section: all route items except Home
  const calculatorItems = mobileNavItems.filter(
    (item) => item.type === 'route' && item.to !== '/'
  );

  const isRouteActive = (to: string) => {
    if (to === '/') return pathname === '/';
    return pathname.startsWith(to);
  };

  const renderNavCell = (item: MobileNavItem) => {
    const isActive = item.to ? isRouteActive(item.to) : false;
    return (
      <NavGridCell
        key={item.to || item.href}
        item={item}
        isActive={isActive}
        onClick={() => {
          if (item.type === 'route' && item.to) {
            onNavigate(item.to);
          }
          onClose();
        }}
      />
    );
  };

  return (
    <div className="p-4">
      <nav className="grid grid-cols-3 gap-2" aria-label="Main navigation">
        {/* Utilities section: Home, GitHub, Newsletter, Theme, Settings */}
        {homeItem && renderNavCell(homeItem)}
        {externalItems.map(renderNavCell)}
        <ThemeToggle variant="grid" onSelect={onClose} />
        {settingsItem && (
          <NavGridCell
            item={{
              ...settingsItem,
              icon: Settings,
            }}
            isActive={pathname === '/settings'}
            onClick={() => {
              if (settingsItem.to) {
                onNavigate(settingsItem.to);
              }
              onClose();
            }}
          />
        )}

        {/* Divider between utilities and calculators */}
        <div
          className="col-span-3 my-1 h-px"
          style={{ backgroundColor: 'var(--color-border-muted)' }}
        />

        {/* Calculator section */}
        {calculatorItems.map(renderNavCell)}
      </nav>
    </div>
  );
}
