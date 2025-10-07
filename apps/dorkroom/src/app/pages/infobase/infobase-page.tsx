/**
 * Infobase Page - MDX-based wiki system with automated content loading
 */

import { useState, useMemo, Suspense } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { MDXProvider } from '@mdx-js/react';
import { Loader2 } from 'lucide-react';
import { InfobaseLayout } from '@dorkroom/ui';
import {
  buildContentTree,
  getBreadcrumbs,
  searchPages,
  ContentNode,
} from '../../lib/mdx-loader';
import { loadMDXPages } from '../../lib/mdx-auto-loader';
import { InfobaseProvider } from '../../contexts/infobase-context';
import { mdxComponents } from '../../components/mdx-components';

// Import database pages
import { FilmDataPage } from './film-data-page';
import { DeveloperDataPage } from './developer-data-page';

// Page registry types
type MDXPageEntry = {
  type: 'mdx';
  slug: string;
  path: string;
  Component: React.ComponentType;
  frontmatter: {
    title?: string;
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

type PageEntry = MDXPageEntry | DatabasePageEntry;

// Load MDX pages automatically
const mdxPages = loadMDXPages();

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

export default function InfobasePage() {
  return (
    <InfobaseProvider>
      <InfobaseContent />
    </InfobaseProvider>
  );
}

function InfobaseContent() {
  const { '*': slugParam } = useParams();
  const slug = slugParam || 'films/index';
  const [searchQuery, setSearchQuery] = useState('');

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
  const breadcrumbs = useMemo(() => {
    if (currentPage?.type === 'mdx') {
      return getBreadcrumbs(currentPage.slug, mdxPages);
    }
    return [];
  }, [currentPage]);

  // Filter pages by search query
  const filteredTree = useMemo(() => {
    if (!searchQuery) return contentTree;

    const filtered = searchPages(mdxPages, searchQuery);
    return buildContentTree(filtered);
  }, [contentTree, searchQuery]);

  // Redirect to default page if no match
  if (!currentPage) {
    return <Navigate to="/infobase/films" replace />;
  }

  // Render database pages
  if (currentPage.type === 'database') {
    const { Component } = currentPage;
    return (
      <InfobaseLayout
        tree={filteredTree}
        onSearch={setSearchQuery}
        breadcrumbs={undefined}
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
    >
      <div className="mx-auto max-w-3xl space-y-6">
        {/* MDX Content */}
        <article
          className="prose prose-invert max-w-none"
          style={{ color: 'var(--color-text-primary)' }}
        >
          <MDXProvider components={mdxComponents}>
            <Suspense
              fallback={
                <div className="flex items-center justify-center py-12">
                  <Loader2
                    className="h-8 w-8 animate-spin"
                    style={{ color: 'var(--color-text-secondary)' }}
                  />
                </div>
              }
            >
              <PageComponent />
            </Suspense>
          </MDXProvider>
        </article>
      </div>
    </InfobaseLayout>
  );
}
