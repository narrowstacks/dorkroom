import type { Combination, Developer, Film } from '@dorkroom/api';
import type { CustomRecipe } from '@dorkroom/logic';
import {
  MeasurementProvider,
  ThemeProvider,
  ToastProvider,
  VolumeProvider,
} from '@dorkroom/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { StrictMode } from 'react';
import { vi } from 'vitest';
import RecipeWorkbenchPage from '../recipe-workbench-page';
import { useBrowserUrlBinding } from './browser-url-binding';

const T = '2026-01-01T00:00:00.000Z';

const film = (
  slug: string,
  brand: string,
  name: string,
  more: Partial<Film> = {}
): Film => ({
  id: 1,
  uuid: `uuid-${slug}`,
  slug,
  brand,
  name,
  colorType: 'bw',
  isoSpeed: 400,
  grainStructure: null,
  description: '',
  manufacturerNotes: null,
  reciprocityFailure: null,
  discontinued: false,
  staticImageUrl: null,
  imageCredit: null,
  imageSourceUrl: null,
  aliases: [],
  baseFilmSlug: null,
  dateAdded: T,
  createdAt: T,
  updatedAt: T,
  ...more,
});

const developer = (slug: string, manufacturer: string, name: string) =>
  ({
    id: 1,
    uuid: `uuid-${slug}`,
    slug,
    name,
    manufacturer,
    type: 'powder',
    description: '',
    filmOrPaper: true,
    dilutions: [],
    mixingInstructions: null,
    storageRequirements: null,
    safetyNotes: null,
    imageCredit: null,
    imageSourceUrl: null,
    notes: null,
    createdAt: T,
    updatedAt: T,
  }) satisfies Developer;

export const FILMS = {
  hp5: film('ilford-hp5-plus', 'Ilford', 'HP5 Plus'),
  triX: film('kodak-tri-x-400', 'Kodak', 'Tri-X 400'),
  ladyGrey: film('lady-grey-400', 'Lady Grey', '400'),
  arista: film('arista-edu-ultra-400', 'Arista', 'EDU Ultra 400', {
    baseFilmSlug: 'lady-grey-400',
  }),
  panF: film('ilford-pan-f-plus', 'Ilford', 'Pan F Plus', { isoSpeed: 50 }),
};

export const DEVELOPERS = {
  xtol: developer('kodak-xtol', 'Kodak', 'XTOL'),
  ddx: developer('ilford-dd-x', 'Ilford', 'DD-X'),
  rodinal: developer('agfa-rodinal', 'Agfa', 'Rodinal'),
};

export const id = (n: number) =>
  `11111111-1111-4111-8111-${String(n).padStart(12, '0')}`;

const recipe = (
  n: number,
  filmSlug: string,
  developerSlug: string,
  more: Partial<Combination> = {}
): Combination => ({
  id: n,
  uuid: id(n),
  name: `Recipe ${n}`,
  filmStockId: filmSlug,
  filmSlug,
  developerId: `uuid-${developerSlug}`,
  developerSlug,
  shootingIso: 400,
  dilutionId: null,
  customDilution: 'Stock',
  temperatureC: 20,
  temperatureF: 68,
  timeMinutes: n,
  agitationMethod: '',
  agitationSchedule: null,
  pushPull: 0,
  tags: ['official-ilford'],
  notes: null,
  infoSource: null,
  createdAt: T,
  updatedAt: T,
  ...more,
});

const hp5 = FILMS.hp5.slug;
const xtol = DEVELOPERS.xtol.slug;

/** Times are the id's number, so a time on screen says which row is open. */
export const RECIPES = {
  hp5XtolStock: recipe(7, hp5, xtol),
  hp5XtolDefault: recipe(9, hp5, xtol, { customDilution: '1+1' }),
  hp5Xtol800: recipe(12, hp5, xtol, {
    customDilution: '1+1',
    shootingIso: 800,
  }),
  hp5Xtol24C: recipe(5, hp5, xtol, {
    customDilution: '1+1',
    temperatureC: 24,
    temperatureF: 75.2,
  }),
  hp5Ddx: recipe(11, hp5, DEVELOPERS.ddx.slug, { customDilution: '1+4' }),
  triXDdx: recipe(8, FILMS.triX.slug, DEVELOPERS.ddx.slug),
  ladyGreyXtol: recipe(10, FILMS.ladyGrey.slug, xtol),
  ladyGreyXtolPush: recipe(14, FILMS.ladyGrey.slug, xtol, { shootingIso: 800 }),
};

export const CUSTOM_ID = 'custom_1700000000000_abcdefghi';
export const CUSTOM_ON_CATALOGUE: CustomRecipe = {
  id: CUSTOM_ID,
  name: 'My Tri-X',
  filmId: FILMS.triX.uuid,
  developerId: DEVELOPERS.xtol.uuid,
  temperatureF: 68,
  timeMinutes: 13,
  shootingIso: 400,
  pushPull: 0,
  customDilution: '1+3',
  notes: '',
  isCustomFilm: false,
  isCustomDeveloper: false,
  dateCreated: T,
  dateModified: T,
  isPublic: false,
};

