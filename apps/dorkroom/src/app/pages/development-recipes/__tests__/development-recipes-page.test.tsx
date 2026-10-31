import '@testing-library/jest-dom/vitest';
import type { Combination, Developer, Film } from '@dorkroom/api';
import { type CustomRecipe, encodeCustomRecipe } from '@dorkroom/logic';
import {
  MeasurementProvider,
  ThemeProvider,
  ToastProvider,
  VolumeProvider,
} from '@dorkroom/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DevelopmentRecipesPage from '../development-recipes-page';

/**
 * Page-level coverage for /development at both breakpoints through one tree
 * (#380). Everything is real except the two things happy-dom cannot supply:
 * the catalogue (seeded into the query cache, as the URL tests do) and the
 * viewport (matchMedia and element boxes).
 *
 * The page keeps its state in `window.location`, not the router, so URL
 * assertions read that directly.
 */

const TIMESTAMP = '2026-01-01T00:00:00.000Z';
const API_ID = '11111111-1111-4111-8111-111111111111';
const CUSTOM_ID = 'custom-1';

const HP5: Film = {
  id: 1,
  uuid: 'f1',
  slug: 'hp5-plus',
  brand: 'Ilford',
  name: 'HP5 Plus',
  colorType: 'bw',
  isoSpeed: 400,
  grainStructure: null,
  description: 'A classic all-rounder.',
  manufacturerNotes: null,
  reciprocityFailure: null,
  discontinued: false,
  staticImageUrl: null,
  aliases: [],
  baseFilmSlug: null,
  dateAdded: TIMESTAMP,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
};

const TRI_X: Film = {
  ...HP5,
  id: 2,
  uuid: 'f2',
  slug: 'tri-x-400',
  brand: 'Kodak',
  name: 'Tri-X 400',
  description: '',
};

const DDX: Developer = {
  id: 1,
  uuid: 'd1',
  slug: 'dd-x',
  name: 'DD-X',
  manufacturer: 'Ilford',
  type: 'concentrate',
  description: '',
  filmOrPaper: true,
  dilutions: [],
  mixingInstructions: null,
  storageRequirements: null,
  safetyNotes: null,
  notes: null,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
};

const HP5_DDX: Combination = {
  id: 1,
  uuid: API_ID,
  name: 'HP5 in DD-X',
  filmStockId: 'f1',
  filmSlug: 'hp5-plus',
  developerId: 'd1',
  developerSlug: 'dd-x',
  shootingIso: 400,
  dilutionId: null,
  customDilution: '1+4',
  temperatureC: 20,
  temperatureF: 68,
  timeMinutes: 9,
  agitationMethod: 'standard',
  agitationSchedule: null,
  pushPull: 0,
  tags: [],
  notes: null,
  infoSource: null,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
};

const CUSTOM: CustomRecipe = {
  id: CUSTOM_ID,
  name: 'My HP5',
  filmId: 'f2',
  developerId: 'd1',
  temperatureF: 70,
  timeMinutes: 11,
  shootingIso: 800,
  pushPull: 1,
  customDilution: '1+9',
  notes: 'Agitate gently.',
  isCustomFilm: false,
  isCustomDeveloper: false,
  dateCreated: TIMESTAMP,
  dateModified: TIMESTAMP,
  isPublic: true,
};

// --- viewport ---------------------------------------------------------------

let viewportIsMobile = false;
const mediaListeners = new Set<(event: { matches: boolean }) => void>();

function setViewport(mobile: boolean) {
  viewportIsMobile = mobile;
  for (const listener of mediaListeners) listener({ matches: mobile });
}

function stubMatchMedia() {
  vi.stubGlobal('matchMedia', (query: string) => ({
    get matches() {
      return query.includes('max-width') ? viewportIsMobile : false;
    },
    media: query,
    onchange: null,
    addEventListener: (
      _type: string,
      listener: (event: { matches: boolean }) => void
    ) => mediaListeners.add(listener),
    removeEventListener: (
      _type: string,
      listener: (event: { matches: boolean }) => void
    ) => mediaListeners.delete(listener),
    addListener: (listener: (event: { matches: boolean }) => void) =>
      mediaListeners.add(listener),
    removeListener: (listener: (event: { matches: boolean }) => void) =>
      mediaListeners.delete(listener),
    dispatchEvent: () => false,
  }));
}

// happy-dom lays nothing out, so the virtualizers would see a 0px viewport and
// render no rows. Give every element a box.
function stubLayout() {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(
    DOMRect.fromRect({ x: 0, y: 0, width: 1300, height: 800 })
  );
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1300);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(800);
}

// --- rendering --------------------------------------------------------------

const writeText = vi.fn<(text: string) => Promise<void>>();

