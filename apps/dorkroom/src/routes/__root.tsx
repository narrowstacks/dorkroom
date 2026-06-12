import {
  allNavItems,
  NavigationDropdown,
  navigationCategories,
  ROUTE_TITLES,
  ThemeToggle,
  Tooltip,
} from '@dorkroom/ui';
import {
  createRootRoute,
  HeadContent,
  Link,
  Outlet,
  useRouter,
  useRouterState,
} from '@tanstack/react-router';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Beaker, GitBranch, Home, Newspaper, Settings } from 'lucide-react';
import { useEffect } from 'react';
import { cn } from '../app/lib/cn';
import { MobileNav } from '../components/mobile-nav';

function RootComponent() {
  const router = useRouter();
  const routerState = useRouterState();
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

  const handleNavigate = (path: string) => {
    router.navigate({ to: path });
  };

  // Get the deepest matched route's path pattern for Speed Insights tracking
  const routePattern =
    routerState.matches[routerState.matches.length - 1]?.fullPath ?? pathname;

  return (
    <>
      <SpeedInsights route={routePattern} />
      <HeadContent />
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
                  className="flex size-9 items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor: 'rgba(var(--color-background-rgb), 0.1)',
                  }}
                >
                  <Beaker className="size-10" />
                </span>
                <span
                  className="hidden text-2xl font-semibold tracking-tight sm:block"
                  style={{ fontFamily: 'var(--font-family-display)' }}
                >
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
                  <Link
                    to="/"
                    className={cn(
                      'flex min-w-fit items-center gap-2 rounded-full px-4 py-2 font-medium transition focus-visible:outline-none',
                      'focus-visible:ring-2',
                      'focus-visible:ring-[color:var(--color-border-primary)]',
                      'text-[color:var(--color-text-tertiary)] hover:text-[color:var(--nav-hover-text)]',
                      pathname === '/' &&
                        'bg-[color:var(--color-text-primary)] text-[color:var(--color-background)] shadow-subtle hover:text-[color:var(--nav-active-hover-text)]'
                    )}
                  >
                    <Home className="size-4" />
                    Home
                  </Link>
                  {navigationCategories.map((category) => (
                    <NavigationDropdown
                      key={category.label}
                      label={category.label}
                      icon={category.icon}
                      items={category.items}
                      currentPath={pathname}
                      onNavigate={handleNavigate}
                    />
                  ))}
                </div>
              </nav>
              <div className="hidden items-center gap-3 sm:flex">
                <Tooltip label="Contribute on GitHub">
                  <a
                    href="https://github.com/narrowstacks/dorkroom"
                    target="_blank"
                    rel="noreferrer"
                    className="nav-button flex size-9 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-border-primary)]"
                    style={{
                      color: 'var(--color-text-primary)',
                      borderColor: 'var(--color-border-secondary)',
                      borderWidth: 1,
                      backgroundColor: 'transparent',
                    }}
                    aria-label="Contribute on GitHub"
                  >
                    <GitBranch className="size-4" />
                  </a>
                </Tooltip>
                <Tooltip label="Newsletter">
                  <a
                    href="https://news.dorkroom.art"
                    target="_blank"
                    rel="noreferrer"
                    className="nav-button flex size-9 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-border-primary)]"
                    style={{
                      color: 'var(--color-text-primary)',
                      borderColor: 'var(--color-border-secondary)',
                      borderWidth: 1,
                      backgroundColor: 'transparent',
                    }}
                    aria-label="Newsletter"
                  >
                    <Newspaper className="size-4" />
                  </a>
                </Tooltip>
                <Tooltip label="Themes">
                  <ThemeToggle variant="icon" />
                </Tooltip>
                <Tooltip label="Settings">
                  <Link
                    to="/settings"
                    className="nav-button flex size-9 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-border-primary)]"
                    style={{
                      color: 'var(--color-text-primary)',
                      borderColor: 'var(--color-border-secondary)',
                      borderWidth: 1,
                      backgroundColor: 'transparent',
                    }}
                    aria-label="Settings"
                  >
                    <Settings className="size-4" />
                  </Link>
                </Tooltip>
              </div>
            </div>
          </header>

          <MobileNav pathname={pathname} onNavigate={handleNavigate} />

          <main>
            <Outlet />
          </main>
        </div>
      </div>
    </>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
});
