/**
 * Infobase Page - MDX-based wiki system
 */

import { useState, useMemo, Suspense } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { MDXProvider } from '@mdx-js/react';
import { Menu, X, Loader2 } from 'lucide-react';
import { SidebarNavigation, BreadcrumbNav, SearchBar } from '@dorkroom/ui';
import {
  buildContentTree,
  getBreadcrumbs,
  searchPages,
} from '../../lib/mdx-loader';
import { InfobaseProvider } from '../../contexts/infobase-context';
import { mdxComponents } from '../../components/mdx-components';

// Import index pages
import FilmsIndex from '../../../content/films/index.mdx';
import DevelopersIndex from '../../../content/developers/index.mdx';
import RecipesIndex from '../../../content/recipes/index.mdx';
import GuidesIndex from '../../../content/guides/index.mdx';

// Import example content
import KodakTriX from '../../../content/films/kodak-tri-x-400.mdx';
import KodakD76 from '../../../content/developers/kodak-d76.mdx';

// MDX pages registry
const mdxPages = [
  {
    slug: 'films/index',
    path: '/infobase/films',
    Component: FilmsIndex,
    frontmatter: { title: 'Films', category: 'films' },
  },
  {
    slug: 'films/kodak-tri-x-400',
    path: '/infobase/films/kodak-tri-x-400',
    Component: KodakTriX,
    frontmatter: { title: 'Kodak Tri-X 400', category: 'films' },
  },
  {
    slug: 'developers/index',
    path: '/infobase/developers',
    Component: DevelopersIndex,
    frontmatter: { title: 'Developers', category: 'developers' },
  },
  {
    slug: 'developers/kodak-d76',
    path: '/infobase/developers/kodak-d76',
    Component: KodakD76,
    frontmatter: { title: 'Kodak D-76', category: 'developers' },
  },
  {
    slug: 'recipes/index',
    path: '/infobase/recipes',
    Component: RecipesIndex,
    frontmatter: { title: 'Recipes', category: 'recipes' },
  },
  {
    slug: 'guides/index',
    path: '/infobase/guides',
    Component: GuidesIndex,
    frontmatter: { title: 'Guides', category: 'guides' },
  },
];

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Build content tree for navigation
  const contentTree = useMemo(() => buildContentTree(mdxPages), []);

  // Get current page
  // mdxPages is a stable module-level constant - no need in deps
  const currentPage = useMemo(() => {
    // Try exact match first
    let page = mdxPages.find((p) => p.slug === slug);

    // Try with /index appended
    if (!page) {
      page = mdxPages.find((p) => p.slug === `${slug}/index`);
    }

    return page;
  }, [slug]);

  // Get breadcrumbs
  const breadcrumbs = useMemo(
    () => (currentPage ? getBreadcrumbs(currentPage.slug, mdxPages) : []),
    [currentPage]
  );

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

  const PageComponent = currentPage.Component;

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl">
      {/* Sidebar - Desktop */}
      <aside
        className="sticky top-0 hidden h-screen w-64 flex-shrink-0 overflow-y-auto border-r py-6 pl-6 pr-4 lg:block"
        style={{ borderColor: 'var(--color-border-secondary)' }}
      >
        <div className="space-y-4">
          <h2
            className="text-lg font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Infobase
          </h2>
          <SearchBar onSearch={setSearchQuery} placeholder="Search pages..." />
          <SidebarNavigation tree={filteredTree} />
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
              <SearchBar
                onSearch={setSearchQuery}
                placeholder="Search pages..."
              />
              <SidebarNavigation tree={filteredTree} />
            </div>
          </aside>
        </>
      )}

      {/* Main Content */}
      <main className="flex-1 px-6 py-6 lg:px-10">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Breadcrumbs */}
          {breadcrumbs.length > 0 && <BreadcrumbNav items={breadcrumbs} />}

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
      </main>
    </div>
  );
}
