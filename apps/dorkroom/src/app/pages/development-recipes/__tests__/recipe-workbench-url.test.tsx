import '@testing-library/jest-dom/vitest';
import { encodeCustomRecipe } from '@dorkroom/logic';
import { act, cleanup, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  choose,
  createClient,
  CUSTOM_ID,
  CUSTOM_ON_CATALOGUE,
  CUSTOM_OWN_FILM,
  CUSTOM_OWN_ID,
  developerPicker,
  DEVELOPERS,
  filmPicker,
  FILMS,
  id,
  panelHeading,
  params,
  queryPanelHeading,
  queryRecipeList,
  RECIPES,
  recordAnalytics,
  renderWorkbench,
  search,
  seedCatalogue,
  stubBrowser,
  URL_SYNC,
} from './workbench-test-setup';

const HP5 = FILMS.hp5.slug;
const XTOL = DEVELOPERS.xtol.slug;
const DDX = DEVELOPERS.ddx.slug;
const DEFAULT_ID = RECIPES.hp5XtolDefault.uuid;

const pair = `film=${HP5}&developer=${XTOL}`;
let sent = recordAnalytics();
const sharesOpened = () => sent().filter(({ name }) => name === 'share_opened');

/** Resolves once the debounced writer has made the URL read exactly this. */
const expectUrl = async (expected: Record<string, string>) => {
  const read = () => expect(Object.fromEntries(params())).toEqual(expected);
  await waitFor(read, URL_SYNC);
  // A URL that already reads right proves nothing until the writer has run.
  await act(() => new Promise((done) => setTimeout(done, 350)));
  read();
};

beforeEach(() => {
  localStorage.clear();
  stubBrowser();
  sent = recordAnalytics();
});

afterEach(() => {
  cleanup();
  delete window.va;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
  window.history.replaceState(null, '', '/');
});

