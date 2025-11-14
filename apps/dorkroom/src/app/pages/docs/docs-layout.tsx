import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, PanelLeftClose, PanelLeft } from 'lucide-react';
import { docsNavigation } from './docs-manifest';

interface DocsLayoutProps {
  children: React.ReactNode;
}

export default function DocsLayout({ children }: DocsLayoutProps) {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: 'var(--color-background)',
        color: 'var(--color-text-primary)',
      }}
    >
      <div className="backdrop-gradient min-h-screen">
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <>
            <div
              className="fixed inset-0 z-40 h-screen min-h-dvh backdrop-blur-sm transition-opacity md:hidden"
              style={{
                backgroundColor: 'rgba(var(--color-background-rgb), 0.6)',
              }}
              aria-hidden="true"
              onClick={() => setIsSidebarOpen(false)}
            />
            <div
              className="fixed left-0 top-0 z-40 h-screen min-h-dvh w-72 border-r p-6 md:hidden"
              role="dialog"
              aria-modal="true"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                borderColor: 'var(--color-border-secondary)',
              }}
            >
              <nav className="mt-16 space-y-6">
                {docsNavigation.map((group) => (
                  <div key={group.title || 'home'}>
                    {group.title && (
                      <div className="mb-3 px-2">
                        <span
                          className="text-xs font-semibold uppercase tracking-wider"
                          style={{ color: 'var(--color-text-tertiary)' }}
                        >
                          {group.title}
                        </span>
                      </div>
                    )}
                    <div className={`space-y-1 ${!group.title ? 'mb-6' : ''}`}>
                      {group.items.map((item) => (
                        <Link
                          key={item.href}
                          to={item.href}
                          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline-none ${
                            location.pathname === item.href
                              ? 'bg-[rgba(255,255,255,0.15)] text-[color:var(--color-text-primary)]'
                              : 'text-[color:var(--color-text-secondary)] hover:bg-[rgba(255,255,255,0.08)] hover:text-[color:var(--color-text-primary)]'
                          }`}
                          onClick={() => setIsSidebarOpen(false)}
                        >
                          <span className="flex-1">{item.title}</span>
                          {location.pathname === item.href && (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </nav>
            </div>
          </>
        )}

        <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:gap-8 lg:px-8 lg:py-8">
          {/* Sidebar Toggle Button */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="fixed left-4 top-24 z-50 flex h-10 w-10 items-center justify-center rounded-lg border transition hover:bg-[var(--color-surface)] focus-visible:outline-none"
            style={{
              backgroundColor: 'rgba(var(--color-background-rgb), 0.95)',
              borderColor: 'var(--color-border-secondary)',
              color: 'var(--color-text-primary)',
            }}
            aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            {isSidebarOpen ? (
              <PanelLeftClose className="h-5 w-5" />
            ) : (
              <PanelLeft className="h-5 w-5" />
            )}
          </button>

          {/* Desktop Sidebar */}
          {isSidebarOpen && (
            <aside className="hidden w-60 shrink-0 md:block lg:w-64">
              <div
                className="sticky overflow-y-auto rounded-lg"
                style={{
                  top: 'calc(env(safe-area-inset-top) + 5rem + 1rem)',
                  maxHeight: 'calc(100vh - env(safe-area-inset-top) - 5rem - 3rem)',
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                }}
              >
                <nav className="space-y-6 p-4 pr-2">
                  {docsNavigation.map((group) => (
                    <div key={group.title || 'home'}>
                      {group.title && (
                        <div
                          className="mb-3 text-xs font-semibold uppercase tracking-wider"
                          style={{ color: 'var(--color-text-tertiary)' }}
                        >
                          {group.title}
                        </div>
                      )}
                      <ul className={`space-y-1 ${!group.title ? 'mb-6' : ''}`}>
                        {group.items.map((item) => (
                          <li key={item.href}>
                            <Link
                              to={item.href}
                              className={`block rounded-lg px-3 py-1.5 text-sm transition-colors ${
                                location.pathname === item.href
                                  ? 'font-semibold'
                                  : 'font-normal'
                              }`}
                              style={{
                                backgroundColor:
                                  location.pathname === item.href
                                    ? 'rgba(255, 255, 255, 0.15)'
                                    : 'transparent',
                                color:
                                  location.pathname === item.href
                                    ? 'var(--color-text-primary)'
                                    : 'var(--color-text-secondary)',
                              }}
                              onMouseEnter={(e) => {
                                if (location.pathname !== item.href) {
                                  e.currentTarget.style.backgroundColor =
                                    'rgba(255, 255, 255, 0.08)';
                                  e.currentTarget.style.color =
                                    'var(--color-text-primary)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (location.pathname !== item.href) {
                                  e.currentTarget.style.backgroundColor =
                                    'transparent';
                                  e.currentTarget.style.color =
                                    'var(--color-text-secondary)';
                                }
                              }}
                            >
                              {item.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </nav>
              </div>
            </aside>
          )}

          {/* Main Content */}
          <main
            className={`min-w-0 flex-1 ${isSidebarOpen ? 'ml-0' : 'ml-16'}`}
          >
            <div
              className="mx-auto max-w-3xl rounded-lg p-6 sm:p-8"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
              }}
            >
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
