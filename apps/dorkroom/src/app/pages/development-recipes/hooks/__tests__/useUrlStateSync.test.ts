/**
 * The URL → state half of the development recipes page, end to end: the real
 * `useDevelopmentRecipes` (its setters carry rules such as "picking a
 * developer clears the dilution"), the real `useRecipeUrlState` parsing and
 * validating `window.location`, and the real `useUrlStateSync` applying it.
 * Only the page's own `useState`s are reproduced here.
 *
 * Most recipes URL bugs landed in this half while the tests covered the
 * other one (#288), so each regression below is named after its fix.
 */
import type { Combination, Developer, Film } from '@dorkroom/api';
import {
  type CustomRecipe,
  type CustomRecipeFilter,
  encodeCustomRecipe,
  readRecipeUrlSearchQuery,
  useDevelopmentRecipes,
  useRecipeUrlState,
} from '@dorkroom/logic';
import type { DevelopmentCombinationView } from '@dorkroom/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRecipesByUuid } from '../useRecipeData';
import { useUrlStateSync } from '../useUrlStateSync';

/**
 * `@vercel/analytics` forwards each event to `window.va`, the queue its script
 * installs in production. Stubbing that counts what the real `trackEvent`
 * sends.
 */
const va = vi.fn<NonNullable<Window['va']>>();
const sentEvents = () =>
  va.mock.calls
    .filter(([kind]) => kind === 'event')
    .map(([, properties]) => {
      // SAFETY: @vercel/analytics' track() always passes `{ name, data }` with
      // the 'event' kind filtered for above.
      const { name, data } = properties as { name: string; data?: unknown };
      return { name, data };
    });

const TIMESTAMP = '2026-01-01T00:00:00.000Z';

const film = (overrides: Partial<Film>): Film => ({
  id: 1,
  uuid: 'f1',
  slug: 'hp5-plus',
  brand: 'Ilford',
  name: 'HP5 Plus',
  colorType: 'bw',
  isoSpeed: 400,
  grainStructure: null,
  description: '',
  manufacturerNotes: null,
  reciprocityFailure: null,
  discontinued: false,
  staticImageUrl: null,
  aliases: [],
  baseFilmSlug: null,
  dateAdded: TIMESTAMP,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
  ...overrides,
});

const developer = (overrides: Partial<Developer>): Developer => ({
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
  ...overrides,
});

const combination = (overrides: Partial<Combination>): Combination => ({
  id: 1,
  uuid: '11111111-1111-4111-8111-111111111111',
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
  ...overrides,
});

const HP5 = film({});
const TRI_X = film({
  id: 2,
  uuid: 'f2',
  slug: 'tri-x-400',
  brand: 'Kodak',
  name: 'Tri-X 400',
});
const DDX = developer({});
const D76 = developer({
  id: 2,
  uuid: 'd2',
  slug: 'd-76',
  name: 'D-76',
  manufacturer: 'Kodak',
  type: 'powder',
});
const HP5_DDX = combination({});
const TRIX_D76 = combination({
  id: 2,
  uuid: '22222222-2222-4222-8222-222222222222',
  name: 'Tri-X in D-76',
  filmStockId: 'f2',
  filmSlug: 'tri-x-400',
  developerId: 'd2',
  developerSlug: 'd-76',
  customDilution: 'stock',
});

/** Stable like the page's store-backed list; a fresh `[]` re-renders forever. */
const NO_CUSTOM_RECIPES: CustomRecipe[] = [];

/** Stands in for useRecipeData's conversion, which this half does not own. */
const SHARED_CUSTOM_VIEW: DevelopmentCombinationView = {
  combination: HP5_DDX,
  source: 'custom',
};

/**
 * The page's wiring of the URL halves, minus rendering. Mirrors
 * development-recipes-page.tsx: the same hooks in the same order.
 */