export const CUSTOM_OWN_ID = 'custom_1700000000001_jklmnopqr';
export const CUSTOM_OWN_FILM: CustomRecipe = {
  ...CUSTOM_ON_CATALOGUE,
  id: CUSTOM_OWN_ID,
  name: 'Home brew',
  filmId: 'custom_film_1',
  developerId: 'custom_dev_1',
  isCustomFilm: true,
  isCustomDeveloper: true,
  timeMinutes: 15,
  customFilm: {
    brand: 'Home',
    name: 'Stock 200',
    isoSpeed: 200,
    colorType: 'bw',
  },
  customDeveloper: {
    manufacturer: 'Home',
    name: 'Caffenol',
    type: 'powder',
    filmOrPaper: 'film',
    dilutions: [{ name: 'Stock', dilution: 'Stock' }],
  },
};

export const CUSTOM_ORPHAN_ID = 'custom_1700000000002_stuvwxyz0';
export const CUSTOM_ORPHAN: CustomRecipe = {
  ...CUSTOM_ON_CATALOGUE,
  id: CUSTOM_ORPHAN_ID,
  name: 'Lost film recipe',
  filmId: 'uuid-film-that-left-the-catalogue',
};

export function createClient() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
    },
  });
  return client;
}

export function seedCatalogue(
  client: QueryClient,
  {
    films = Object.values(FILMS),
    developers = Object.values(DEVELOPERS),
    combinations = Object.values(RECIPES),
  }: {
    films?: Film[];
    developers?: Developer[];
    combinations?: Combination[] | null;
  } = {}
) {
  // Literal keys: @dorkroom/logic does not publish its query-key factory.
  client.setQueryData(['films', 'list'], films);
  client.setQueryData(['developers', 'list'], developers);
  if (combinations) client.setQueryData(['combinations', 'list'], combinations);
}

function PageAtBrowserUrl() {
  return <RecipeWorkbenchPage url={useBrowserUrlBinding()} />;
}

export function renderWorkbench({
  search = '',
  customRecipes = [],
  favorites = [],
  client,
}: {
  search?: string;
  customRecipes?: CustomRecipe[];
  favorites?: string[];
  client?: QueryClient;
} = {}) {
  window.history.replaceState(null, '', `/development${search}`);
  localStorage.setItem('dorkroom-temperature-unit', 'celsius');
  if (customRecipes.length > 0) {
    localStorage.setItem(
      'dorkroom_custom_recipes',
      JSON.stringify(customRecipes)
    );
  }
  if (favorites.length > 0) {
    localStorage.setItem(
      'dorkroom_favorite_recipes',
      JSON.stringify(favorites)
    );
  }
  let queryClient = client;
  if (!queryClient) {
    queryClient = createClient();
    seedCatalogue(queryClient);
  }
  // StrictMode as in main.tsx: the seed and its share_opened must survive it.
  return render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <MeasurementProvider>
            <VolumeProvider>
              <ToastProvider>
                <PageAtBrowserUrl />
              </ToastProvider>
            </VolumeProvider>
          </MeasurementProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </StrictMode>
  );
}

export function stubBrowser() {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: /min-width/.test(query),
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }));
  Element.prototype.scrollIntoView = vi.fn();
}

export const params = () => new URLSearchParams(window.location.search);

/** Waits out the page's 300ms debounced URL writer. */
export const URL_SYNC = { timeout: 2000 };

export const filmPicker = () => screen.getByRole('combobox', { name: 'Film' });
export const developerPicker = () =>
  screen.getByRole('combobox', { name: 'Developer' });

export async function choose(picker: HTMLElement, option: RegExp) {
  await userEvent.setup().click(picker);
  fireEvent.click(await screen.findByRole('option', { name: option }));
}

/** The panel's heading, once a recipe is open. */
export const panelHeading = () =>
  screen.findByRole('heading', { level: 2, name: / in / });

/** The prompt's only sign is the absence of a panel and a recipe list. */
export const queryRecipeList = () =>
  screen.queryByRole('list', { name: 'Recipes for this film and developer' });
export const queryPanelHeading = () =>
  screen.queryByRole('heading', { level: 2, name: / in / });

export const search = () =>
  screen.getByRole('searchbox', { name: 'Or search' });

interface TrackedEvent {
  name: string;
  data?: unknown;
}

/**
 * `@vercel/analytics` forwards each event to `window.va`, the queue its script
 * installs in production, so this reads what the real `trackEvent` sends.
 */
export function recordAnalytics() {
  const va = vi.fn<NonNullable<Window['va']>>();
  window.va = va;
  return () =>
    va.mock.calls
      .filter(([kind]) => kind === 'event')
      .map(([, properties]) => {
        // SAFETY: @vercel/analytics' track() always passes `{ name, data }` with
        // the 'event' kind filtered for above.
        const { name, data } = properties as TrackedEvent;
        return { name, data };
      });
}
