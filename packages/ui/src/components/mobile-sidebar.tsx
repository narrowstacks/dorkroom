import { Settings } from 'lucide-react';
import { cn } from '../lib/cn';
import type { MobileNavItem } from '../lib/navigation';
import { mobileNavItems } from '../lib/navigation';
import { ThemeToggle } from './theme-toggle';

interface SidebarNavItemProps {
  item: MobileNavItem;
  isActive: boolean;
  onClick: () => void;
}

function SidebarNavItem({ item, isActive, onClick }: SidebarNavItemProps) {
  const Icon = item.icon;

  const itemClasses = cn(
    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium',
    'transition focus-visible:outline-none focus-visible:ring-2',
    'focus-visible:ring-[color:var(--color-border-primary)]',
    'text-[color:var(--color-text-secondary)]',
    'hover-surface-tint hover:text-[color:var(--nav-hover-text)]',
    isActive &&
      'bg-[color:var(--color-text-primary)] text-[color:var(--color-background)] shadow-subtle hover:text-[color:var(--nav-active-hover-text)]'
  );

  const iconClasses = cn(
    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
    !isActive && 'bg-[rgba(var(--color-background-rgb),0.08)]'
  );

  if (item.type === 'external' && item.href) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noreferrer"
        className={itemClasses}
        aria-label={item.ariaLabel || item.label}
        onClick={onClick}
      >
        <span className={iconClasses}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="truncate">{item.label}</span>
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={itemClasses}
      aria-current={isActive ? 'page' : undefined}
      aria-label={item.ariaLabel || item.label}
    >
      <span className={iconClasses}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="truncate">{item.label}</span>
    </button>
  );
}

export interface MobileSidebarProps {
  pathname: string;
  onNavigate: (path: string) => void;
  onClose: () => void;
}

export function MobileSidebar({
  pathname,
  onNavigate,
  onClose,
}: MobileSidebarProps) {
  // Filter out theme and settings — they go in the footer
  const navItems = mobileNavItems.filter(
    (item) => item.type !== 'theme' && item.type !== 'settings'
  );

  const utilityItems = navItems.filter((item) => item.category === 'utility');
  const printingItems = navItems.filter((item) => item.category === 'printing');
  const filmItems = navItems.filter((item) => item.category === 'film');
  const cameraItems = navItems.filter((item) => item.category === 'camera');
  const referenceItems = navItems.filter(
    (item) => item.category === 'reference'
  );

  const settingsItem = mobileNavItems.find((item) => item.type === 'settings');

  const isRouteActive = (to: string) => {
    if (to === '/') return pathname === '/';
    return pathname.startsWith(to);
  };

  const renderNavItem = (item: MobileNavItem) => {
    const isActive = item.to ? isRouteActive(item.to) : false;
    return (
      <SidebarNavItem
        key={item.to || item.href || item.label}
        item={item}
        isActive={isActive}
        onClick={() => {
          if (item.type === 'route' && item.to) {
            onNavigate(item.to);
          }
          if (item.type === 'external') {
            // External links handle their own navigation via <a> tag
          }
          onClose();
        }}
      />
    );
  };

  const renderSectionHeader = (label: string) => (
    <div
      key={`header-${label}`}
      className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider"
      style={{ color: 'var(--color-text-tertiary)' }}
    >
      {label}
    </div>
  );

  return (
    <div className="flex h-full flex-col">
      {/* Scrollable nav content */}
      <div className="flex-1 overflow-y-auto p-3">
        <nav className="flex flex-col gap-0.5" aria-label="Main navigation">
          {/* Utility items (Home, GitHub, Newsletter) */}
          {utilityItems.map(renderNavItem)}

          {/* Divider */}
          <div
            className="my-2 h-px"
            style={{ backgroundColor: 'var(--color-border-muted)' }}
          />

          {/* Printing section */}
          {printingItems.length > 0 && renderSectionHeader('Printing')}
          {printingItems.map(renderNavItem)}

          {/* Film section */}
          {filmItems.length > 0 && renderSectionHeader('Film')}
          {filmItems.map(renderNavItem)}

          {/* Camera section */}
          {cameraItems.length > 0 && renderSectionHeader('Camera')}
          {cameraItems.map(renderNavItem)}

          {/* Reference section */}
          {referenceItems.length > 0 && renderSectionHeader('Reference')}
          {referenceItems.map(renderNavItem)}
        </nav>
      </div>

      {/* Footer: Theme + Settings side by side */}
      <div
        className="flex gap-2 border-t p-3"
        style={{ borderColor: 'var(--color-border-muted)' }}
      >
        <ThemeToggle variant="sidebar" onSelect={onClose} />

        {settingsItem && (
          <button
            type="button"
            onClick={() => {
              if (settingsItem.to) onNavigate(settingsItem.to);
              onClose();
            }}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium',
              'transition focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-[color:var(--color-border-primary)]',
              'text-[color:var(--color-text-secondary)]',
              'hover-surface-tint hover:text-[color:var(--nav-hover-text)]',
              settingsItem.to &&
                pathname === settingsItem.to &&
                'bg-[color:var(--color-text-primary)] text-[color:var(--color-background)] shadow-subtle'
            )}
            aria-current={
              settingsItem.to && pathname === settingsItem.to
                ? 'page'
                : undefined
            }
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </button>
        )}
      </div>
    </div>
  );
}
