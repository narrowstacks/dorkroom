import { useState, useEffect, ReactNode } from 'react';
import { Menu, X } from 'lucide-react';
import type { ContentNode, BreadcrumbItem } from '@dorkroom/logic';
import { SidebarNavigation } from './sidebar-navigation';
import { SearchBar } from './search-bar';

export type { ContentNode, BreadcrumbItem };

interface InfobaseLayoutProps {
  tree: ContentNode[];
  onSearch: (query: string) => void;
  children: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  expandedNodes?: Set<string>;
  onToggleNode?: (slug: string) => void;
}

export function InfobaseLayout({
  tree,
  onSearch,
  children,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  breadcrumbs,
  expandedNodes,
  onToggleNode,
}: InfobaseLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  // Detect theme and determine if animations should be enabled
  useEffect(() => {
    const theme = document.documentElement.getAttribute('data-theme');
    // Only animate for light and dark themes, not darkroom or high-contrast
    setShouldAnimate(theme === 'light' || theme === 'dark');

    // Listen for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
          const newTheme = document.documentElement.getAttribute('data-theme');
          setShouldAnimate(newTheme === 'light' || newTheme === 'dark');
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl">
      {/* Sidebar - Desktop */}
      <aside
        className="sticky top-16 hidden w-64 flex-shrink-0 self-start overflow-y-auto border-r py-6 pl-6 pr-4 lg:block"
        style={{
          borderColor: 'var(--color-border-secondary)',
          maxHeight: 'calc(100vh - 4rem)',
        }}
      >
        <div className="space-y-4">
          <h2
            className="text-lg font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Infobase
          </h2>
          <SearchBar onSearch={onSearch} placeholder="Search pages..." />
          <SidebarNavigation
            tree={tree}
            expandedNodes={expandedNodes}
            onToggleNode={onToggleNode}
          />
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {isSidebarOpen && (
        <>
          <div
            className={`fixed inset-0 z-50 bg-black/50 lg:hidden ${
              shouldAnimate ? 'animate-fade-in' : ''
            }`}
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside
            className={`fixed inset-y-0 left-0 z-50 w-64 overflow-y-auto p-6 lg:hidden ${
              shouldAnimate ? 'animate-slide-in-from-left' : ''
            }`}
            style={{
              backgroundColor: 'var(--color-background)',
              borderRightWidth: 1,
              borderColor: 'var(--color-border-secondary)',
            }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2
                className="text-lg font-semibold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Infobase
              </h2>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="rounded-full p-2"
                style={{ color: 'var(--color-text-secondary)' }}
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <SearchBar onSearch={onSearch} placeholder="Search pages..." />
              <SidebarNavigation
                tree={tree}
                expandedNodes={expandedNodes}
                onToggleNode={onToggleNode}
              />
            </div>
          </aside>
        </>
      )}

      {/* Main Content */}
      <main className="flex-1 px-6 py-6 lg:px-10">
        {/* Mobile Sidebar Toggle Button */}
        <button
          type="button"
          onClick={() => setIsSidebarOpen(true)}
          className="mb-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition lg:hidden"
          style={{
            color: 'var(--color-text-primary)',
            backgroundColor: 'rgba(var(--color-background-rgb), 0.5)',
            borderColor: 'var(--color-border-secondary)',
            borderWidth: 1,
          }}
          aria-label="Open navigation"
        >
          <Menu className="h-4 w-4" />
          <span>Navigation</span>
        </button>
        {children}
      </main>
    </div>
  );
}
