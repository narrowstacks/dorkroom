import { useEffect, useState } from 'react';
import {
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import {
  Aperture,
  Beaker,
  BookOpen,
  Camera,
  Crop,
  Gauge,
  Home,
  Menu,
  Printer,
  Ruler,
  Settings,
  Timer,
  X,
} from 'lucide-react';
import { cn } from './lib/cn';
import { NavigationDropdown, NavigationItem } from '@dorkroom/ui';
import HomePage from './pages/home-page';
import BorderCalculatorPage from './pages/border-calculator/border-calculator-page';
import ResizeCalculatorPage from './pages/resize-calculator/resize-calculator-page';
import ReciprocityCalculatorPage from './pages/reciprocity-calculator/reciprocity-calculator-page';
import ExposureCalculatorPage from './pages/exposure-calculator/exposure-calculator-page';
import DevelopmentRecipesPage from './pages/development-recipes/development-recipes-page';
import SettingsPage from './pages/settings-page';

// Individual navigation items for dropdown groups
const printingItems: NavigationItem[] = [
  {
    label: 'Border',
    to: '/border',
    icon: Crop,
    summary: 'Trim-safe borders with print guides.',
  },
  {
    label: 'Resize',
    to: '/resize',
    icon: Ruler,
    summary: 'Scale prints without endless test strips.',
  },
  {
    label: 'Stops',
    to: '/stops',
    icon: Gauge,
    summary: 'Translate exposure stops into seconds.',
  },
];

const shootingItems: NavigationItem[] = [
  {
    label: 'Exposure',
    to: '/exposure',
    icon: Aperture,
    summary: 'Balance aperture, shutter, and ISO on set.',
  },
  {
    label: 'Reciprocity',
    to: '/reciprocity',
    icon: Timer,
    summary: 'Correct for long exposure failure.',
  },
  {
    label: 'Infobase',
    to: '/infobase',
    icon: BookOpen,
    summary: 'Reference tables, notes, and recipes.',
  },
];

// Navigation structure for rendering
const navItems = [
  {
    label: 'Home',
    to: '/',
    icon: Home,
    summary: 'Skip the math. Make prints.',
  },
  {
    label: 'Development',
    to: '/development',
    icon: Beaker,
    summary: 'Film chemistry pairings with proven results.',
  },
];

// All navigation items combined for backward compatibility
const allNavItems = [...navItems, ...printingItems, ...shootingItems];

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Home',
  '/border': 'Border Calculator',
  '/resize': 'Print Resize Calculator',
  '/reciprocity': 'Reciprocity Failure Calculator',
  '/stops': 'Stops Calculator',
  '/exposure': 'Exposure Calculator',
  '/development': 'Development Recipes',
  '/infobase': 'Infobase',
  '/settings': 'Settings',
};

function PlaceholderPage({
  title,
  summary,
}: {
  title: string;
  summary: string;
}) {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-24 text-center sm:px-10">
      <div
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed text-lg font-semibold"
        style={{
          borderColor: 'var(--color-border-secondary)',
          backgroundColor: 'rgba(var(--color-background-rgb), 0.05)',
          color: 'var(--color-text-secondary)',
        }}
      >
        Soon
      </div>
      <div className="space-y-3">
        <h1
          className="text-3xl font-semibold tracking-tight sm:text-4xl"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {title}
        </h1>
        <p className="text-base text-zinc-300">{summary}</p>
        <div></div>
        <p className="text-base text-zinc-300">
          We&apos;re still working on this page.
        </p>
        <div></div>
        <p className="text-base text-zinc-300">
          Check back shortly or head to another tool.
        </p>
      </div>
      <div className="flex justify-center">
        <Link
          to="/"
          className="rounded-full px-5 py-2 text-sm font-medium transition"
          style={{
            color: 'var(--color-text-primary)',
            borderColor: 'var(--color-border-secondary)',
            borderWidth: 1,
            backgroundColor: 'transparent',
          }}
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}