describe('the URL table', () => {
  it('no params: the prompt with no list, and nothing written', async () => {
    renderWorkbench();
    expect(
      await screen.findByRole('heading', { name: 'What are you developing?' })
    ).toBeVisible();
    expect(queryRecipeList()).toBeNull();
    expect(queryPanelHeading()).toBeNull();
    await new Promise((done) => setTimeout(done, 350));
    expect(window.location.search).toBe('');
  });

  it('recipe: opens it, fills the pickers, writes film, developer and recipe', async () => {
    renderWorkbench({ search: `?recipe=${RECIPES.hp5Ddx.uuid}` });
    expect(await panelHeading()).toHaveTextContent(
      'Ilford HP5 Plus in Ilford DD-X'
    );
    await expectUrl({
      film: HP5,
      developer: DDX,
      recipe: RECIPES.hp5Ddx.uuid,
    });
    expect(filmPicker()).toHaveValue('Ilford HP5 Plus');
    expect(developerPicker()).toHaveValue('Ilford DD-X');
    expect(sharesOpened()).toHaveLength(0);
  });

  // #508: the link must resolve against the whole catalogue, not what the
  // search or scope leaves.
  it('recipe: opens whatever q and the scope say, and both stay (#508)', async () => {
    renderWorkbench({
      search: `?q=zzz-no-match&favorites=true&recipe=${RECIPES.hp5Ddx.uuid}`,
    });
    expect(await panelHeading()).toHaveTextContent(
      'Ilford HP5 Plus in Ilford DD-X'
    );
    await expectUrl({
      q: 'zzz-no-match',
      film: HP5,
      developer: DDX,
      favorites: 'true',
      recipe: RECIPES.hp5Ddx.uuid,
    });
  });

  it('recipe with source=share: opens with no dialog, counts once, drops source', async () => {
    renderWorkbench({
      search: `?recipe=${RECIPES.hp5Ddx.uuid}&source=share`,
    });
    expect(await panelHeading()).toHaveTextContent('Ilford DD-X');
    expect(screen.queryByRole('dialog')).toBeNull();
    await expectUrl({
      film: HP5,
      developer: DDX,
      recipe: RECIPES.hp5Ddx.uuid,
    });
    expect(sharesOpened()).toEqual([
      { name: 'share_opened', data: { tool: 'recipe' } },
    ]);
  });

  it('encoded recipe: the shared dialog over the prompt, recipe and source removed', async () => {
    renderWorkbench({
      search: `?recipe=${encodeCustomRecipe(CUSTOM_ON_CATALOGUE)}&source=share`,
    });
    expect(await screen.findByText('Custom Recipe Shared')).toBeVisible();
    expect(queryPanelHeading()).toBeNull();
    await expectUrl({});
    expect(screen.getByText('Custom Recipe Shared')).toBeVisible();
    expect(sharesOpened()).toEqual([
      { name: 'share_opened', data: { tool: 'custom_recipe' } },
    ]);
  });

  it('encoded recipe: a catalogue refetch before the URL is cleaned counts and opens once', async () => {
    const client = createClient();
    seedCatalogue(client);
    renderWorkbench({
      search: `?recipe=${encodeCustomRecipe(CUSTOM_ON_CATALOGUE)}&source=share`,
      client,
    });
    await screen.findByText('Custom Recipe Shared');
    act(() =>
      seedCatalogue(client, {
        films: [
          ...Object.values(FILMS),
          { ...FILMS.panF, slug: 'new-film', uuid: 'uuid-new-film' },
        ],
      })
    );
    await expectUrl({});
    expect(sharesOpened()).toHaveLength(1);
  });

  it('bad encoded recipe: the banner stays after the URL is cleaned (shared-recipe banner)', async () => {
    renderWorkbench({
      search: `?recipe=${'x'.repeat(60)}&source=share`,
    });
    await screen.findByText('Invalid custom recipe data');
    await expectUrl({});
    expect(screen.getByText('Invalid custom recipe data')).toBeVisible();
    expect(screen.queryByText('Custom Recipe Shared')).toBeNull();
  });

  it('unknown shared uuid: says so in the banner, then the prompt', async () => {
    renderWorkbench({ search: `?recipe=${id(999)}&source=share` });
    await screen.findByText(/^Recipe with ID .* not found$/);
    await expectUrl({});
    expect(queryPanelHeading()).toBeNull();
    expect(sharesOpened()).toHaveLength(0);
  });

  it('dismissing the banner removes it', async () => {
    renderWorkbench({ search: `?recipe=${'x'.repeat(60)}&source=share` });
    (
      await screen.findByRole('button', {
        name: 'Dismiss shared recipe message',
      })
    ).click();
    await waitFor(() =>
      expect(screen.queryByText('Invalid custom recipe data')).toBeNull()
    );
  });

  it('custom recipe on catalogue names: opens, with film and developer written', async () => {
    renderWorkbench({
      search: `?recipe=${CUSTOM_ID}`,
      customRecipes: [CUSTOM_ON_CATALOGUE],
    });
    expect(await panelHeading()).toHaveTextContent(
      'Kodak Tri-X 400 in Kodak XTOL'
    );
    await expectUrl({
      film: FILMS.triX.slug,
      developer: XTOL,
      recipe: CUSTOM_ID,
    });
  });

  it('custom recipe on its own names: opens, with only recipe written', async () => {
    renderWorkbench({
      search: `?recipe=${CUSTOM_OWN_ID}`,
      customRecipes: [CUSTOM_OWN_FILM],
    });
    expect(await panelHeading()).toHaveTextContent(
      'Home Stock 200 in Home Caffenol'
    );
    expect(filmPicker()).toHaveValue('Home Stock 200');
    await expectUrl({ recipe: CUSTOM_OWN_ID });
  });

  it('custom id on a device without it: ignored and removed', async () => {
    renderWorkbench({ search: `?recipe=${CUSTOM_ID}` });
    await expectUrl({});
    expect(queryPanelHeading()).toBeNull();
  });

  it('unknown recipe: ignored, then the pair applies and recipe is replaced', async () => {
    renderWorkbench({ search: `?${pair}&recipe=${id(999)}` });
    expect(await panelHeading()).toHaveTextContent(
      'Ilford HP5 Plus in Kodak XTOL'
    );
    await expectUrl({ film: HP5, developer: XTOL, recipe: DEFAULT_ID });
  });

  it('malformed recipe does not stop the rest of the link (#371)', async () => {
    renderWorkbench({ search: `?${pair}&recipe=bad!` });
    expect(await panelHeading()).toHaveTextContent(
      'Ilford HP5 Plus in Kodak XTOL'
    );
    await expectUrl({ film: HP5, developer: XTOL, recipe: DEFAULT_ID });
  });

  it('invalid params are dropped and writing still works afterwards (#371)', async () => {
    renderWorkbench({
      search: `?film=${HP5}&iso=notanumber&dilution=%3Cscript%3E&recipeType=nope`,
    });
    await expectUrl({ film: HP5 });
    await choose(developerPicker(), /^Kodak XTOL/);
    await expectUrl({ film: HP5, developer: XTOL, recipe: DEFAULT_ID });
  });

  it('film and developer: opens the default and adds recipe', async () => {
    renderWorkbench({ search: `?${pair}` });
    expect(await panelHeading()).toHaveTextContent(
      'Ilford HP5 Plus in Kodak XTOL'
    );
    expect(screen.getAllByText('9:00').length).toBeGreaterThan(0);
    await expectUrl({ film: HP5, developer: XTOL, recipe: DEFAULT_ID });
  });

  it('pair with none in scope: prompt, film kept, note shown, developer removed', async () => {
    renderWorkbench({ search: `?${pair}&favorites=true` });
    await screen.findByText(
      'No XTOL recipes for Ilford HP5 Plus among saved recipes.'
    );
    expect(queryPanelHeading()).toBeNull();
    expect(filmPicker()).toHaveValue('Ilford HP5 Plus');
    expect(developerPicker()).toHaveValue('');
    await expectUrl({ film: HP5, favorites: 'true' });
  });

  it('pair with none in scope: a dilution goes with the developer it needs', async () => {
    renderWorkbench({ search: `?${pair}&favorites=true&dilution=Stock` });
    await screen.findByText(/^No XTOL recipes/);
    await expectUrl({ film: HP5, favorites: 'true' });
  });

  it('pair with no recipes at all: same, for a film and developer that never met', async () => {
    renderWorkbench({ search: `?film=${FILMS.panF.slug}&developer=${XTOL}` });
    await screen.findByText('No XTOL recipes for Ilford Pan F Plus.');
    await expectUrl({ film: FILMS.panF.slug });
  });

  it.each([
    ['film', `film=${HP5}`, () => filmPicker(), 'Ilford HP5 Plus'],
    [
      'a film with no recipes',
      `film=${FILMS.panF.slug}`,
      () => filmPicker(),
      'Ilford Pan F Plus',
    ],
    ['developer', `developer=${XTOL}`, () => developerPicker(), 'Kodak XTOL'],
  ])(
    '%s alone: prompt with it selected, unchanged',
    async (_name, query, picker, shown) => {
      renderWorkbench({ search: `?${query}` });
      await waitFor(() => expect(picker()).toHaveValue(shown));
      expect(queryPanelHeading()).toBeNull();
      await new Promise((done) => setTimeout(done, 350));
      expect(window.location.search).toBe(`?${query}`);
    }
  );

  it('film alias: selected under its canonical slug', async () => {
    const client = createClient();
    seedCatalogue(client, {
      films: [
        {
          ...FILMS.hp5,
          aliases: [{ slug: 'hp5', name: 'HP5' }],
        },
      ],
    });
    renderWorkbench({ search: '?film=hp5', client });
    await expectUrl({ film: HP5 });
  });

  it('unknown slugs: ignored and removed', async () => {
    renderWorkbench({ search: '?film=no-such-film&developer=no-such-dev' });
    await expectUrl({});
    expect(filmPicker()).toHaveValue('');
    expect(queryPanelHeading()).toBeNull();
  });

  it('q: seeds the box and shows results on the prompt', async () => {
    renderWorkbench({ search: '?q=hp5' });
    expect(
      await screen.findByRole('list', { name: 'Search results' })
    ).toBeVisible();
    expect(search()).toHaveValue('hp5');
    await new Promise((done) => setTimeout(done, 350));
    expect(window.location.search).toBe('?q=hp5');
  });

  it('q beside a pair: results replace the list, and q goes once one is picked', async () => {
    renderWorkbench({ search: `?${pair}&q=tri-x` });
    const results = await screen.findByRole('list', { name: 'Search results' });
    expect(await panelHeading()).toHaveTextContent(
      'Ilford HP5 Plus in Kodak XTOL'
    );
    expect(queryRecipeList()).toBeNull();
    await expectUrl({
      q: 'tri-x',
      film: HP5,
      developer: XTOL,
      recipe: DEFAULT_ID,
    });

    results.querySelector('button')?.click();
    await waitFor(async () =>
      expect(await panelHeading()).toHaveTextContent('Kodak Tri-X 400')
    );
    await expectUrl({
      film: FILMS.triX.slug,
      developer: DDX,
      recipe: RECIPES.triXDdx.uuid,
    });
    expect(queryRecipeList()).toBeVisible();
  });

  it('dilution: chooses the match, removed once open', async () => {
    renderWorkbench({ search: `?${pair}&dilution=Stock` });
    await panelHeading();
    await expectUrl({
      film: HP5,
      developer: XTOL,
      recipe: RECIPES.hp5XtolStock.uuid,
    });
    expect(screen.queryByText(/No published recipe/)).toBeNull();
  });

  it('dilution with no match: the default plus a notice', async () => {
    renderWorkbench({ search: `?${pair}&dilution=1%2B9` });
    await screen.findByText(
      'No published recipe for 1+9, so this is the default for the pair.'
    );
    await expectUrl({ film: HP5, developer: XTOL, recipe: DEFAULT_ID });
  });

  it('dilution without a developer: dropped', async () => {
    renderWorkbench({ search: `?film=${HP5}&dilution=Stock` });
    await expectUrl({ film: HP5 });
  });

  it('dilution with only a developer: kept until a pair is chosen, then spent', async () => {
    renderWorkbench({ search: `?developer=${XTOL}&dilution=Stock` });
    await waitFor(() => expect(developerPicker()).toHaveValue('Kodak XTOL'));
    await new Promise((done) => setTimeout(done, 350));
    expect(window.location.search).toBe(`?developer=${XTOL}&dilution=Stock`);

    await choose(filmPicker(), /^Ilford HP5 Plus/);
    await expectUrl({
      film: HP5,
      developer: XTOL,
      recipe: RECIPES.hp5XtolStock.uuid,
    });
  });

  it('iso: chooses the match, removed once open', async () => {
    renderWorkbench({ search: `?${pair}&iso=800` });
    await panelHeading();
    await expectUrl({
      film: HP5,
      developer: XTOL,
      recipe: RECIPES.hp5Xtol800.uuid,
    });
  });

  it('iso=boxspeed: reads the selected film', async () => {
    renderWorkbench({
      search: `?film=${FILMS.ladyGrey.slug}&developer=${XTOL}&iso=boxspeed`,
    });
    await panelHeading();
    await expectUrl({
      film: FILMS.ladyGrey.slug,
      developer: XTOL,
      recipe: RECIPES.ladyGreyXtol.uuid,
    });
  });

  it('iso with no match: the default plus a notice', async () => {
    renderWorkbench({ search: `?${pair}&iso=3200` });
    await screen.findByText(
      'No published recipe for EI 3200, so this is the default for the pair.'
    );
    await expectUrl({ film: HP5, developer: XTOL, recipe: DEFAULT_ID });
  });

  it('iso alone: kept as a hint until a pair is chosen', async () => {
    renderWorkbench({ search: '?iso=800' });
    await screen.findByRole('heading', { name: 'What are you developing?' });
    await new Promise((done) => setTimeout(done, 350));
    expect(window.location.search).toBe('?iso=800');

    await choose(filmPicker(), /^Ilford HP5 Plus/);
    await expectUrl({ film: HP5, iso: '800' });
    await choose(developerPicker(), /^Kodak XTOL/);
    await expectUrl({
      film: HP5,
      developer: XTOL,
      recipe: RECIPES.hp5Xtol800.uuid,
    });
  });

  const scopeChecked = (name: string) =>
    expect(screen.getByRole('radio', { name })).toBeChecked();

  it.each([
    ['favorites=true', { favorites: 'true' }],
    ['view=favorites', { favorites: 'true' }],
    ['favorites=true&recipeType=only-custom', { favorites: 'true' }],
    ['favorites=true&recipeType=official', { favorites: 'true' }],
  ])('%s: Saved, written as favorites=true', async (query, written) => {
    renderWorkbench({ search: `?${query}` });
    await waitFor(() => scopeChecked('Saved'));
    await expectUrl(written);
  });

  it.each([
    ['recipeType=official', 'Official', { recipeType: 'official' }],
    ['recipeType=hide-custom', 'Official', { recipeType: 'official' }],
    ['recipeType=only-custom', 'Custom', { recipeType: 'only-custom' }],
    ['view=custom', 'Custom', { recipeType: 'only-custom' }],
    ['recipeType=official&view=custom', 'Official', { recipeType: 'official' }],
    ['recipeType=all', 'All', {}],
  ])('%s: %s', async (query, scope, written) => {
    renderWorkbench({ search: `?${query}` });
    await waitFor(() => scopeChecked(scope));
    await expectUrl(written);
  });

  it('developerType: ignored with no notice, and removed', async () => {
    renderWorkbench({ search: '?developerType=powder' });
    await expectUrl({});
    expect(
      screen.queryByRole('status', { name: /developer type/i })
    ).toBeNull();
    expect(screen.queryByText(/powder/i)).toBeNull();
  });

  it('utm params: carried through every write', async () => {
    renderWorkbench({ search: `?utm_source=newsletter&${pair}` });
    await expectUrl({
      utm_source: 'newsletter',
      film: HP5,
      developer: XTOL,
      recipe: DEFAULT_ID,
    });
  });
});

