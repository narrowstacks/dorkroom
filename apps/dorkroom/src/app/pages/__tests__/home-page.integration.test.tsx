import '@testing-library/jest-dom/vitest';
import type { Stats } from '@dorkroom/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TRACKED_ROUTES } from '../../lib/analytics/tracked-events';
import { HomePage } from '../home-page';

// The page's numbers come through the real chain: useStats → apiClient.fetchStats
// → fetch('/api/stats'). Only the network boundary is replaced, so the hook, its
// query key, the response schema and the pending/error transitions are the real
// ones. Any other request is a bug in this test, so it throws rather than 404s.
const STATS: Stats = { films: 151, developers: 24, combinations: 1020 };

function serveStats(respond: () => Promise<Response>): void {
  vi.stubGlobal('fetch', (input: string | URL | Request) => {
    const url = input instanceof Request ? input.url : String(input);
    if (!url.endsWith('/api/stats')) {
      throw new Error(`HomePage requested something unexpected: ${url}`);
    }
    return respond();
  });
}

const statsResponse = (stats: Stats) =>
  Promise.resolve(
    new Response(JSON.stringify(stats), {
      headers: { 'content-type': 'application/json' },
    })
  );

/** Every route HomePage links to, so the router builds its hrefs for real. */
const LINKED_PATHS = [
  '/border',
  '/stops',
  '/resize',
  '/mat',
  '/reciprocity',
  '/development',
  '/negative-inverter',
  '/lenses',
  '/exposure',
  '/films',
  '/privacy',
];