function usePageUrlState() {
  const recipes = useDevelopmentRecipes({
    searchQuery: readRecipeUrlSearchQuery(),
  });
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [detailView, setDetailView] =
    useState<DevelopmentCombinationView | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [sharedRecipeView, setSharedRecipeView] =
    useState<DevelopmentCombinationView | null>(null);
  const [sharedRecipeSource, setSharedRecipeSource] = useState<
    'shared' | 'custom'
  >('shared');
  const [isSharedRecipeModalOpen, setIsSharedRecipeModalOpen] = useState(false);
  const [isFiltersSidebarCollapsed, setIsFiltersSidebarCollapsed] =
    useState(false);

  const recipesByUuid = useRecipesByUuid(
    recipes.allCombinations,
    NO_CUSTOM_RECIPES
  );
  const selectedRecipeId =
    isDetailOpen && detailView?.source === 'api'
      ? String(detailView.combination.uuid)
      : null;

  const url = useRecipeUrlState(
    recipes.allFilms,
    recipes.allDevelopers,
    {
      searchQuery: recipes.searchQuery,
      selectedFilm: recipes.selectedFilm,
      selectedDeveloper: recipes.selectedDeveloper,
      dilutionFilter: recipes.dilutionFilter,
      isoFilter: recipes.isoFilter,
      developerTypeFilter: recipes.developerTypeFilter,
      customRecipeFilter: recipes.customRecipeFilter,
      favoritesOnly,
      selectedRecipeId,
    },
    recipesByUuid
  );

  useUrlStateSync({
    isLoaded: recipes.isLoaded,
    initialUrlState: url.initialUrlState,
    sharedCustomRecipeView: url.sharedCustomRecipe ? SHARED_CUSTOM_VIEW : null,
    recipesByUuid,
    getFilmById: recipes.getFilmById,
    getDeveloperById: recipes.getDeveloperById,
    setSelectedFilm: recipes.setSelectedFilm,
    setSelectedDeveloper: recipes.setSelectedDeveloper,
    setDilutionFilter: recipes.setDilutionFilter,
    setIsoFilter: recipes.setIsoFilter,
    setDeveloperTypeFilter: recipes.setDeveloperTypeFilter,
    setFavoritesOnly,
    setCustomRecipeFilter: recipes.setCustomRecipeFilter,
    setSharedRecipeView,
    setSharedRecipeSource,
    setIsSharedRecipeModalOpen,
    setDetailView,
    setIsDetailOpen,
    setIsFiltersSidebarCollapsed,
  });

  return {
    recipes,
    url,
    favoritesOnly,
    detailView,
    isDetailOpen,
    sharedRecipeView,
    sharedRecipeSource,
    isSharedRecipeModalOpen,
    isFiltersSidebarCollapsed,
  };
}

let queryClient: QueryClient;

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(QueryClientProvider, { client: queryClient }, children);

/** Seeds the catalogue, or leaves it loading when `loaded` is false. */
function seedCatalogue(loaded = true) {
  queryClient = new QueryClient({
    defaultOptions: {
      // Never-stale seeded data resolves every query without a fetch.
      queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
    },
  });
  if (!loaded) return;
  // Literal keys: @dorkroom/logic does not publish its query-key factory.
  queryClient.setQueryData(['films', 'list'], [HP5, TRI_X]);
  queryClient.setQueryData(['developers', 'list'], [DDX, D76]);
  queryClient.setQueryData(['combinations', 'list'], [HP5_DDX, TRIX_D76]);
}

/** Opens the page at `search` with the catalogue already loaded. */
async function openAt(search: string) {
  window.history.replaceState(null, '', `/development${search}`);
  const rendered = renderHook(() => usePageUrlState(), { wrapper });
  await waitFor(() =>
    expect(rendered.result.current.url.initialUrlState.fromUrl).toBe(true)
  );
  return rendered;
}

/** Lets the URL hook's 300ms debounced writer run. */
async function flushUrlWrites() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 350));
  });
}

const currentParams = () => new URLSearchParams(window.location.search);

const customRecipe: CustomRecipe = {
  id: 'custom-1',
  name: 'My HP5',
  filmId: 'f1',
  developerId: 'd1',
  temperatureF: 68,
  timeMinutes: 9,
  shootingIso: 400,
  pushPull: 0,
  isCustomFilm: false,
  isCustomDeveloper: false,
  isPublic: true,
  dateCreated: TIMESTAMP,
  dateModified: TIMESTAMP,
};