describe('a home answer link to a rebrand-shared recipe', () => {
  const ARISTA = FILMS.arista.slug;
  const LINK = `?film=${ARISTA}&developer=${XTOL}&iso=400&dilution=Stock&recipe=${RECIPES.ladyGreyXtol.uuid}`;

  it('stays on the film it names, and iso and dilution come off', async () => {
    renderWorkbench({ search: LINK });
    expect(await panelHeading()).toHaveTextContent(
      'Arista EDU Ultra 400 in Kodak XTOL'
    );
    expect(filmPicker()).toHaveValue('Arista EDU Ultra 400');
    await expectUrl({
      film: ARISTA,
      developer: XTOL,
      recipe: RECIPES.ladyGreyXtol.uuid,
    });
    expect(filmPicker()).toHaveValue('Arista EDU Ultra 400');
    expect(screen.queryByText(/Lady Grey/)).toBeNull();
  });

  it('falls to the owning film when the URL names a film that does not share it', async () => {
    renderWorkbench({
      search: `?film=${HP5}&developer=${XTOL}&recipe=${RECIPES.ladyGreyXtol.uuid}`,
    });
    expect(await panelHeading()).toHaveTextContent(
      'Lady Grey 400 in Kodak XTOL'
    );
    await expectUrl({
      film: FILMS.ladyGrey.slug,
      developer: XTOL,
      recipe: RECIPES.ladyGreyXtol.uuid,
    });
  });

  it("uses the recipe's developer when the URL names another", async () => {
    renderWorkbench({
      search: `?film=${ARISTA}&developer=${DDX}&recipe=${RECIPES.ladyGreyXtol.uuid}`,
    });
    expect(await panelHeading()).toHaveTextContent(
      'Arista EDU Ultra 400 in Kodak XTOL'
    );
  });
});

