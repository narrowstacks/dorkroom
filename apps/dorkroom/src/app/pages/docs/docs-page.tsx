import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import DocsLayout from './docs-layout';
import { docEntries, getDocEntry } from './docs-manifest';
import { DocsArticle } from './components/docs-article';

const docComponentMap = new Map(
  docEntries.map((entry) => [
    entry.slug,
    lazy(async () => {
      const mod = await entry.load();
      const MDXContent = mod.default;

      return {
        default: () => (
          <DocsArticle title={entry.frontmatter.title} description={entry.frontmatter.description}>
            <MDXContent />
          </DocsArticle>
        ),
      };
    }),
  ])
);

function DocsLoadingState() {
  return (
    <DocsArticle>
      <p style={{ color: 'var(--color-text-secondary)' }}>
        Loading documentation…
      </p>
    </DocsArticle>
  );
}

function DocsNotFound() {
  return (
    <DocsArticle>
      <h1>Page not found</h1>
      <p style={{ color: 'var(--color-text-secondary)' }}>
        The requested document does not exist yet. Choose another topic from the
        sidebar to keep exploring.
      </p>
    </DocsArticle>
  );
}

function DocRouteRenderer({ slug }: { slug: string }) {
  const entry = getDocEntry(slug);

  if (!entry) {
    return <DocsNotFound />;
  }

  const Component = docComponentMap.get(slug);

  if (!Component) {
    return <DocsNotFound />;
  }

  return (
    <Suspense fallback={<DocsLoadingState />}>
      <Component />
    </Suspense>
  );
}

export default function DocsPage() {
  // Find the home page (welcome entry)
  const welcomeEntry = docEntries.find((entry) => entry.slug === '');

  return (
    <DocsLayout>
      <Routes>
        {/* Root docs path renders the home page */}
        <Route
          index
          element={
            welcomeEntry ? (
              <DocRouteRenderer slug={welcomeEntry.slug} />
            ) : (
              <DocsNotFound />
            )
          }
        />
        {docEntries
          .filter((doc) => doc.slug !== '')
          .map((doc) => (
            <Route
              key={doc.slug}
              path={doc.slug}
              element={<DocRouteRenderer slug={doc.slug} />}
            />
          ))}
        <Route path="*" element={<DocsNotFound />} />
      </Routes>
    </DocsLayout>
  );
}
