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
  // Group items by category
  const utilityItems = mobileNavItems.filter(
    (item) => item.category === 'utility'
  );
  const printingItems = mobileNavItems.filter(
    (item) => item.category === 'printing'
  );
  const filmItems = mobileNavItems.filter((item) => item.category === 'film');
  const cameraItems = mobileNavItems.filter(
    (item) => item.category === 'camera'
  );
  const referenceItems = mobileNavItems.filter(
    (item) => item.category === 'reference'
  );

  const isRouteActive = (to: string) => {
    if (to === '/') return pathname === '/';
    return pathname.startsWith(to);
  };

  const renderNavCell = (item: MobileNavItem) => {
    // Theme toggle is handled separately
    if (item.type === 'theme') {
      return <ThemeToggle key="theme" variant="grid" onSelect={onClose} />;
    }

    // Settings uses its own icon
    if (item.type === 'settings') {
      return (
        <NavGridCell
          key={item.to || item.label}
          item={{ ...item, icon: Settings }}
          isActive={item.to ? pathname === item.to : false}
          onClick={() => {
            if (item.to) onNavigate(item.to);
            onClose();
          }}
        />
      );
    }

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

  const renderSectionHeader = (label: string) => (
    <div
      key={`header-${label}`}
      className="col-span-3 px-1 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider"
      style={{ color: 'var(--color-text-tertiary)' }}
    >
      {label}
    </div>
  );

  return (
    <div className="p-4">
      <nav className="grid grid-cols-3 gap-2" aria-label="Main navigation">
        {/* Utility section */}
        {utilityItems.map(renderNavCell)}

        {/* Divider */}
        <div
          className="col-span-3 my-1 h-px"
          style={{ backgroundColor: 'var(--color-border-muted)' }}
        />

        {/* Printing section */}
        {printingItems.length > 0 && renderSectionHeader('Printing')}
        {printingItems.map(renderNavCell)}

        {/* Film section */}
        {filmItems.length > 0 && renderSectionHeader('Film')}
        {filmItems.map(renderNavCell)}

        {/* Camera section */}
        {cameraItems.length > 0 && renderSectionHeader('Camera')}
        {cameraItems.map(renderNavCell)}

        {/* Reference section */}
        {referenceItems.length > 0 && renderSectionHeader('Reference')}
        {referenceItems.map(renderNavCell)}
      </nav>
    </div>
  );
}
