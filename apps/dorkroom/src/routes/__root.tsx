import { useEffect, useState } from 'react';
import {
  Link,
  Outlet,
  createRootRoute,
  useRouter,
  useRouterState,
} from '@tanstack/react-router';
import { Beaker, GitBranch, Menu, Printer, Settings, X } from 'lucide-react';
import { cn } from '../app/lib/cn';
import {
  NavigationDropdown,
  printingItems,
  navItems,
  allNavItems,
  ROUTE_TITLES,
  ThemeToggle,
} from '@dorkroom/ui';

function RootComponent() {
  const router = useRouter();
  const routerState = useRouterState();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = routerState.location.pathname;

  // Update document title based on route
  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const normalisedPath = pathname.replace(/\/+$/, '') || '/';
    const pageTitle =
      ROUTE_TITLES[normalisedPath] ||
      allNavItems.find((item) => item.to === normalisedPath)?.label ||
      'Dorkroom';
    document.title =
      pageTitle === 'Dorkroom' ? 'Dorkroom' : `${pageTitle} - Dorkroom`;
  }, [pathname]);

  // Close mobile menu on navigation
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Handle body overflow for mobile menu
  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    if (isMobileMenuOpen) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = previousOverflow;
      };
    } else {
      document.body.style.removeProperty('overflow');
      return undefined;
    }
  }, [isMobileMenuOpen]);

  const handleNavigate = (path: string) => {
    router.navigate({ to: path });
  };

  return (
    <div
      className="h-dvh"
      style={{ backgroundColor: 'var(--color-background)' }}
    >
      <div className="backdrop-gradient min-h-dvh">
        <header
          className="sticky top-[env(safe-area-inset-top)] z-50 hidden border-b backdrop-blur sm:block"
          style={{
            backgroundColor: 'rgba(var(--color-background-rgb), 0.8)',
            borderColor: 'var(--color-border-muted)',
          }}
        >
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4 sm:px-10">
            <Link
              to="/"
              className="flex items-center gap-3"
              style={{ color: 'var(--color-text-primary)' }}
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-2xl"
                style={{
                  backgroundColor: 'rgba(var(--color-background-rgb), 0.1)',
                }}
              >
                <Beaker className="h-10 w-10" />
              </span>
              <span className="hidden text-lg font-semibold tracking-tight sm:block">
                Dorkroom
              </span>
            </Link>
            <nav className="hidden flex-1 justify-center sm:flex">
              <div
                className="relative flex max-w-full gap-1 rounded-full border p-1 text-sm backdrop-blur"
                style={{
                  borderColor: 'var(--color-border-secondary)',
                  backgroundColor: 'rgba(var(--color-background-rgb), 0.5)',
                }}
              >
                {navItems.map(({ label, to, icon: Icon }) => {
                  const isActive =
                    to === '/' ? pathname === '/' : pathname.startsWith(to);
                  return (
                    <Link
                      key={to}
                      to={to}
                      className={cn(
                        'flex min-w-fit items-center gap-2 rounded-full px-4 py-2 font-medium transition focus-visible:outline-none',
                        'focus-visible:ring-2',
                        'focus-visible:ring-[color:var(--color-border-primary)]',
                        'text-[color:var(--color-text-tertiary)] hover:text-[color:var(--nav-hover-text)]',
                        isActive &&
                          'bg-[color:var(--color-text-primary)] text-[color:var(--color-background)] shadow-subtle hover:text-[color:var(--nav-active-hover-text)]'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Link>
                  );
                })}
                <NavigationDropdown
                  label="Printing"
                  icon={Printer}
                  items={printingItems}
                  currentPath={pathname}
                  onNavigate={handleNavigate}
                />
                {/* Shooting section commented out - Reciprocity moved to main nav */}
                {/* <NavigationDropdown
                  label="Shooting"
                  icon={Camera}
                  items={shootingItems}
                  currentPath={pathname}
                  onNavigate={handleNavigate}
                /> */}
              </div>
            </nav>
            <div className="hidden items-center gap-3 sm:flex">
              <a
                href="https://github.com/narrowstacks/dorkroom"
                target="_blank"
                rel="noreferrer"
                className="nav-button flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition"
                style={{
                  color: 'var(--color-text-primary)',
                  borderColor: 'var(--color-border-secondary)',
                  borderWidth: 1,
                  backgroundColor: 'transparent',
                }}
              >
                <GitBranch className="h-4 w-4" />
                Contribute
              </a>
              <ThemeToggle variant="icon" />
              <Link
                to="/settings"
                className="nav-button flex h-9 w-9 items-center justify-center rounded-full transition focus-visible:outline-none"
                style={{
                  color: 'var(--color-text-primary)',
                  borderColor: 'var(--color-border-secondary)',
                  borderWidth: 1,
                  backgroundColor: 'transparent',
                }}
                aria-label="Settings"
              >
                <Settings className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </header>

        <button
          type="button"
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-[calc(env(safe-area-inset-right)+1rem)] z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-lg backdrop-blur transition focus-visible:outline-none sm:hidden"
          style={{
            color: 'var(--color-background)',
            borderColor: 'var(--color-background)',
            borderWidth: 1,
            backgroundColor: 'var(--color-text-primary)',
            opacity: 0.9,
          }}
          aria-label={isMobileMenuOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setIsMobileMenuOpen((open) => !open)}
        >
          {isMobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>

        {isMobileMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-40 h-screen min-h-dvh backdrop-blur-sm transition-opacity"
              style={{
                backgroundColor: 'rgba(var(--color-background-rgb), 0.6)',
              }}
              aria-hidden="true"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <nav
              id="mobile-navigation"
              className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-50 flex justify-end px-6"
              role="dialog"
              aria-modal="true"
            >
              <div
                className="mt-4 w-full max-w-xs rounded-3xl border p-5 shadow-xl backdrop-blur"
                style={{
                  backgroundColor: 'rgba(var(--color-background-rgb), 0.95)',
                  borderColor: 'var(--color-border-secondary)',
                }}
              >
                <ul className="space-y-1">
                  {/* Main navigation items */}
                  {navItems.map(({ label, to, icon: Icon }) => {
                    const isActive =
                      to === '/' ? pathname === '/' : pathname.startsWith(to);
                    return (
                      <li key={to}>
                        <Link
                          to={to}
                          className={cn(
                            'flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition focus-visible:outline-none',
                            'text-[color:var(--color-text-secondary)] hover-surface-tint hover:text-[color:var(--nav-hover-text)]',
                            isActive &&
                              'bg-[color:var(--color-text-primary)] text-[color:var(--color-background)] shadow-subtle hover:text-[color:var(--nav-active-hover-text)]'
                          )}
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <span
                            className="flex h-9 w-9 items-center justify-center rounded-2xl"
                            style={{
                              backgroundColor:
                                'rgba(var(--color-background-rgb), 0.08)',
                            }}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="flex-1 text-left">{label}</span>
                        </Link>
                      </li>
                    );
                  })}

                  {/* Printing section */}
                  <li className="pt-2">
                    <div className="px-3.5 py-1">
                      <span
                        className="text-xs font-semibold uppercase tracking-wide"
                        style={{ color: 'var(--color-text-tertiary)' }}
                      >
                        Printing
                      </span>
                    </div>
                  </li>
                  {printingItems.map(({ label, to, icon: Icon }) => {
                    const isActive = pathname.startsWith(to);
                    return (
                      <li key={to}>
                        <Link
                          to={to}
                          className={cn(
                            'flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition focus-visible:outline-none',
                            'text-[color:var(--color-text-secondary)] hover-surface-tint hover:text-[color:var(--nav-hover-text)]',
                            isActive &&
                              'bg-[color:var(--color-text-primary)] text-[color:var(--color-background)] shadow-subtle hover:text-[color:var(--nav-active-hover-text)]'
                          )}
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <span
                            className="flex h-9 w-9 items-center justify-center rounded-2xl"
                            style={{
                              backgroundColor:
                                'rgba(var(--color-background-rgb), 0.08)',
                            }}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="flex-1 text-left">{label}</span>
                        </Link>
                      </li>
                    );
                  })}

                  {/* Shooting section commented out - Reciprocity moved to main nav */}
                  {/* <li className="pt-2">
                    <div className="px-3.5 py-1">
                      <span
                        className="text-xs font-semibold uppercase tracking-wide"
                        style={{ color: 'var(--color-text-tertiary)' }}
                      >
                        Shooting
                      </span>
                    </div>
                  </li>
                  {shootingItems.map(({ label, to, icon: Icon }) => {
                    const isActive = pathname.startsWith(to);
                    return (
                      <li key={to}>
                        <Link
                          to={to}
                          className={cn(
                            'flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition focus-visible:outline-none',
                            'text-[color:var(--color-text-secondary)] hover-surface-tint hover:text-[color:var(--color-text-primary)]',
                            isActive &&
                              'bg-[color:var(--color-text-primary)] text-[color:var(--color-background)] shadow-subtle'
                          )}
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <span
                            className="flex h-9 w-9 items-center justify-center rounded-2xl"
                            style={{
                              backgroundColor:
                                'rgba(var(--color-background-rgb), 0.08)',
                            }}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="flex-1 text-left">{label}</span>
                        </Link>
                      </li>
                    );
                  })} */}
                  <li>
                    <ThemeToggle variant="button" />
                  </li>
                  <li>
                    {(() => {
                      const isActive = pathname === '/settings';
                      return (
                        <Link
                          to="/settings"
                          className={cn(
                            'flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition focus-visible:outline-none',
                            'text-[color:var(--color-text-secondary)] hover-surface-tint hover:text-[color:var(--nav-hover-text)]',
                            isActive &&
                              'bg-[color:var(--color-text-primary)] text-[color:var(--color-background)] shadow-subtle hover:text-[color:var(--nav-active-hover-text)]'
                          )}
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <span
                            className="flex h-9 w-9 items-center justify-center rounded-2xl"
                            style={{
                              backgroundColor:
                                'rgba(var(--color-background-rgb), 0.08)',
                            }}
                          >
                            <Settings className="h-4 w-4" />
                          </span>
                          <span className="flex-1 text-left">Settings</span>
                        </Link>
                      );
                    })()}
                  </li>
                </ul>
              </div>
            </nav>
          </>
        )}

        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});
