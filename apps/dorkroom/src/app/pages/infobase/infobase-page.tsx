/**
 * Infobase Page - MDX-based wiki system with automated content loading
 */

import {
  useState,
  useMemo,
  Suspense,
  useEffect,
  useRef,
  type ReactElement,
} from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { MDXProvider } from '@mdx-js/react';
import { Loader2 } from 'lucide-react';
import { InfobaseLayout, BreadcrumbNav } from '@dorkroom/ui';
import {
  buildContentTree,
  getBreadcrumbs,
  searchPages,
  ContentNode,
} from '../../lib/mdx-loader';
import { loadMDXPages } from '../../lib/mdx-auto-loader';
import { InfobaseProvider } from '../../contexts/infobase-context';
import { mdxComponents } from '../../components/mdx-components';
import { useDebounce } from '@dorkroom/logic';
import { MDXErrorBoundary } from '../../components/mdx-error-boundary';

// Import database pages
import { FilmDataPage } from './film-data-page';
import { DeveloperDataPage } from './developer-data-page';

// Page registry types
type MDXPageEntry = {
  slug: string;
  path: string;
  Component: React.ComponentType;
  frontmatter: {
    title: string;
    category?: string;
    [key: string]: unknown;
  };
};

type DatabasePageEntry = {
  type: 'database';
  slug: string;
  path: string;
  Component: React.ComponentType;
  name: string;
  icon?: string;
  databaseType: string;
};

type PageEntry = ({ type: 'mdx' } & MDXPageEntry) | DatabasePageEntry;

// Load MDX pages automatically
const mdxPages: MDXPageEntry[] = loadMDXPages() as MDXPageEntry[];

// Database page definitions
const databasePages: DatabasePageEntry[] = [
  {
    type: 'database',
    slug: 'film-data',
    path: '/infobase/film-data',
    Component: FilmDataPage,
    name: 'Film Data',
    icon: '🎞️',
    databaseType: 'films',
  },
  {
    type: 'database',
    slug: 'developer-data',
    path: '/infobase/developer-data',
    Component: DeveloperDataPage,
    name: 'Developer Data',
    icon: '🧪',
    databaseType: 'developers',
  },
];

// Unified page registry
const pageRegistry: Record<string, PageEntry> = {};

// Add MDX pages to registry
mdxPages.forEach((page) => {
  pageRegistry[page.slug] = { type: 'mdx', ...page };
});

// Add database pages to registry
databasePages.forEach((page) => {
  pageRegistry[page.slug] = page;
});

export default function InfobasePage(): ReactElement {
  return (
    <InfobaseProvider>
      <InfobaseContent />
    </InfobaseProvider>
  );
}