describe('while the catalogue loads', () => {
  const never = () => new Promise<Response>(() => undefined);

  it('writes nothing while films are in but recipes are not', async () => {
    vi.stubGlobal('fetch', vi.fn(never));
    const client = createClient();
    seedCatalogue(client, { combinations: null });
    const link = `?${pair}&iso=800`;
    renderWorkbench({ search: link, client });

    await new Promise((done) => setTimeout(done, 450));
    expect(window.location.search).toBe(link);

    seedCatalogue(client);
    expect(await panelHeading()).toHaveTextContent(
      'Ilford HP5 Plus in Kodak XTOL'
    );
    await expectUrl({
      film: HP5,
      developer: XTOL,
      recipe: RECIPES.hp5Xtol800.uuid,
    });
  });

  it('shows the skeleton, never the prompt, until a deep link has resolved', async () => {
    vi.stubGlobal('fetch', vi.fn(never));
    const client = createClient();
    seedCatalogue(client, { combinations: null });
    renderWorkbench({ search: `?${pair}`, client });

    expect(screen.getByTestId('workbench-skeleton')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'What are you developing?' })
    ).toBeNull();

    seedCatalogue(client);
    await panelHeading();
    expect(screen.queryByTestId('workbench-skeleton')).toBeNull();
  });

  it('with no link, shows the prompt straight away and hides "no results" for q', async () => {
    vi.stubGlobal('fetch', vi.fn(never));
    const client = createClient();
    renderWorkbench({ search: '?q=hp5', client });
    expect(
      screen.getByRole('heading', { name: 'What are you developing?' })
    ).toBeVisible();
    expect(screen.getByText('Loading recipes…')).toBeVisible();
    expect(search()).toHaveValue('hp5');
    expect(screen.queryByText(/No recipes match/)).toBeNull();
  });

  it('a shared uuid waits for the catalogue instead of reading as unknown', async () => {
    vi.stubGlobal('fetch', vi.fn(never));
    const client = createClient();
    seedCatalogue(client, { combinations: null });
    renderWorkbench({
      search: `?recipe=${RECIPES.hp5Ddx.uuid}&source=share`,
      client,
      customRecipes: [CUSTOM_ON_CATALOGUE],
    });
    await new Promise((done) => setTimeout(done, 50));
    expect(screen.queryByText(/not found/)).toBeNull();

    seedCatalogue(client);
    expect(await panelHeading()).toHaveTextContent('Ilford DD-X');
  });
});