async function renderHomePage() {
  const rootRoute = createRootRoute({ component: Outlet });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: HomePage,
  });
  const linkTargets = LINKED_PATHS.map((path) =>
    createRoute({
      getParentRoute: () => rootRoute,
      path,
      component: () => null,
    })
  );
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, ...linkTargets]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  // A fresh client per render keeps one test's stats out of the next one's cache.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );

  return screen.findByRole('heading', { level: 1 });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('HomePage', () => {
  it('renders the hero stats once the stats request resolves', async () => {
    serveStats(() => statsResponse(STATS));

    await renderHomePage();

    expect(await screen.findByText('1,020')).toBeInTheDocument();
    expect(screen.getByText('151')).toBeInTheDocument();
    expect(screen.getByText('24')).toBeInTheDocument();
  });

  // Note: Visual regression testing is handled by Chromatic (see e2e/homepage.spec.ts)

  describe('data states', () => {
    it('shows a placeholder for every stat while the request is in flight', async () => {
      serveStats(() => new Promise<Response>(() => {}));

      await renderHomePage();

      expect(screen.getAllByText('-')).toHaveLength(3);
    });

    it('handles API error gracefully with fallback content', async () => {
      serveStats(() =>
        Promise.resolve(
          new Response('no stats for you', {
            status: 500,
            statusText: 'Server Error',
          })
        )
      );

      const heading = await renderHomePage();

      // HomePage gracefully degrades - shows "-" for missing data instead of an
      // error message, and the rest of the page still renders.
      expect(heading).toBeVisible();
      expect(screen.getAllByText('-')).toHaveLength(3);
      expect(
        screen.getByRole('heading', { name: /tools/i, level: 2 })
      ).toBeInTheDocument();
    });

    it('handles empty stats gracefully', async () => {
      serveStats(() =>
        statsResponse({ films: 0, developers: 0, combinations: 0 })
      );

      await renderHomePage();

      expect(await screen.findAllByText('0')).toHaveLength(3);
    });
  });

  describe('accessibility', () => {
    it('has proper heading hierarchy with single h1', async () => {
      serveStats(() => statsResponse(STATS));

      await renderHomePage();

      // Page should have exactly one h1 for proper document structure
      expect(screen.queryAllByRole('heading', { level: 1 })).toHaveLength(1);

      // Should have section headings (h2s)
      expect(
        screen.getAllByRole('heading', { level: 2 }).length
      ).toBeGreaterThan(0);
    });

    it('all links have accessible names', async () => {
      serveStats(() => statsResponse(STATS));

      await renderHomePage();

      for (const link of screen.getAllByRole('link')) {
        expect(link).toHaveAccessibleName();
      }
    });

    it('external links have security attributes', async () => {
      serveStats(() => statsResponse(STATS));

      await renderHomePage();

      // Match only http/https URLs, excluding protocol-relative (//), mailto:, tel:, etc.
      const externalLinks = screen
        .getAllByRole('link')
        .filter((link) => /^https?:\/\//.test(link.getAttribute('href') ?? ''));
      expect(externalLinks.length).toBeGreaterThan(0);

      for (const link of externalLinks) {
        expect(link).toHaveAttribute('target', '_blank');
        // noreferrer implies noopener in modern browsers
        expect(link.getAttribute('rel')).toContain('noreferrer');
      }
    });
  });

  describe('tool cards (pinned, #455)', () => {
    it('keeps the cards in order with their copy, links, icons and accents', async () => {
      serveStats(() => statsResponse(STATS));

      await renderHomePage();

      const cards = screen
        .getAllByRole('link')
        .filter((link) => link.querySelector('h3') !== null)
        .map((link) => {
          const svg = link.querySelector('svg');
          const iconClass = svg?.getAttribute('class') ?? '';
          const accentHost = link.querySelector('[class*="--accent-"]');
          return {
            title: link.getAttribute('aria-label'),
            href: link.getAttribute('href'),
            category: link.querySelector('p.uppercase')?.textContent,
            description: link.querySelector('p.text-sm')?.textContent,
            icon: iconClass.match(/\blucide-(?!icon\b)([a-z0-9-]+)/)?.[1],
            accent: accentHost
              ?.getAttribute('class')
              ?.match(/--accent-([a-z]+)-text/)?.[1],
          };
        });

      expect(cards).toEqual([
        {
          title: 'Border Calculator',
          href: '/border',
          category: 'Printing',
          description: 'Print borders & trim guides',
          icon: 'crop',
          accent: 'indigo',
        },
        {
          title: 'Stops Calculator',
          href: '/stops',
          category: 'Printing',
          description: 'F-stop & time math',
          icon: 'gauge',
          accent: 'blue',
        },
        {
          title: 'Resize Calculator',
          href: '/resize',
          category: 'Printing',
          description: 'Scale prints, no wasting test strips',
          icon: 'ruler',
          accent: 'teal',
        },
        {
          title: 'Mat Cut Calculator',
          href: '/mat',
          category: 'Printing',
          description: 'Window openings & cut guides',
          icon: 'frame',
          accent: 'cyan',
        },
        {
          title: 'Reciprocity',
          href: '/reciprocity',
          category: 'Film',
          description: 'Film long exposure correction',
          icon: 'timer',
          accent: 'amber',
        },
        {
          title: 'Film Development Recipes',
          href: '/development',
          category: 'Film',
          description: 'B&W film development database',
          icon: 'flask-conical',
          accent: 'rose',
        },
        {
          title: 'Negative Inverter',
          href: '/negative-inverter',
          category: 'Film',
          description: 'Quick positives from phone photos',
          icon: 'contrast',
          accent: 'violet',
        },
        {
          title: 'Lens Equivalency',
          href: '/lenses',
          category: 'Camera',
          description: 'Compare format lens differences',
          icon: 'focus',
          accent: 'emerald',
        },
        {
          title: 'Camera Exposure',
          href: '/exposure',
          category: 'Camera',
          description: 'Equivalent exposure calculator',
          icon: 'camera',
          accent: 'teal',
        },
        {
          title: 'Film Database',
          href: '/films',
          category: 'Reference',
          description: 'Browse film stocks by brand & ISO',
          icon: 'film',
          accent: 'cyan',
        },
      ]);
    });
  });

  describe('navigation', () => {
    it('calculator links point to routes the router knows', async () => {
      serveStats(() => statsResponse(STATS));

      await renderHomePage();

      const internalHrefs = screen
        .getAllByRole('link')
        .map((link) => link.getAttribute('href') ?? '')
        .filter((href) => !href.startsWith('http'));
      expect(internalHrefs.length).toBeGreaterThan(0);

      // Checked against the app's real route list, not LINKED_PATHS: that
      // list only exists to give this test's stand-in router somewhere to
      // point, so a link to a route the app has since dropped would still
      // find itself there. TRACKED_ROUTES is pinned to routeTree.gen.ts by
      // analytics.test.ts.
      const knownRoutes: readonly string[] = TRACKED_ROUTES;
      for (const href of internalHrefs) {
        expect(knownRoutes, `${href} is not a route the app has`).toContain(
          new URL(href, 'https://dorkroom.art').pathname
        );
      }
    });
  });
});