describe('development recipes URL → state', () => {
  beforeEach(() => {
    seedCatalogue();
    va.mockReset();
    window.va = va;
  });

  afterEach(() => {
    window.history.replaceState(null, '', '/');
    vi.unstubAllGlobals();
    delete window.va;
  });

  it('applies film, developer, dilution, ISO and recipe type from a link', async () => {
    const { result } = await openAt(
      '?film=hp5-plus&developer=dd-x&dilution=1%2B4&iso=400&recipeType=only-custom'
    );

    await waitFor(() =>
      expect(result.current.recipes.selectedFilm?.slug).toBe('hp5-plus')
    );
    const { recipes } = result.current;
    expect(recipes.selectedDeveloper?.slug).toBe('dd-x');
    // Applied after the developer, whose setter clears the dilution.
    expect(recipes.dilutionFilter).toBe('1+4');
    expect(recipes.isoFilter).toBe('400');
    expect(recipes.customRecipeFilter).toBe<CustomRecipeFilter>('only-custom');
  });

  // 7569dd3f: ?iso=400&favorites=true lost both filters, the only two values
  // the router's JSON parser turned into a number and a boolean.
  it('applies the numeric ISO and favorites flag from a shared link', async () => {
    const { result } = await openAt('?iso=400&favorites=true');

    await waitFor(() => expect(result.current.favoritesOnly).toBe(true));
    expect(result.current.recipes.isoFilter).toBe('400');
  });

  it('maps the legacy view param onto favorites and recipe type', async () => {
    const favorites = await openAt('?view=favorites');
    await waitFor(() =>
      expect(favorites.result.current.favoritesOnly).toBe(true)
    );
    favorites.unmount();

    const custom = await openAt('?view=custom');
    await waitFor(() =>
      expect(custom.result.current.recipes.customRecipeFilter).toBe(
        'only-custom'
      )
    );
  });

  // e9789f1c: '400abc' passed the range check but never matched a recipe's ISO,
  // emptying the results with nothing visible to clear.
  it('canonicalises a lenient ISO value', async () => {
    const { result } = await openAt('?iso=400abc');

    await waitFor(() => expect(result.current.recipes.isoFilter).toBe('400'));
  });

  // d8d08aa8: sub-filters that arrived without their parent were applied with
  // no control on screen to undo them.
  it('ignores a dilution without a developer and box speed without a film', async () => {
    const { result } = await openAt(
      '?dilution=1%2B4&iso=boxspeed&developerType=powder'
    );

    await waitFor(() =>
      expect(result.current.recipes.developerTypeFilter).toBe('powder')
    );
    expect(result.current.recipes.dilutionFilter).toBe('');
    expect(result.current.recipes.isoFilter).toBe('');
  });

  // 2485cfb4 (#325): a developer hides the developer-type control, so a type
  // carried alongside one must not filter invisibly.
  it('drops developerType when the link also names a developer', async () => {
    const { result } = await openAt('?developer=d-76&developerType=powder');

    await waitFor(() =>
      expect(result.current.recipes.selectedDeveloper?.slug).toBe('d-76')
    );
    expect(result.current.recipes.developerTypeFilter).toBe('');
  });

  // d20f0a33 (#371): an invalid param stopped initialisation, so the valid
  // ones were never applied and filter changes never reached the URL again.
  it('applies the valid params next to an invalid one and keeps writing the URL', async () => {
    const { result } = await openAt('?iso=1&film=tri-x-400');

    await waitFor(() =>
      expect(result.current.recipes.selectedFilm?.slug).toBe('tri-x-400')
    );
    expect(result.current.recipes.isoFilter).toBe('');

    act(() => result.current.recipes.setIsoFilter('200'));
    await flushUrlWrites();

    expect(currentParams().get('iso')).toBe('200');
    expect(currentParams().get('film')).toBe('tri-x-400');
  });

  // f0f09a44: an orphaned sub-filter param touched no state, so nothing ever
  // rewrote it out of the URL.
  it('rewrites dropped params out of the URL right after initialising', async () => {
    await openAt('?dilution=1%2B4&utm_source=forum');
    await flushUrlWrites();

    expect(currentParams().has('dilution')).toBe(false);
    expect(currentParams().get('utm_source')).toBe('forum');
  });

  describe('search (q)', () => {
    it('fills the search before the catalogue has loaded', () => {
      seedCatalogue(false);
      // Keep the catalogue loading: its queries would otherwise hit the network.
      vi.stubGlobal('fetch', () => new Promise<never>(() => undefined));
      window.history.replaceState(null, '', '/development?q=rodinal');

      const { result } = renderHook(() => usePageUrlState(), { wrapper });

      expect(result.current.recipes.isLoaded).toBe(false);
      expect(result.current.recipes.searchQuery).toBe('rodinal');
    });

    // q is seeded at mount and the applier leaves it alone, so neither the
    // catalogue arriving nor the first canonical write undoes what was typed.
    it('keeps text typed while the catalogue loads', async () => {
      seedCatalogue(false);
      vi.stubGlobal('fetch', () => new Promise<never>(() => undefined));
      window.history.replaceState(null, '', '/development?q=rodinal');
      const { result } = renderHook(() => usePageUrlState(), { wrapper });

      act(() => result.current.recipes.setSearchQuery('d76'));
      act(() => {
        queryClient.setQueryData(['films', 'list'], [HP5, TRI_X]);
        queryClient.setQueryData(['developers', 'list'], [DDX, D76]);
        queryClient.setQueryData(['combinations', 'list'], [HP5_DDX, TRIX_D76]);
      });
      await waitFor(() =>
        expect(result.current.url.initialUrlState.fromUrl).toBe(true)
      );
      await flushUrlWrites();

      expect(result.current.recipes.searchQuery).toBe('d76');
      expect(currentParams().get('q')).toBe('d76');
    });

    it('round-trips an encoded query', async () => {
      const { result } = await openAt('?q=hp5+plus%20%26');
      expect(result.current.recipes.searchQuery).toBe('hp5 plus &');

      await flushUrlWrites();
      expect(currentParams().get('q')).toBe('hp5 plus &');
    });

    // #288: q had its own debounced read-modify-write writer racing the
    // filter writer on one history entry. Both now leave in one write.
    it('writes q and the filters together in one replaceState', async () => {
      const { result } = await openAt('');
      await flushUrlWrites();
      const replaceState = vi.spyOn(window.history, 'replaceState');

      act(() => {
        result.current.recipes.setSearchQuery('hp5');
        result.current.recipes.setSelectedFilm(HP5);
      });
      await flushUrlWrites();

      expect(replaceState).toHaveBeenCalledTimes(1);
      expect(currentParams().get('q')).toBe('hp5');
      expect(currentParams().get('film')).toBe('hp5-plus');
      replaceState.mockRestore();
    });

    // Only a managed q is rewritten into the canonical order (after unmanaged
    // params, ahead of film). An unmanaged q would stay where the link put it.
    it('rewrites a q from the link as a managed param', async () => {
      await openAt('?q=tri-x&utm_source=forum&film=hp5-plus');
      await flushUrlWrites();

      expect([...currentParams().keys()]).toEqual(['utm_source', 'q', 'film']);
      expect(currentParams().get('q')).toBe('tri-x');
    });
  });

  describe('recipe links', () => {
    // #508 / Codex on #509: the lookup ran against the filtered list, so a
    // detail URL whose search excludes its own recipe never opened, and the
    // next write dropped recipe=. Seeding q at mount made that immediate.
    describe('a recipe the search excludes', () => {
      const search = `?q=rodinal&recipe=${TRIX_D76.uuid}`;

      const expectOpenAndKept = async (result: {
        current: ReturnType<typeof usePageUrlState>;
      }) => {
        await waitFor(() => expect(result.current.isDetailOpen).toBe(true));
        expect(result.current.detailView?.combination.uuid).toBe(TRIX_D76.uuid);
        expect(result.current.recipes.searchQuery).toBe('rodinal');
        await flushUrlWrites();
        expect(currentParams().get('recipe')).toBe(TRIX_D76.uuid);
        expect(currentParams().get('q')).toBe('rodinal');
      };

      it('opens from a cached catalogue and keeps recipe= in the URL', async () => {
        const { result } = await openAt(search);
        expect(result.current.recipes.filteredCombinations).toEqual([]);

        await expectOpenAndKept(result);
      });

      it('opens once an uncached catalogue arrives', async () => {
        seedCatalogue(false);
        vi.stubGlobal('fetch', () => new Promise<never>(() => undefined));
        window.history.replaceState(null, '', `/development${search}`);
        const { result } = renderHook(() => usePageUrlState(), { wrapper });

        act(() => {
          queryClient.setQueryData(['films', 'list'], [HP5, TRI_X]);
          queryClient.setQueryData(['developers', 'list'], [DDX, D76]);
          queryClient.setQueryData(
            ['combinations', 'list'],
            [HP5_DDX, TRIX_D76]
          );
        });

        await expectOpenAndKept(result);
      });
    });

    // fec7ff5e: a recipe URL without source=share is the canonical address of
    // a detail view (a reload or a bookmark), not somebody else's share.
    it('opens a direct recipe link in the detail panel without counting a share', async () => {
      const { result } = await openAt(`?recipe=${TRIX_D76.uuid}`);

      await waitFor(() => expect(result.current.isDetailOpen).toBe(true));
      expect(result.current.detailView?.combination.uuid).toBe(TRIX_D76.uuid);
      expect(result.current.detailView?.source).toBe('api');
      expect(result.current.isFiltersSidebarCollapsed).toBe(true);
      expect(sentEvents()).toEqual([]);
    });

    it('keeps the open recipe in the URL as its canonical address', async () => {
      const { result } = await openAt(`?recipe=${TRIX_D76.uuid}`);
      await waitFor(() => expect(result.current.isDetailOpen).toBe(true));
      await flushUrlWrites();

      expect(currentParams().get('recipe')).toBe(TRIX_D76.uuid);
    });

    it('opens a full share link in the detail panel and counts it once', async () => {
      const { result } = await openAt(
        `?film=hp5-plus&developer=dd-x&recipe=${HP5_DDX.uuid}&source=share`
      );

      await waitFor(() => expect(result.current.isDetailOpen).toBe(true));
      expect(result.current.detailView?.combination.uuid).toBe(HP5_DDX.uuid);
      expect(sentEvents()).toEqual([
        { name: 'share_opened', data: { tool: 'recipe' } },
      ]);
    });

    it('offers a share link without film and developer in the shared-recipe modal', async () => {
      const { result } = await openAt(`?recipe=${HP5_DDX.uuid}&source=share`);

      await waitFor(() =>
        expect(result.current.isSharedRecipeModalOpen).toBe(true)
      );
      expect(result.current.sharedRecipeSource).toBe('shared');
      expect(result.current.sharedRecipeView?.combination.uuid).toBe(
        HP5_DDX.uuid
      );
      expect(result.current.isDetailOpen).toBe(false);
    });

    it('offers a shared custom recipe in the shared-recipe modal', async () => {
      const encoded = encodeCustomRecipe(customRecipe);
      const { result } = await openAt(`?recipe=${encoded}&source=share`);

      await waitFor(() =>
        expect(result.current.isSharedRecipeModalOpen).toBe(true)
      );
      expect(result.current.sharedRecipeSource).toBe('custom');
      expect(sentEvents()).toEqual([
        { name: 'share_opened', data: { tool: 'custom_recipe' } },
      ]);
    });
  });

  it('applies the link once: later URL changes do not overwrite user choices', async () => {
    const { result } = await openAt('?film=hp5-plus');
    await waitFor(() =>
      expect(result.current.recipes.selectedFilm?.slug).toBe('hp5-plus')
    );

    act(() => result.current.recipes.setSelectedFilm(null));
    await flushUrlWrites();
    expect(currentParams().has('film')).toBe(false);

    // The URL changes underneath the page (back/forward). The store re-reads
    // it and re-derives initialUrlState, but the applier has already run.
    act(() => {
      window.history.replaceState(null, '', '/development?film=hp5-plus');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await waitFor(() =>
      expect(result.current.url.initialUrlState.selectedFilm?.slug).toBe(
        'hp5-plus'
      )
    );

    expect(result.current.recipes.selectedFilm).toBeNull();
  });
});
