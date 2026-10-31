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
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseSearch, stringifySearch } from '../../../routes/search-params';
import { TRACKED_ROUTES } from '../../lib/analytics/tracked-events';
import { SITE_SEARCH_SETTLE_MS } from '../../lib/analytics/use-site-search-analytics';
import { HomePage } from '../home-page';

// The page's numbers come through the real chain: useStats → apiClient.fetchStats
// → fetch('/api/stats'). Only the network boundary is replaced, so the hook, its
// query key, the response schema and the pending/error transitions are the real
// ones. Any other request is a bug in this test, so it throws rather than 404s.
const STATS: Stats = { films: 151, developers: 24, combinations: 1020 };

/** A slice of the real catalog, in the API's raw shape: one film, one developer, two recipes. */
const CATALOG = {
  films: [
    {
      id: 1,
      uuid: 'film-hp5',
      slug: 'ilford-hp5-plus',
      brand: 'Ilford',
      name: 'HP5 Plus',
      color_type: 'bw',
      iso_speed: 400,
      grain_structure: null,
      description: '',
      manufacturer_notes: null,
      reciprocity_failure: '1.31',
      discontinued: false,
      static_image_url: null,
      aliases: [],
      base_film_slug: null,
      date_added: '',
      created_at: '',
      updated_at: '',
    },
  ],
  developers: [
    {
      id: 1,
      uuid: 'developer-ddx',
      slug: 'ilford-dd-x',
      name: 'DD-X',
      manufacturer: 'Ilford',
      type: 'concentrate',
      description: '',
      film_or_paper: true,
      dilutions: [{ id: 1, name: '1+4', dilution: '1+4' }],
      mixing_instructions: null,
      storage_requirements: null,
      safety_notes: null,
      created_at: '',
      updated_at: '',
    },
  ],
  combinations: [400, 800].map((iso) => ({
    id: iso,
    uuid:
      iso === 800 ? 'e6d54f8d-c766-4cb2-a0b7-ae9ea02332fc' : `recipe-${iso}`,
    name: null,
    film_stock: 'ilford-hp5-plus',
    developer: 'ilford-dd-x',
    shooting_iso: iso,
    dilution_id: '1',
    custom_dilution: null,
    temperature_celsius: 20,
    time_minutes: iso === 800 ? 10 : 9,
    agitation_method: null,
    push_pull: 0,
    tags: ['official-ilford'],
    notes: null,
    info_source:
      'https://www.ilfordphoto.com/amfile/file/download/file/1918/product/681/',
    created_at: '',
    updated_at: '',
  })),
};

type CatalogResource = keyof typeof CATALOG;

/** Catalog endpoints the page asked for, in order. */
let catalogRequests: CatalogResource[] = [];

function serveStats(
  respond: () => Promise<Response>,
  {
    catalog = false,
    failing = [],
  }: { catalog?: boolean; failing?: readonly CatalogResource[] } = {}
): void {
  catalogRequests = [];
  vi.stubGlobal('fetch', (input: string | URL | Request) => {
    const url = input instanceof Request ? input.url : String(input);
    const path = new URL(url, 'https://dorkroom.art').pathname;
    if (path.endsWith('/api/stats')) return respond();
    // SAFETY: Object.keys of CATALOG is exactly its resource names.
    const resource = (Object.keys(CATALOG) as CatalogResource[]).find((name) =>
      path.endsWith(`/api/${name}`)
    );
    if (catalog && resource) {
      catalogRequests.push(resource);
      if (failing.includes(resource)) {
        return Promise.resolve(new Response('', { status: 500 }));
      }
      return jsonResponse({
        data: CATALOG[resource],
        count: CATALOG[resource].length,
      });
    }
    throw new Error(`HomePage requested something unexpected: ${url}`);
  });
}

/** A body the API sends: stats, or a collection envelope. */
type ApiBody = Stats | { data: readonly object[]; count: number };

const jsonResponse = (body: ApiBody) =>
  Promise.resolve(
    new Response(JSON.stringify(body), {
      headers: { 'content-type': 'application/json' },
    })
  );

