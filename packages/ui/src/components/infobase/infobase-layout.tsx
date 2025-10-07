import { useState, ReactNode } from 'react';
import { Menu, X } from 'lucide-react';
import type { ContentNode, BreadcrumbItem } from '@dorkroom/logic';
import { SidebarNavigation } from './sidebar-navigation';
import { SearchBar } from './search-bar';
import { BreadcrumbNav } from './breadcrumb-nav';

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
  breadcrumbs,
  expandedNodes,
  onToggleNode,
}: InfobaseLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

      {/* Mobile Sidebar Toggle */}
      <button
        type="button"
        onClick={() => setIsSidebarOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full shadow-lg lg:hidden"
        style={{
          backgroundColor: 'var(--color-text-primary)',
          color: 'var(--color-background)',
        }}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile Sidebar */}
      {isSidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside
            className="fixed inset-y-0 left-0 z-50 w-64 overflow-y-auto p-6 lg:hidden"
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
      <main className="flex-1 px-6 py-6 lg:px-10">{children}</main>
    </div>
  );
}