function InfobaseContent(): ReactElement {
  const { '*': slugParam } = useParams();
  const slug = slugParam || 'index';
  const [searchQuery, setSearchQuery] = useState('');
  const articleRef = useRef<HTMLElement>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Debounce search query to prevent UI lag during typing
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Toggle node expansion state
  const handleToggleNode = (nodeSlug: string): void => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeSlug)) {
        next.delete(nodeSlug);
      } else {
        next.add(nodeSlug);
      }
      return next;
    });
  };

  // Handle navigation - used to close mobile sidebar when user navigates
  const handleNavigate = (): void => {
    // Mobile sidebar will be closed by InfobaseLayout
    // This callback is for any additional navigation-related actions
  };

  // Build content tree for navigation with database nodes
  const contentTree = useMemo(() => {
    const mdxTree = buildContentTree(mdxPages);

    // Add database nodes at root level
    const databaseNodes: ContentNode[] = databasePages.map((page) => ({
      type: 'database' as const,
      name: page.name,
      path: page.path,
      slug: page.slug,
      icon: page.icon,
      databaseType: page.databaseType as 'films' | 'developers',
    }));

    return [...databaseNodes, ...mdxTree];
  }, []);

  // Get current page from unified registry
  // Note: pageRegistry is a stable module-level object
  const currentPage = useMemo(() => {
    // Try exact match first
    let page = pageRegistry[slug];

    // Try with /index appended for folder navigation
    if (!page) {
      page = pageRegistry[`${slug}/index`];
    }

    return page;
  }, [slug]);

  // Get breadcrumbs for MDX pages
  // Note: mdxPages is a stable module-level constant loaded once at module initialization
  const breadcrumbs = useMemo(() => {
    if (currentPage?.type === 'mdx') {
      return getBreadcrumbs(currentPage.slug, mdxPages);
    }
    return [];
  }, [currentPage]);

  // Filter pages by search query (using debounced value)
  const filteredTree = useMemo(() => {
    if (!debouncedSearchQuery) return contentTree;

    // Filter MDX pages and build tree
    const filteredMDXPages = searchPages(mdxPages, debouncedSearchQuery);
    const filteredMDXTree = buildContentTree(filteredMDXPages);

    // Extract database nodes from original contentTree
    const databaseNodes = contentTree.filter(
      (node) => node.type === 'database'
    );

    // Optionally filter database nodes by name matching search query
    const normalizedQuery = debouncedSearchQuery.toLowerCase().trim();
    const filteredDatabaseNodes = databaseNodes.filter((node) =>
      node.name.toLowerCase().includes(normalizedQuery)
    );

    // Merge database nodes with filtered MDX tree
    return [...filteredDatabaseNodes, ...filteredMDXTree];
  }, [contentTree, debouncedSearchQuery]);

  // Focus management: Move focus to article on page navigation
  // This is necessary because we use useEffect here to handle async page loads
  useEffect(() => {
    if (currentPage && articleRef.current) {
      // Small delay to ensure content is rendered
      const timeoutId = setTimeout(() => {
        // Set tabIndex to allow focus, then focus the element
        if (articleRef.current) {
          articleRef.current.tabIndex = -1;
          articleRef.current.focus();
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [currentPage]);

  // Redirect to default page if no match
  if (!currentPage) {
    return <Navigate to="/infobase/index" replace />;
  }

  // Render database pages
  if (currentPage.type === 'database') {
    const { Component } = currentPage;
    return (
      <InfobaseLayout
        tree={filteredTree}
        onSearch={setSearchQuery}
        breadcrumbs={undefined}
        expandedNodes={expandedNodes}
        onToggleNode={handleToggleNode}
        onNavigate={handleNavigate}
      >
        <Component />
      </InfobaseLayout>
    );
  }

  // Render MDX pages
  const { Component: PageComponent } = currentPage;

  return (
    <InfobaseLayout
      tree={filteredTree}
      onSearch={setSearchQuery}
      breadcrumbs={breadcrumbs}
      expandedNodes={expandedNodes}
      onToggleNode={handleToggleNode}
      onNavigate={handleNavigate}
    >
      <div className="mx-auto max-w-3xl space-y-6">
        {/* MDX Content */}
        <div className="mdx-content-container">
          {/* Breadcrumbs */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <div className="mb-6">
              <BreadcrumbNav items={breadcrumbs} />
            </div>
          )}

          <article
            ref={articleRef}
            className="prose prose-invert max-w-none"
            style={{ color: 'var(--color-text-primary)' }}
          >
            <MDXProvider components={mdxComponents}>
              <MDXErrorBoundary>
                <Suspense
                  fallback={
                    <div
                      role="status"
                      className="flex items-center justify-center py-12"
                    >
                      <Loader2
                        className="h-8 w-8 animate-spin"
                        style={{ color: 'var(--color-text-secondary)' }}
                      />
                      <span className="sr-only">Loading content...</span>
                    </div>
                  }
                >
                  <PageComponent />
                </Suspense>
              </MDXErrorBoundary>
            </MDXProvider>
          </article>
        </div>
      </div>
    </InfobaseLayout>
  );
}