const statsResponse = (stats: Stats) => jsonResponse(stats);

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

/** The router the last `renderHomePage` made, to read where a link went. */
let lastRouter: { state: { location: { pathname: string } } } | null = null;

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
    // The app's flat search serialisation, so hrefs read as in production.
    parseSearch,
    stringifySearch,
  });
  // A fresh client per render keeps one test's stats out of the next one's cache.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  lastRouter = router;
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

  describe('search', () => {
    const box = () => screen.getByRole('combobox', { name: /search/i });
    const type = (text: string) =>
      fireEvent.change(box(), { target: { value: text } });
    const key = (name: string) => fireEvent.keyDown(box(), { key: name });

    it('shows a real example answer on load without fetching the catalog', async () => {
      serveStats(() => statsResponse(STATS), { catalog: true });

      await renderHomePage();

      expect(screen.getByText(/^Example:/)).toHaveTextContent(
        'Example: “8x10 35mm 1/2”'
      );
      const answer = screen.getByRole('article', {
        name: '8×10 paper, 35mm negative',
      });
      expect(within(answer).getByText('6×9')).toBeInTheDocument();
      expect(
        within(answer).getByRole('link', { name: /open in border calculator/i })
      ).toHaveAttribute(
        'href',
        '/border?paper=8x10&ratio=3%3A2&border=0.5&landscape=true&flip=false'
      );
      expect(screen.getByRole('button', { name: 'tri-x 30s' })).toBeVisible();
      // The 500 KB recipe list waits for someone to search.
      expect(catalogRequests).toEqual([]);
    });

    it('answers a calculator query while the catalog is still loading', async () => {
      serveStats(() => statsResponse(STATS));

      await renderHomePage();
      type('80mm on 6x6');

      expect(
        await screen.findByRole('article', {
          name: '80mm on 6×6 as Full Frame',
        })
      ).toBeInTheDocument();
      expect(screen.queryByText(/^Example:/)).toBeNull();
    });

    it('answers a recipe once the catalog arrives', async () => {
      serveStats(() => statsResponse(STATS), { catalog: true });

      await renderHomePage();
      fireEvent.focus(box());
      type('hp5 at 800 in dd-x');

      const answer = await screen.findByRole('article', {
        name: 'Ilford HP5 Plus in Ilford DD-X',
      });
      expect(within(answer).getByText('10:00')).toBeInTheDocument();
      expect(within(answer).getByText('Not in source')).toBeInTheDocument();
      expect(
        within(answer).getByRole('link', { name: 'View source' })
      ).toHaveAttribute(
        'href',
        'https://www.ilfordphoto.com/amfile/file/download/file/1918/product/681/'
      );
      const href =
        '/development?film=ilford-hp5-plus&developer=ilford-dd-x&iso=800&dilution=1%2B4&recipe=e6d54f8d-c766-4cb2-a0b7-ae9ea02332fc';
      expect(
        within(answer).getByRole('link', { name: /open recipe/i })
      ).toHaveAttribute('href', href);
      // While there is a query the same link is the box's top option, named
      // with the answer it opens.
      expect(
        screen.getByRole('option', {
          name: 'Open recipe: Ilford HP5 Plus in Ilford DD-X',
        })
      ).toHaveAttribute('href', href);
      // The pair's other recipes are listed once, not again as suggestions.
      expect(screen.queryByRole('group', { name: 'Suggestions' })).toBeNull();
      expect(new Set(catalogRequests)).toEqual(
        new Set(['films', 'developers', 'combinations'])
      );
    });

    it('says which part of the catalog failed, and lists what did load', async () => {
      serveStats(() => statsResponse(STATS), {
        catalog: true,
        failing: ['combinations'],
      });

      await renderHomePage();
      fireEvent.focus(box());
      type('hp5 plus');

      expect(
        await screen.findByText(
          'Recipes could not load. Calculator questions still work.'
        )
      ).toBeInTheDocument();
      expect(
        within(screen.getByRole('group', { name: /^Film stocks/ })).getByRole(
          'option',
          { name: /Ilford HP5 Plus/ }
        )
      ).toBeInTheDocument();
      // Screen readers hear the failure too, not "loading".
      await waitFor(
        () =>
          expect(document.querySelector('output')).toHaveTextContent(
            'Recipes could not load. Calculator questions still work.'
          ),
        { timeout: 2000 }
      );
    });

    it('never claims a pair has no recipe when the recipes failed to load', async () => {
      serveStats(() => statsResponse(STATS), {
        catalog: true,
        failing: ['combinations'],
      });

      await renderHomePage();
      fireEvent.focus(box());
      type('hp5 at 800 in dd-x');

      expect(
        await screen.findByText(
          'Recipes could not load. Calculator questions still work.'
        )
      ).toBeInTheDocument();
      expect(screen.queryByText(/No recipe for this pair/)).toBeNull();
    });

    it('shows the example as plain links, not options', async () => {
      serveStats(() => statsResponse(STATS));

      await renderHomePage();

      expect(box()).toHaveAttribute('aria-expanded', 'false');
      expect(box()).not.toHaveAttribute('aria-activedescendant');
      expect(screen.queryByRole('listbox')).toBeNull();
      expect(screen.queryByRole('option')).toBeNull();
    });

    it('moves through the answer, suggestions and matches with the keyboard', async () => {
      serveStats(() => statsResponse(STATS));

      await renderHomePage();
      act(() => box().focus());
      type('8x10');

      const answer = await screen.findByRole('article', {
        name: '8×10 paper, 35mm negative',
      });
      // No list over the answer: the results on the page are the options.
      const list = screen.getByRole('listbox', { name: 'Search results' });
      expect(box()).toHaveAttribute('aria-expanded', 'true');
      expect(box()).toHaveAttribute('aria-controls', list.id);
      const link = within(list).getByRole('option', {
        name: 'Open in Border Calculator: 8×10 paper, 35mm negative',
      });
      expect(
        within(answer).getByRole('link', { name: /open in border calculator/i })
      ).toHaveAttribute('href', link.getAttribute('href'));
      // The answer's link leads the options and is preselected, so Enter
      // opens it.
      expect(box()).toHaveAttribute('aria-activedescendant', link.id);
      expect(link).toHaveAttribute('aria-selected', 'true');

      const suggestions = within(list).getByRole('group', {
        name: 'Suggestions',
      });
      expect(
        within(suggestions)
          .getAllByRole('option')
          .map((o) => o.textContent)
      ).toEqual([
        '8x10 35mm 1/2Border',
        '8x10 to 11x14 12sResize',
        '11x14 mat 8x10Mat',
      ]);
      const tools = within(list).getByRole('group', { name: /^Tools/ });
      const options = [
        link,
        ...within(suggestions).getAllByRole('option'),
        ...within(tools).getAllByRole('option'),
      ];
      // The listbox's own order is the arrow keys' order.
      expect(within(list).getAllByRole('option')).toEqual(options);

      key('ArrowDown');
      expect(box()).toHaveAttribute('aria-activedescendant', options[1].id);
      expect(options[1]).toHaveAttribute('aria-selected', 'true');
      expect(link).toHaveAttribute('aria-selected', 'false');
      for (const _ of options.slice(1)) key('ArrowDown'); // wraps to the first
      expect(box()).toHaveAttribute('aria-activedescendant', link.id);
      key('ArrowUp'); // and back to the last
      expect(box()).toHaveAttribute(
        'aria-activedescendant',
        options.at(-1)?.id
      );
      expect(document.activeElement).toBe(box());

      // Enter on a suggestion fills the box.
      for (const _ of options.slice(4)) key('ArrowUp');
      expect(box()).toHaveAttribute('aria-activedescendant', options[3].id);
      key('Enter');
      expect(box()).toHaveValue('11x14 mat 8x10');
      expect(
        await screen.findByRole('article', { name: '11×14 mat, 8×10 print' })
      ).toBeInTheDocument();
    });

    it('opens the top answer with Enter', async () => {
      serveStats(() => statsResponse(STATS));

      const router = await renderHomePage().then(() => lastRouter);
      type('80mm on 6x6');
      await screen.findByRole('article', { name: '80mm on 6×6 as Full Frame' });

      key('Enter');
      await waitFor(() =>
        expect(router?.state.location.pathname).toBe('/lenses')
      );
    });

    it('preselects the first match when there is no answer', async () => {
      serveStats(() => statsResponse(STATS), { catalog: true });

      await renderHomePage();
      fireEvent.focus(box());
      type('hp5 plus');

      await screen.findByRole('group', { name: /^Film stocks/ });
      expect(screen.queryByRole('article')).toBeNull();
      // The film's suggestion would repeat its match, so only the match shows.
      expect(screen.getAllByText('Ilford HP5 Plus')).toHaveLength(1);
      // The first match, not a suggestion (which would only fill the box).
      const list = screen.getByRole('listbox');
      const suggestions = within(list).getByRole('group', {
        name: 'Suggestions',
      });
      const first = within(list)
        .getAllByRole('option')
        .find((option) => !suggestions.contains(option));
      expect(box()).toHaveAttribute('aria-activedescendant', first?.id);
    });

    it('opens the top match with Enter when there is no answer', async () => {
      serveStats(() => statsResponse(STATS), { catalog: true });

      const router = await renderHomePage().then(() => lastRouter);
      fireEvent.focus(box());
      type('hp5 plus');
      await screen.findByRole('group', { name: /^Film stocks/ });
      const active = document.getElementById(
        box().getAttribute('aria-activedescendant') ?? ''
      );
      expect(active).toHaveAttribute('href');

      key('Enter');
      expect(box()).toHaveValue('hp5 plus');
      await waitFor(() =>
        expect(router?.state.location.pathname).not.toBe('/')
      );
    });

    it('leaves Enter to an input method that is composing', async () => {
      serveStats(() => statsResponse(STATS));

      const router = await renderHomePage().then(() => lastRouter);
      type('80mm on 6x6');
      await screen.findByRole('article', { name: '80mm on 6×6 as Full Frame' });

      fireEvent.keyDown(box(), { key: 'Enter', isComposing: true });
      expect(router?.state.location.pathname).toBe('/');
    });

    it('clears the box with Escape', async () => {
      serveStats(() => statsResponse(STATS));

      await renderHomePage();
      type('80mm');
      expect(box()).toHaveAttribute('aria-expanded', 'true');
      key('ArrowDown');
      key('Escape');
      expect(box()).toHaveValue('');
      expect(box()).toHaveAttribute('aria-expanded', 'false');
      expect(box()).not.toHaveAttribute('aria-activedescendant');
    });

    it('picks a suggestion with the mouse', async () => {
      serveStats(() => statsResponse(STATS));

      await renderHomePage();
      type('80mm');
      fireEvent.click(screen.getByRole('option', { name: /80mm on 6x6/ }));

      expect(box()).toHaveValue('80mm on 6x6');
      expect(box()).toHaveFocus();
    });

    it('sets a reciprocity power as a superscript', async () => {
      serveStats(() => statsResponse(STATS), { catalog: true });

      await renderHomePage();
      fireEvent.focus(box());
      type('hp5 30s');

      const answer = await screen.findByRole('article', {
        name: 'Ilford HP5 Plus for 30s metered',
      });
      const formula = within(answer).getByText('Formula').nextElementSibling;
      expect(formula?.querySelector('sup')).toHaveTextContent('1.31');
      expect(formula).toHaveTextContent('t to the power 1.31');
    });

    it('says up front when the EI asked for has no recipe', async () => {
      serveStats(() => statsResponse(STATS), { catalog: true });

      await renderHomePage();
      fireEvent.focus(box());
      type('hp5 at 1600 in dd-x');

      const answer = await screen.findByRole('article', {
        name: 'Ilford HP5 Plus in Ilford DD-X',
      });
      const notice = within(answer).getByText(
        'No EI 1600 recipe for this pair. Showing EI 800. Also at EI 400.'
      );
      const figure = within(answer).getByText('10:00');
      // Above the number, so it is read before the time.
      expect(
        notice.compareDocumentPosition(figure) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
      await waitFor(
        () =>
          expect(document.querySelector('output')).toHaveTextContent(
            /^Ilford HP5 Plus in Ilford DD-X\. No EI 1600 recipe for this pair\. Showing EI 800\. Also at EI 400\. 10:00 min, at /
          ),
        { timeout: 2000 }
      );
    });

    it('announces one match in the singular', async () => {
      serveStats(() => statsResponse(STATS), { catalog: true });

      await renderHomePage();
      fireEvent.focus(box());
      type('easel');

      await waitFor(
        () =>
          expect(document.querySelector('output')).toHaveTextContent(
            /^1 match\.$/
          ),
        { timeout: 2000 }
      );
    });

    it('focuses the box on "/"', async () => {
      serveStats(() => statsResponse(STATS));

      await renderHomePage();
      fireEvent.keyDown(document.body, { key: '/' });

      expect(box()).toHaveFocus();
    });

    it('announces a settled query once, not each keystroke', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        serveStats(() => statsResponse(STATS));
        await renderHomePage();
        const output = () => document.querySelector('output');

        for (const text of ['1', '11', '11x', '11x14', '11x14 6x7 1.45']) {
          type(text);
          act(() => {
            vi.advanceTimersByTime(100);
          });
          expect(output()).toHaveTextContent(/^$/);
        }
        act(() => {
          vi.advanceTimersByTime(1000);
        });
        expect(output()).toHaveTextContent(/^11×14 paper, 6×7 negative: .+/);
      } finally {
        vi.useRealTimers();
      }
    });

    it('a Try chip fills the box and answers it', async () => {
      serveStats(() => statsResponse(STATS), { catalog: true });

      await renderHomePage();
      fireEvent.click(screen.getByRole('button', { name: '12s +1/3' }));

      expect(box()).toHaveValue('12s +1/3');
      expect(box()).toHaveFocus();
      expect(
        await screen.findByRole('article', { name: '12s +0.33 stops' })
      ).toBeInTheDocument();
      expect(box()).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('search analytics', () => {
    const va = vi.fn();

    beforeEach(() => {
      va.mockReset();
      window.va = va;
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
      vi.useRealTimers();
      delete window.va;
    });

    const settle = () =>
      act(() => {
        vi.advanceTimersByTime(SITE_SEARCH_SETTLE_MS + 50);
      });

    it('reports one settled search, never the query text, and never the example', async () => {
      serveStats(() => statsResponse(STATS));
      await renderHomePage();
      const box = screen.getByRole('combobox', { name: /search/i });

      await settle();
      expect(va).not.toHaveBeenCalled();

      for (const text of ['1', '11', '11x', '11x14', '11x14 6x7 1.45']) {
        fireEvent.change(box, { target: { value: text } });
      }
      await settle();
      await settle();

      await waitFor(() => expect(va).toHaveBeenCalledTimes(1));
      expect(va).toHaveBeenCalledWith('event', {
        name: 'home_search',
        data: { result: 'border', count: 2 },
        options: undefined,
      });
      const sent = JSON.stringify(va.mock.calls);
      expect(sent).not.toContain('11x14');
      expect(sent).not.toContain('1.45');
    });

    it('still reports a search when the catalog fails to load', async () => {
      serveStats(() => statsResponse(STATS), {
        catalog: true,
        failing: ['combinations'],
      });
      await renderHomePage();
      const box = screen.getByRole('combobox', { name: /search/i });
      fireEvent.focus(box);
      fireEvent.change(box, { target: { value: 'hp5 plus' } });

      await screen.findByText(/Recipes could not load/);
      await settle();

      await waitFor(() => expect(va).toHaveBeenCalledTimes(1));
      const [, event] = va.mock.calls[0];
      expect(event).toMatchObject({ name: 'home_search' });
      expect(JSON.stringify(va.mock.calls)).not.toContain('hp5');
    });
  });
});