export function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const normalisedPath = location.pathname.replace(/\/+$/, '') || '/';
    const pageTitle =
      ROUTE_TITLES[normalisedPath] ||
      allNavItems.find((item) => item.to === normalisedPath)?.label ||
      'Dorkroom';
    document.title =
      pageTitle === 'Dorkroom' ? 'Dorkroom' : `${pageTitle} - Dorkroom`;
  }, [location.pathname]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

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
                className="flex h-9 w-9 items-center justify-center rounded-2xl text-lg font-semibold"
                style={{
                  backgroundColor: 'rgba(var(--color-background-rgb), 0.1)',
                }}
              >
                D
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
                {navItems.map(({ label, to, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) =>
                      cn(
                        'flex min-w-fit items-center gap-2 rounded-full px-4 py-2 font-medium transition focus-visible:outline-none',
                        'focus-visible:ring-2',
                        'focus-visible:ring-[color:var(--color-border-primary)]',
                        'text-[color:var(--color-text-tertiary)] hover:text-[color:var(--color-text-secondary)]',
                        isActive &&
                          'bg-[color:var(--color-text-primary)] text-[color:var(--color-background)] shadow-subtle hover:text-[color:var(--color-background)]'
                      )
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </NavLink>
                ))}
                <NavigationDropdown
                  label="Printing"
                  icon={Printer}
                  items={printingItems}
                  currentPath={location.pathname}
                  onNavigate={navigate}
                />
                <NavigationDropdown
                  label="Shooting"
                  icon={Camera}
                  items={shootingItems}
                  currentPath={location.pathname}
                  onNavigate={navigate}
                />
              </div>
            </nav>
            <div className="hidden items-center gap-3 sm:flex">
              <a
                href="https://github.com/dorkroom"
                target="_blank"
                rel="noreferrer"
                className="rounded-full px-4 py-2 text-sm font-medium transition"
                style={{
                  color: 'var(--color-text-primary)',
                  borderColor: 'var(--color-border-secondary)',
                  borderWidth: 1,
                  backgroundColor: 'transparent',
                }}
              >
                Contribute
              </a>
              <Link
                to="/settings"
                className="flex h-9 w-9 items-center justify-center rounded-full transition focus-visible:outline-none"
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
            // Flip colors: use light colors in dark mode, dark colors in light mode
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
                  {navItems.map(({ label, to, icon: Icon }) => (
                    <li key={to}>
                      <NavLink
                        to={to}
                        end={to === '/'}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition focus-visible:outline-none',
                            'text-[color:var(--color-text-secondary)] hover:bg-[color:var(--color-border-muted)] hover:text-[color:var(--color-text-primary)]',
                            isActive &&
                              'bg-[color:var(--color-text-primary)] text-[color:var(--color-background)] shadow-subtle'
                          )
                        }
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
                      </NavLink>
                    </li>
                  ))}

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
                  {printingItems.map(({ label, to, icon: Icon }) => (
                    <li key={to}>
                      <NavLink
                        to={to}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition focus-visible:outline-none',
                            'text-[color:var(--color-text-secondary)] hover:bg-[color:var(--color-border-muted)] hover:text-[color:var(--color-text-primary)]',
                            isActive &&
                              'bg-[color:var(--color-text-primary)] text-[color:var(--color-background)] shadow-subtle'
                          )
                        }
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
                      </NavLink>
                    </li>
                  ))}

                  {/* Shooting section */}
                  <li className="pt-2">
                    <div className="px-3.5 py-1">
                      <span
                        className="text-xs font-semibold uppercase tracking-wide"
                        style={{ color: 'var(--color-text-tertiary)' }}
                      >
                        Shooting
                      </span>
                    </div>
                  </li>
                  {shootingItems.map(({ label, to, icon: Icon }) => (
                    <li key={to}>
                      <NavLink
                        to={to}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition focus-visible:outline-none',
                            'text-[color:var(--color-text-secondary)] hover:bg-[color:var(--color-border-muted)] hover:text-[color:var(--color-text-primary)]',
                            isActive &&
                              'bg-[color:var(--color-text-primary)] text-[color:var(--color-background)] shadow-subtle'
                          )
                        }
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
                      </NavLink>
                    </li>
                  ))}
                  <li>
                    <NavLink
                      to="/settings"
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition focus-visible:outline-none',
                          'text-[color:var(--color-text-secondary)] hover:bg-[color:var(--color-border-muted)] hover:text-[color:var(--color-text-primary)]',
                          isActive &&
                            'bg-[color:var(--color-text-primary)] text-[color:var(--color-background)] shadow-subtle'
                        )
                      }
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
                    </NavLink>
                  </li>
                </ul>
              </div>
            </nav>
          </>
        )}

        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/border" element={<BorderCalculatorPage />} />
            <Route path="/resize" element={<ResizeCalculatorPage />} />
            <Route path="/stops" element={<ExposureCalculatorPage />} />
            <Route
              path="/reciprocity"
              element={<ReciprocityCalculatorPage />}
            />
            <Route path="/development" element={<DevelopmentRecipesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            {allNavItems
              .filter(
                (item) =>
                  ![
                    '/',
                    '/border',
                    '/resize',
                    '/stops',
                    '/reciprocity',
                    '/development',
                  ].includes(item.to)
              )
              .map((item) => (
                <Route
                  key={item.to}
                  path={item.to}
                  element={
                    <PlaceholderPage
                      title={item.label}
                      summary={item.summary}
                    />
                  }
                />
              ))}
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