function renderPage({
  mobile,
  search = '',
  customRecipes = [],
}: {
  mobile: boolean;
  search?: string;
  customRecipes?: CustomRecipe[];
}) {
  viewportIsMobile = mobile;
  window.history.replaceState(null, '', `/development${search}`);
  if (customRecipes.length > 0) {
    localStorage.setItem(
      'dorkroom_custom_recipes',
      JSON.stringify(customRecipes)
    );
  }

  const queryClient = new QueryClient({
    defaultOptions: {
      // Never-stale seeded data resolves every query without a fetch.
      queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
    },
  });
  // Literal keys: @dorkroom/logic does not publish its query-key factory.
  queryClient.setQueryData(['films', 'list'], [HP5, TRI_X]);
  queryClient.setQueryData(['developers', 'list'], [DDX]);
  queryClient.setQueryData(['combinations', 'list'], [HP5_DDX]);

  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <MeasurementProvider>
          <VolumeProvider>
            <ToastProvider>
              <DevelopmentRecipesPage />
            </ToastProvider>
          </VolumeProvider>
        </MeasurementProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

const API_RECIPE = /Ilford HP5 Plus/;
const CUSTOM_RECIPE = /Kodak Tri-X 400/;

/** Opens a recipe from the list: a card on mobile, a table row on desktop. */
async function openRecipe(mobile: boolean, name: RegExp) {
  if (mobile) {
    fireEvent.click(
      await screen.findByRole('button', {
        name: new RegExp(`^Select ${name.source} recipe`),
      })
    );
    return;
  }
  const [cell] = await screen.findAllByText(name);
  if (!cell) throw new Error(`no row matching ${name}`);
  fireEvent.click(cell);
}

/** The open detail panel: a dialog drawer on mobile, a region on desktop. */
function getDetailPanel(mobile: boolean): HTMLElement {
  return mobile
    ? screen.getByRole('dialog', { name: /recipe details$/ })
    : screen.getByRole('region', { name: /recipe details$/ });
}

function queryDetailPanel(): HTMLElement | null {
  return (
    screen.queryByRole('dialog', { name: /recipe details$/ }) ??
    screen.queryByRole('region', { name: /recipe details$/ })
  );
}

const currentParams = () => new URLSearchParams(window.location.search);

beforeEach(() => {
  localStorage.clear();
  stubMatchMedia();
  stubLayout();
  writeText.mockReset();
  writeText.mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  mediaListeners.clear();
  localStorage.clear();
  window.history.replaceState(null, '', '/');
  document.body.style.overflow = '';
});

/** Waits out the page's debounced URL writer. */
const URL_SYNC = { timeout: 2000 };

describe.each([
  { width: 'mobile', mobile: true },
  { width: 'desktop', mobile: false },
])('DevelopmentRecipesPage at $width width', ({ mobile }) => {
  it('renders the breakpoint filter module and no other', async () => {
    renderPage({ mobile });
    await screen.findAllByText(API_RECIPE);

    if (mobile) {
      expect(
        screen.getByRole('button', { name: /^Filters/ })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Collapse filters' })
      ).not.toBeInTheDocument();
    } else {
      expect(
        screen.getByRole('button', { name: 'Collapse filters' })
      ).toBeInTheDocument();
    }
  });

  it('opens an API recipe in the one detail panel, with the shared actions', async () => {
    renderPage({ mobile });
    await openRecipe(mobile, API_RECIPE);

    const panel = getDetailPanel(mobile);
    expect(panel).toHaveAccessibleName(
      'Ilford HP5 Plus with Ilford DD-X recipe details'
    );
    expect(within(panel).getByText('1+4')).toBeInTheDocument();
    expect(
      within(panel).getByRole('button', { name: 'Add to favorites' })
    ).toBeInTheDocument();
    expect(
      within(panel).getByRole('button', { name: 'Share' })
    ).toBeInTheDocument();
    // Custom-only actions stay off an API recipe.
    for (const name of ['Copy link', 'Edit', 'Delete']) {
      expect(
        within(panel).queryByRole('button', { name })
      ).not.toBeInTheDocument();
    }
    // Only the drawer locks page scroll.
    expect(document.body.style.overflow).toBe(mobile ? 'hidden' : '');

    await waitFor(
      () => expect(currentParams().get('recipe')).toBe(API_ID),
      URL_SYNC
    );
  });

  it('offers a custom recipe the same actions at both widths', async () => {
    renderPage({ mobile, customRecipes: [CUSTOM] });
    await openRecipe(mobile, CUSTOM_RECIPE);

    const panel = getDetailPanel(mobile);
    expect(panel).toHaveAccessibleName(
      'Kodak Tri-X 400 with Ilford DD-X recipe details'
    );
    for (const name of [
      'Add to favorites',
      'Share',
      'Copy link',
      'Edit',
      'Delete',
    ]) {
      expect(within(panel).getByRole('button', { name })).toBeInTheDocument();
    }
    // Custom recipes are not written to the URL.
    expect(currentParams().get('recipe')).toBeNull();
  });

  it('shares a built-in recipe from the panel through the list share flow', async () => {
    renderPage({ mobile });
    await openRecipe(mobile, API_RECIPE);

    fireEvent.click(
      within(getDetailPanel(mobile)).getByRole('button', { name: 'Share' })
    );

    // happy-dom has no share sheet, so the shared flow lands on the clipboard.
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0]?.[0]).toContain(API_ID);
    expect(await screen.findByText('Link copied to clipboard!')).toBeVisible();
  });

  it('copies the share link of a custom recipe from the panel', async () => {
    renderPage({ mobile, customRecipes: [CUSTOM] });
    await openRecipe(mobile, CUSTOM_RECIPE);

    fireEvent.click(
      within(getDetailPanel(mobile)).getByRole('button', { name: 'Copy link' })
    );

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0]?.[0]).toContain('/development?');
    expect(await screen.findByText('Link copied to clipboard!')).toBeVisible();
  });

  it('toggles the favorite from the panel', async () => {
    renderPage({ mobile });
    await openRecipe(mobile, API_RECIPE);

    fireEvent.click(
      within(getDetailPanel(mobile)).getByRole('button', {
        name: 'Add to favorites',
      })
    );

    expect(
      within(getDetailPanel(mobile)).getByRole('button', { name: 'Favorited' })
    ).toBeInTheDocument();
    expect(localStorage.getItem('dorkroom_favorite_recipes')).toContain(API_ID);
  });

  it('opens the edit form and the delete confirmation from the panel', async () => {
    renderPage({ mobile, customRecipes: [CUSTOM] });
    await openRecipe(mobile, CUSTOM_RECIPE);

    fireEvent.click(
      within(getDetailPanel(mobile)).getByRole('button', { name: 'Edit' })
    );
    expect(await screen.findByText('Edit custom recipe')).toBeVisible();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() =>
      expect(screen.queryByText('Edit custom recipe')).not.toBeInTheDocument()
    );

    fireEvent.click(
      within(getDetailPanel(mobile)).getByRole('button', { name: 'Delete' })
    );
    expect(
      await screen.findByText(/Are you sure you want to delete this custom/)
    ).toBeVisible();
  });

  it('closes with the close button, Escape and the backdrop where there is one', async () => {
    renderPage({ mobile });

    await openRecipe(mobile, API_RECIPE);
    fireEvent.click(
      within(getDetailPanel(mobile)).getByRole('button', {
        name: 'Close panel',
      })
    );
    expect(queryDetailPanel()).toBeNull();
    expect(document.body.style.overflow).not.toBe('hidden');

    await openRecipe(mobile, API_RECIPE);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(queryDetailPanel()).toBeNull();

    if (mobile) {
      await openRecipe(mobile, API_RECIPE);
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      expect(queryDetailPanel()).toBeNull();
    }
    await waitFor(
      () => expect(currentParams().get('recipe')).toBeNull(),
      URL_SYNC
    );
  });

  it('opens the panel from a ?recipe= deep link', async () => {
    renderPage({ mobile, search: `?recipe=${API_ID}` });

    const panel = await waitFor(() => getDetailPanel(mobile));
    expect(panel).toHaveAccessibleName(
      'Ilford HP5 Plus with Ilford DD-X recipe details'
    );
  });

  // #508: the link must resolve against the whole catalogue, not the rows the
  // current filters leave.
  it('opens a ?recipe= link that the ?q= search filters out, and keeps it in the URL', async () => {
    renderPage({ mobile, search: `?q=zzz-no-match&recipe=${API_ID}` });

    const panel = await waitFor(() => getDetailPanel(mobile));
    expect(panel).toHaveAccessibleName(
      'Ilford HP5 Plus with Ilford DD-X recipe details'
    );
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(currentParams().get('recipe')).toBe(API_ID);
    expect(currentParams().get('q')).toBe('zzz-no-match');
  });

  it('opens a shared custom recipe in the shared recipe dialog, not the panel', async () => {
    renderPage({
      mobile,
      search: `?recipe=${encodeCustomRecipe(CUSTOM)}&source=share`,
    });

    expect(await screen.findByText('Custom Recipe Shared')).toBeVisible();
    expect(queryDetailPanel()).toBeNull();
  });
});

describe('DevelopmentRecipesPage across the breakpoint', () => {
  it('swaps the sidebar for the drawer, keeping the open recipe', async () => {
    renderPage({ mobile: false });
    await openRecipe(false, API_RECIPE);
    expect(
      screen.getByRole('region', { name: /recipe details$/ })
    ).toBeVisible();

    act(() => setViewport(true));

    await waitFor(() =>
      expect(
        screen.getByRole('dialog', { name: /recipe details$/ })
      ).toBeVisible()
    );
    expect(
      screen.queryByRole('region', { name: /recipe details$/ })
    ).not.toBeInTheDocument();
    // Not asserted: body scroll lock. The closed drawers the page mounts at
    // the mobile width reset overflow in their own mount effect, which runs
    // after the panel's and clobbers it (pre-existing, see the PR notes).
  });
});
