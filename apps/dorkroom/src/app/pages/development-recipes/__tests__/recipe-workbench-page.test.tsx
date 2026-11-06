import '@testing-library/jest-dom/vitest';
import { type CustomRecipe, encodeCustomRecipe } from '@dorkroom/logic';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  renderHook,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorkbenchCatalog } from '../hooks/useWorkbenchCatalog';
import { CUSTOM_RECIPE_FORM_DEFAULT } from '../utils/recipeUtils';
import {
  choose,
  createClient,
  CUSTOM_ID,
  CUSTOM_ON_CATALOGUE,
  CUSTOM_ORPHAN,
  CUSTOM_OWN_FILM,
  CUSTOM_OWN_ID,
  developerPicker,
  DEVELOPERS,
  filmPicker,
  FILMS,
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
const pair = `film=${HP5}&developer=${XTOL}`;
const writeText = vi.fn<(text: string) => Promise<void>>();

let sent = recordAnalytics();
const events = (name: string) => sent().filter((event) => event.name === name);
const recipeList = () =>
  screen.getByRole('list', { name: 'Recipes for this film and developer' });
const row = (name: RegExp) =>
  within(recipeList()).getByRole('button', { name });
const announcement = () => screen.getByText(/^Opened /);
const prompt = () =>
  screen.findByRole('heading', { name: 'What are you developing?' });
const heldUrl = (name: string) => params().get(name);
const button = (name: string | RegExp) => screen.getByRole('button', { name });

beforeEach(() => {
  localStorage.clear();
  stubBrowser();
  sent = recordAnalytics();
  writeText.mockReset();
  writeText.mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
});

afterEach(() => {
  cleanup();
  delete window.va;
  vi.unstubAllGlobals();
  localStorage.clear();
  window.history.replaceState(null, '', '/');
  document.body.style.overflow = '';
});

describe('the prompt', () => {
  it('outlines the picker still needed, film first', async () => {
    renderWorkbench();
    await prompt();
    expect(filmPicker().className).toContain('outline-dashed');
    expect(developerPicker().className).not.toContain('outline-dashed');
    await choose(filmPicker(), /^Ilford HP5 Plus/);
    expect(developerPicker().className).toContain('outline-dashed');
    expect(filmPicker().className).not.toContain('outline-dashed');
  });

  it('outlines the film when the developer came first', async () => {
    renderWorkbench();
    await prompt();
    await choose(developerPicker(), /^Kodak XTOL/);
    expect(filmPicker().className).toContain('outline-dashed');
    expect(queryRecipeList()).toBeNull();
  });

  it('offers Add and Import, and saved recipes only when there are some', async () => {
    renderWorkbench();
    await prompt();
    expect(button('Add custom recipe')).toBeVisible();
    expect(button('Import recipe')).toBeVisible();
    expect(screen.queryByText('Saved recipes')).toBeNull();
  });

  it('opens a saved shortcut in one tap', async () => {
    renderWorkbench({ favorites: [RECIPES.hp5Ddx.uuid] });
    await screen.findByText('Saved recipes');
    fireEvent.click(button(/^Ilford HP5 Plus in Ilford DD-X/));
    expect(await panelHeading()).toHaveTextContent(
      'Ilford HP5 Plus in Ilford DD-X'
    );
    expect(events('detail_opened')).toHaveLength(1);
  });

  it('drops a saved id that no recipe answers to', async () => {
    renderWorkbench({ favorites: ['gone'] });
    await prompt();
    expect(screen.queryByText('Saved recipes')).toBeNull();
  });
});

describe('choosing a film and developer', () => {
  it('opens a recipe with no further click, in either order', async () => {
    renderWorkbench();
    await prompt();
    await choose(filmPicker(), /^Ilford HP5 Plus/);
    expect(queryPanelHeading()).toBeNull();
    await choose(developerPicker(), /^Kodak XTOL/);
    expect(await panelHeading()).toHaveTextContent(
      'Ilford HP5 Plus in Kodak XTOL'
    );
    expect(recipeList()).toBeVisible();
    expect(announcement()).toHaveTextContent(
      'Opened Ilford HP5 Plus in Kodak XTOL, 1+1, EI 400, 9:00 minutes.'
    );
    expect(events('detail_opened')).toEqual([
      { name: 'detail_opened', data: { type: 'recipe' } },
    ]);
  });

  it('keeps the film and loads a recipe on changing developer', async () => {
    renderWorkbench({ search: `?${pair}` });
    await panelHeading();
    await choose(developerPicker(), /^Ilford DD-X/);
    await waitFor(() =>
      expect(queryPanelHeading()).toHaveTextContent(
        'Ilford HP5 Plus in Ilford DD-X'
      )
    );
  });

  it('returns to the prompt with the film selected when the new film lacks the developer', async () => {
    renderWorkbench({
      search: `?film=${FILMS.triX.slug}&developer=${DEVELOPERS.ddx.slug}`,
    });
    await panelHeading();
    await choose(filmPicker(), /^Lady Grey 400/);
    await screen.findByRole('heading', { name: 'What are you developing?' });
    expect(queryPanelHeading()).toBeNull();
    expect(filmPicker()).toHaveValue('Lady Grey 400');
    expect(developerPicker()).toHaveValue('');
    expect(
      screen.getByText('No DD-X recipes for Lady Grey 400.')
    ).toBeVisible();
    await waitFor(() => expect(heldUrl('developer')).toBeNull(), URL_SYNC);
  });

  it('then does not bring the old developer back on the next film', async () => {
    renderWorkbench({
      search: `?film=${FILMS.triX.slug}&developer=${DEVELOPERS.ddx.slug}`,
    });
    await panelHeading();
    await choose(filmPicker(), /^Lady Grey 400/);
    await prompt();
    await choose(filmPicker(), /^Ilford HP5 Plus/);
    expect(queryPanelHeading()).toBeNull();
    expect(developerPicker()).toHaveValue('');
    expect(screen.queryByText(/No DD-X recipes/)).toBeNull();
  });

  it('clears the open recipe when the pair changes, so a stale id cannot return', async () => {
    renderWorkbench({ search: `?${pair}` });
    await panelHeading();
    fireEvent.click(row(/^1\+1, EI 800/));
    await waitFor(
      () => expect(heldUrl('recipe')).toBe(RECIPES.hp5Xtol800.uuid),
      URL_SYNC
    );

    await choose(developerPicker(), /^Ilford DD-X/);
    await waitFor(() =>
      expect(queryPanelHeading()).toHaveTextContent('Ilford DD-X')
    );
    await waitFor(
      () => expect(heldUrl('recipe')).toBe(RECIPES.hp5Ddx.uuid),
      URL_SYNC
    );
    expect(within(recipeList()).getAllByRole('button')).toHaveLength(1);
    expect(screen.queryByRole('radiogroup', { name: 'Speed' })).toBeNull();

    await choose(developerPicker(), /^Kodak XTOL/);
    await waitFor(
      () => expect(heldUrl('recipe')).toBe(RECIPES.hp5XtolDefault.uuid),
      URL_SYNC
    );
  });

  it('leaves the open recipe alone on re-choosing the same film', async () => {
    renderWorkbench({ search: `?${pair}` });
    await panelHeading();
    fireEvent.click(row(/^1\+1, EI 800/));
    await choose(filmPicker(), /^Ilford HP5 Plus/);
    await waitFor(
      () => expect(heldUrl('recipe')).toBe(RECIPES.hp5Xtol800.uuid),
      URL_SYNC
    );
  });

  it('takes box speed from the selected film for the default and the row labels', async () => {
    const client = createClient();
    seedCatalogue(client, {
      films: [FILMS.ladyGrey, { ...FILMS.arista, isoSpeed: 800 }],
      developers: [DEVELOPERS.xtol],
      combinations: [RECIPES.ladyGreyXtol, RECIPES.ladyGreyXtolPush],
    });
    renderWorkbench({
      search: `?film=${FILMS.arista.slug}&developer=${XTOL}`,
      client,
    });
    await panelHeading();
    await waitFor(
      () => expect(heldUrl('recipe')).toBe(RECIPES.ladyGreyXtolPush.uuid),
      URL_SYNC
    );
    expect(row(/EI 800, box speed/)).toBeVisible();
  });
});

describe('the workbench', () => {
  it('shows a temperature on rows that differ from the open recipe, and chips open recipes', async () => {
    renderWorkbench({ search: `?${pair}` });
    await panelHeading();

    const chips = screen.getByRole('radiogroup', { name: 'Temperature' });
    fireEvent.click(within(chips).getByRole('radio', { name: /^24°C/ }));
    await waitFor(
      () => expect(heldUrl('recipe')).toBe(RECIPES.hp5Xtol24C.uuid),
      URL_SYNC
    );
    expect(events('detail_opened')).toHaveLength(0);

    // EI 800 is only published at 20C, so from 24C its row must say so.
    expect(row(/^1\+1, EI 800/)).toHaveTextContent('at 20°C');
    expect(row(/^1\+1, EI 400/)).toHaveTextContent('High temp');

    fireEvent.click(
      within(screen.getByRole('radiogroup', { name: 'Speed' })).getByRole(
        'radio',
        { name: /^EI 800/ }
      )
    );
    await waitFor(
      () => expect(heldUrl('recipe')).toBe(RECIPES.hp5Xtol800.uuid),
      URL_SYNC
    );
    expect(events('detail_opened')).toHaveLength(0);
  });

  it('counts a list row as opening a recipe', async () => {
    renderWorkbench({ search: `?${pair}` });
    await panelHeading();
    expect(events('detail_opened')).toHaveLength(0);
    fireEvent.click(row(/^Stock, EI 400/));
    expect(events('detail_opened')).toEqual([
      { name: 'detail_opened', data: { type: 'recipe' } },
    ]);
    expect(announcement()).toHaveTextContent('Stock, EI 400, 7:00 minutes');
  });

  it('shows published times only, with no chips where nothing else is published', async () => {
    renderWorkbench({
      search: `?film=${FILMS.triX.slug}&developer=${DEVELOPERS.ddx.slug}`,
    });
    await panelHeading();
    expect(
      screen.queryByRole('radiogroup', { name: 'Temperature' })
    ).toBeNull();
    expect(screen.queryByRole('radiogroup', { name: 'Speed' })).toBeNull();
    expect(screen.getAllByText('Not in source')).toHaveLength(2);
  });

  it('search results replace the list, then give way when the box is cleared', async () => {
    renderWorkbench({ search: `?${pair}` });
    await panelHeading();
    expect(recipeList()).toBeVisible();
    fireEvent.change(search(), { target: { value: 'tri-x' } });
    await screen.findByRole('list', { name: 'Search results' });
    expect(queryRecipeList()).toBeNull();
    fireEvent.change(search(), { target: { value: '' } });
    await waitFor(() => expect(recipeList()).toBeVisible());
  });

  it('Enter in the box moves to the first result', async () => {
    renderWorkbench();
    await prompt();
    fireEvent.change(search(), { target: { value: 'tri-x' } });
    const results = await screen.findByRole('list', { name: 'Search results' });
    fireEvent.keyDown(search(), { key: 'Enter' });
    expect(document.activeElement).toBe(results.querySelector('button'));
  });

  it('a search pick from the prompt fills both pickers and focuses the heading it mounted', async () => {
    renderWorkbench();
    await prompt();
    fireEvent.change(search(), { target: { value: 'tri-x' } });
    const results = await screen.findByRole('list', { name: 'Search results' });
    expect(queryPanelHeading()).toBeNull();
    fireEvent.click(within(results).getAllByRole('button')[0]);

    const heading = await panelHeading();
    expect(heading).toHaveTextContent('Kodak Tri-X 400 in Ilford DD-X');
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(filmPicker()).toHaveValue('Kodak Tri-X 400');
    expect(developerPicker()).toHaveValue('Ilford DD-X');
    expect(search()).toHaveValue('');
    expect(events('detail_opened')).toHaveLength(1);
  });

  it('a search hit on a shared rebrand keeps that film', async () => {
    renderWorkbench();
    await prompt();
    fireEvent.change(search(), { target: { value: 'arista xtol' } });
    const results = await screen.findByRole('list', { name: 'Search results' });
    fireEvent.click(within(results).getAllByRole('button')[0]);
    expect(await panelHeading()).toHaveTextContent(
      'Arista EDU Ultra 400 in Kodak XTOL'
    );
    expect(filmPicker()).toHaveValue('Arista EDU Ultra 400');
  });

  it('reports a settled dead-end search once and no intermediate keystrokes', async () => {
    renderWorkbench();
    await prompt();
    fireEvent.change(search(), { target: { value: 'zzz' } });
    fireEvent.change(search(), { target: { value: 'zzzz' } });
    await screen.findByText(/No recipes match/);
    await waitFor(
      () => expect(events('search_no_results')).toHaveLength(1),
      URL_SYNC
    );
  });

  it('Start over resets everything on the page, with focus on Film', async () => {
    renderWorkbench({ search: `?${pair}&recipeType=official` });
    await panelHeading();
    fireEvent.click(button('Start over'));
    await prompt();
    expect(queryPanelHeading()).toBeNull();
    expect(filmPicker()).toHaveValue('');
    await waitFor(() => expect(document.activeElement).toBe(filmPicker()));
    await waitFor(() => expect(window.location.search).toBe(''), URL_SYNC);
  });

  it('Save fires favorite_toggled and marks the recipe at once', async () => {
    renderWorkbench({ search: `?${pair}` });
    await panelHeading();
    fireEvent.click(button('Save'));
    expect(button('Saved')).toBeVisible();
    expect(localStorage.getItem('dorkroom_favorite_recipes')).toContain(
      RECIPES.hp5XtolDefault.uuid
    );
    expect(events('favorite_toggled')).toEqual([
      { name: 'favorite_toggled', data: { added: true } },
    ]);
    expect(screen.getByText('Saved recipes')).toBeVisible();
  });

  it('Copy link names the film on screen and confirms with a toast', async () => {
    renderWorkbench({
      search: `?film=${FILMS.arista.slug}&developer=${XTOL}&recipe=${RECIPES.ladyGreyXtol.uuid}`,
    });
    await panelHeading();
    fireEvent.click(button('Copy link'));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const link = writeText.mock.calls[0]?.[0] ?? '';
    expect(link).toContain(RECIPES.ladyGreyXtol.uuid);
    expect(link).toContain(`film=${FILMS.arista.slug}`);
    expect(
      within(await screen.findByTestId('toast')).getByText(
        'Link copied to clipboard!'
      )
    ).toBeVisible();
    expect(events('share')).toHaveLength(1);
  });
});

describe('the scope', () => {
  const scope = (name: string) => screen.getByRole('radio', { name });

  it('narrows the pickers and search, and reports only real narrowing', async () => {
    renderWorkbench({ customRecipes: [CUSTOM_OWN_FILM] });
    await prompt();
    fireEvent.click(scope('Custom'));
    expect(events('filter_applied')).toEqual([
      {
        name: 'filter_applied',
        data: { tool: 'development', filter: 'recipe_type' },
      },
    ]);
    await waitFor(
      () => expect(heldUrl('recipeType')).toBe('only-custom'),
      URL_SYNC
    );
    await userPicks(filmPicker());
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(
      screen.getByRole('option', { name: /^Home Stock 200/ })
    ).toBeVisible();
    fireEvent.keyDown(filmPicker(), { key: 'Escape' });

    fireEvent.change(search(), { target: { value: 'hp5' } });
    await screen.findByText(/No recipes match/);

    fireEvent.click(scope('Saved'));
    fireEvent.click(scope('All'));
    expect(events('filter_applied')).toEqual([
      {
        name: 'filter_applied',
        data: { tool: 'development', filter: 'recipe_type' },
      },
      {
        name: 'filter_applied',
        data: { tool: 'development', filter: 'favorites' },
      },
    ]);
  });

  it('a scope that empties the pair returns to the prompt, and All brings it back', async () => {
    renderWorkbench({ search: `?${pair}` });
    await panelHeading();
    fireEvent.click(scope('Saved'));
    await screen.findByText(
      'No XTOL recipes for Ilford HP5 Plus among saved recipes.'
    );
    expect(queryPanelHeading()).toBeNull();
    expect(filmPicker()).toHaveValue('Ilford HP5 Plus');
    await waitFor(() => {
      expect(heldUrl('developer')).toBeNull();
      expect(heldUrl('recipe')).toBeNull();
    }, URL_SYNC);

    fireEvent.click(scope('All'));
    expect(await panelHeading()).toHaveTextContent('Kodak XTOL');
  });

  it('a scope hiding an explicitly opened recipe falls to the default in scope', async () => {
    renderWorkbench({
      search: `?${pair}&recipe=${RECIPES.hp5Xtol800.uuid}`,
      favorites: [RECIPES.hp5XtolStock.uuid],
    });
    await panelHeading();
    fireEvent.click(scope('Saved'));
    await waitFor(
      () => expect(heldUrl('recipe')).toBe(RECIPES.hp5XtolStock.uuid),
      URL_SYNC
    );
  });

  it('Official keeps a non-default open official recipe, and All after it keeps it too', async () => {
    renderWorkbench({
      search: `?${pair}&recipe=${RECIPES.hp5Xtol800.uuid}`,
    });
    await panelHeading();
    fireEvent.click(scope('Official'));
    await waitFor(
      () => expect(heldUrl('recipeType')).toBe('official'),
      URL_SYNC
    );
    expect(heldUrl('recipe')).toBe(RECIPES.hp5Xtol800.uuid);
    fireEvent.click(scope('All'));
    await waitFor(() => expect(heldUrl('recipeType')).toBeNull(), URL_SYNC);
    expect(heldUrl('recipe')).toBe(RECIPES.hp5Xtol800.uuid);
  });

  it('a pass through an empty scope still returns to the pair default, not the open recipe', async () => {
    renderWorkbench({
      search: `?${pair}&recipe=${RECIPES.hp5Xtol800.uuid}`,
    });
    await panelHeading();
    for (const name of ['Official', 'Custom', 'Saved', 'Custom', 'Official']) {
      fireEvent.click(scope(name));
    }
    fireEvent.click(scope('All'));
    await waitFor(
      () => expect(heldUrl('recipe')).toBe(RECIPES.hp5XtolDefault.uuid),
      URL_SYNC
    );
  });

  it('unsaving under Saved keeps the recipe on screen until the user moves on', async () => {
    renderWorkbench({
      search: `?${pair}&favorites=true`,
      favorites: [RECIPES.hp5XtolDefault.uuid, RECIPES.hp5XtolStock.uuid],
    });
    await panelHeading();
    fireEvent.click(button('Saved'));
    await waitFor(
      () => expect(heldUrl('recipe')).toBe(RECIPES.hp5XtolDefault.uuid),
      URL_SYNC
    );
    expect(button('Save')).toBeVisible();
  });

  it('reads saved recipes before a link resolves against the Saved scope', async () => {
    renderWorkbench({
      search: `?${pair}&favorites=true&dilution=Stock`,
      favorites: [RECIPES.hp5XtolDefault.uuid, RECIPES.hp5XtolStock.uuid],
    });
    await panelHeading();
    await waitFor(
      () => expect(heldUrl('recipe')).toBe(RECIPES.hp5XtolStock.uuid),
      URL_SYNC
    );
    expect(heldUrl('dilution')).toBeNull();
  });

  it("lists a linked recipe that the link's own scope hides, marked as open", async () => {
    renderWorkbench({
      search: `?favorites=true&recipe=${RECIPES.hp5Ddx.uuid}`,
    });
    await panelHeading();
    expect(row(/^1\+4, EI 400/)).toHaveAttribute('aria-current', 'true');
  });
});

async function userPicks(picker: HTMLElement) {
  const { userEvent } = await import('@testing-library/user-event');
  await userEvent.setup().click(picker);
}

describe('custom recipes', () => {
  it('appear in the pickers and search alongside official ones', async () => {
    renderWorkbench({ customRecipes: [CUSTOM_OWN_FILM] });
    await prompt();
    await userPicks(filmPicker());
    expect(
      screen.getByRole('option', { name: /^Home Stock 200/ })
    ).toBeVisible();
    expect(
      screen.getByRole('option', { name: /^Ilford HP5 Plus/ })
    ).toBeVisible();
    fireEvent.keyDown(filmPicker(), { key: 'Escape' });

    fireEvent.change(search(), { target: { value: 'caffenol' } });
    const results = await screen.findByRole('list', { name: 'Search results' });
    fireEvent.click(within(results).getAllByRole('button')[0]);
    expect(await panelHeading()).toHaveTextContent(
      'Home Stock 200 in Home Caffenol'
    );
    await waitFor(
      () => expect(window.location.search).toBe(`?recipe=${CUSTOM_OWN_ID}`),
      URL_SYNC
    );
  });

  it('creating one opens it, and counts the save', async () => {
    renderWorkbench();
    await prompt();
    fireEvent.click(button('Add custom recipe'));
    await screen.findByText('Add custom recipe', { selector: 'h2,h3' });
    await fillCustomFilmForm();
    fireEvent.click(button('Save recipe'));
    expect(await panelHeading()).toHaveTextContent(
      'Ilford HP5 Plus in Kodak XTOL'
    );
    expect(events('recipe_saved')).toEqual([
      { name: 'recipe_saved', data: { action: 'created', source: 'manual' } },
    ]);
    expect(localStorage.getItem('dorkroom_custom_recipes')).toContain(
      'Fresh recipe'
    );
  });

  it('editing refreshes the open panel without closing it', async () => {
    renderWorkbench({
      search: `?recipe=${CUSTOM_ID}`,
      customRecipes: [CUSTOM_ON_CATALOGUE],
    });
    await panelHeading();
    expect(screen.getAllByText('13:00').length).toBeGreaterThan(0);
    fireEvent.click(button('Edit'));
    await screen.findByText('Edit custom recipe');
    fireEvent.change(screen.getByLabelText(/development time/i), {
      target: { value: '17' },
    });
    fireEvent.click(button('Save recipe'));
    await waitFor(() =>
      expect(screen.getAllByText('17:00').length).toBeGreaterThan(0)
    );
    expect(await panelHeading()).toHaveTextContent(
      'Kodak Tri-X 400 in Kodak XTOL'
    );
    await waitFor(() => expect(heldUrl('recipe')).toBe(CUSTOM_ID), URL_SYNC);
  });

  it('deleting the open recipe falls to the default, and focus goes to the heading (#604)', async () => {
    renderWorkbench({
      search: `?film=${HP5}&developer=${XTOL}&recipe=${CUSTOM_ID}`,
      customRecipes: [{ ...CUSTOM_ON_CATALOGUE, filmId: FILMS.hp5.uuid }],
    });
    await panelHeading();
    const deleteButton = button('Delete');
    deleteButton.focus();
    fireEvent.click(deleteButton);
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(document.activeElement).toBe(deleteButton);

    deleteButton.focus();
    fireEvent.click(deleteButton);
    const confirm = await screen.findByRole('dialog', {
      name: 'Delete Recipe',
    });
    fireEvent.click(within(confirm).getByRole('button', { name: 'Delete' }));

    await waitFor(
      () => expect(heldUrl('recipe')).toBe(RECIPES.hp5XtolDefault.uuid),
      URL_SYNC
    );
    expect(events('recipe_deleted')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
    const heading = await panelHeading();
    await waitFor(() => expect(document.activeElement).toBe(heading));
  });

  it('deleting the last recipe of a pair returns to the prompt, with focus on Film (#604)', async () => {
    renderWorkbench({
      search: `?recipe=${CUSTOM_OWN_ID}`,
      customRecipes: [CUSTOM_OWN_FILM],
    });
    await panelHeading();
    fireEvent.click(button('Delete'));
    const confirm = await screen.findByRole('dialog', {
      name: 'Delete Recipe',
    });
    fireEvent.click(within(confirm).getByRole('button', { name: 'Delete' }));
    await prompt();
    expect(queryPanelHeading()).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(filmPicker()));
    await waitFor(() => expect(window.location.search).toBe(''), URL_SYNC);
  });

  it('keeps unresolved recipes reachable for edit and delete', async () => {
    renderWorkbench({ customRecipes: [CUSTOM_ORPHAN] });
    await screen.findByText('Custom recipes missing a film or developer');
    fireEvent.click(button('Edit Lost film recipe'));
    await screen.findByText('Edit custom recipe');
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() =>
      expect(screen.queryByText('Edit custom recipe')).toBeNull()
    );

    fireEvent.click(button('Delete Lost film recipe'));
    const confirm = await screen.findByRole('dialog', {
      name: 'Delete Recipe',
    });
    fireEvent.click(within(confirm).getByRole('button', { name: 'Delete' }));
    await waitFor(() =>
      expect(
        screen.queryByText('Custom recipes missing a film or developer')
      ).toBeNull()
    );
    expect(localStorage.getItem('dorkroom_custom_recipes')).not.toContain(
      'Lost film recipe'
    );
  });

  it('opens an unresolved recipe from its link, with Edit and Delete', async () => {
    renderWorkbench({
      search: `?recipe=${CUSTOM_ORPHAN.id}`,
      customRecipes: [CUSTOM_ORPHAN],
    });
    await screen.findByRole('button', { name: 'Edit' });
    expect(button('Delete')).toBeVisible();
    expect(filmPicker()).toHaveValue('');
  });

  it('accepting a shared custom recipe adds and opens it', async () => {
    renderWorkbench({
      search: `?recipe=${encodeCustomRecipe(CUSTOM_ON_CATALOGUE)}&source=share`,
    });
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Add to My Recipes' })
    );
    expect(await panelHeading()).toHaveTextContent(
      'Kodak Tri-X 400 in Kodak XTOL'
    );
    expect(localStorage.getItem('dorkroom_custom_recipes')).toContain(
      'My Tri-X'
    );
    expect(events('recipe_saved')).toEqual([
      { name: 'recipe_saved', data: { action: 'created', source: 'import' } },
    ]);
    await waitFor(() => expect(heldUrl('source')).toBeNull(), URL_SYNC);
  });

  it('declining leaves the prompt and does not reopen the dialog', async () => {
    renderWorkbench({
      search: `?recipe=${encodeCustomRecipe(CUSTOM_ON_CATALOGUE)}&source=share`,
    });
    await screen.findByRole('dialog');
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(window.location.search).toBe(''), URL_SYNC);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(localStorage.getItem('dorkroom_custom_recipes')).toBeNull();
  });

  it('imports a recipe code and opens it', async () => {
    renderWorkbench();
    await prompt();
    fireEvent.click(button('Import recipe'));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox'), {
      target: { value: encodeCustomRecipe(CUSTOM_ON_CATALOGUE) },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /^Import/ }));
    expect(await panelHeading()).toHaveTextContent(
      'Kodak Tri-X 400 in Kodak XTOL'
    );
  });
});

async function fillCustomFilmForm() {
  fireEvent.change(screen.getByLabelText(/recipe name/i), {
    target: { value: 'Fresh recipe' },
  });
  const [film, developer] = within(screen.getByRole('dialog')).getAllByRole(
    'combobox'
  );
  fireEvent.change(film, { target: { value: FILMS.hp5.uuid } });
  fireEvent.change(developer, { target: { value: DEVELOPERS.xtol.uuid } });
}

describe('deep links and analytics', () => {
  it('does not count arriving on a link as opening a recipe', async () => {
    renderWorkbench({ search: `?${pair}&recipe=${RECIPES.hp5Xtol800.uuid}` });
    await panelHeading();
    await waitFor(
      () => expect(heldUrl('recipe')).toBe(RECIPES.hp5Xtol800.uuid),
      URL_SYNC
    );
    expect(events('detail_opened')).toHaveLength(0);
    expect(events('filter_applied')).toHaveLength(0);
  });

  it("does not count a link's scope as using the filter", async () => {
    renderWorkbench({ search: '?favorites=true' });
    await prompt();
    expect(events('filter_applied')).toHaveLength(0);
  });
});

describe('when the catalogue fails to load', () => {
  const failingFetch = () =>
    vi.fn(() => Promise.reject(new Error('network down')));

  it('shows a banner with Retry, keeps Add, hides Import and calls no custom recipe broken', async () => {
    vi.stubGlobal('fetch', failingFetch());
    renderWorkbench({
      client: createClient(),
      customRecipes: [CUSTOM_ON_CATALOGUE],
    });
    await screen.findByText(/recipe catalogue did not load/, undefined, {
      timeout: 15000,
    });
    expect(button('Retry')).toBeVisible();
    expect(button('Add custom recipe')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Import recipe' })).toBeNull();
    expect(
      screen.queryByText('Custom recipes missing a film or developer')
    ).toBeNull();
  }, 20000);

  it('does not trap a deep link on the skeleton, and Retry then opens it', async () => {
    vi.stubGlobal('fetch', failingFetch());
    const client = createClient();
    renderWorkbench({ search: `?${pair}`, client });
    expect(screen.getByTestId('workbench-skeleton')).toBeInTheDocument();
    await screen.findByText(/recipe catalogue did not load/, undefined, {
      timeout: 15000,
    });
    expect(screen.queryByTestId('workbench-skeleton')).toBeNull();
    expect(window.location.search).toBe(`?${pair}`);

    const fetched = vi.mocked(fetch).mock.calls.length;
    fireEvent.click(button('Retry'));
    await waitFor(() =>
      expect(vi.mocked(fetch).mock.calls.length).toBeGreaterThan(fetched)
    );
    await screen.findByRole('button', { name: 'Retry' }, { timeout: 15000 });

    seedCatalogue(client);
    expect(await panelHeading()).toHaveTextContent('Kodak XTOL');
  }, 20000);

  it('an empty catalogue does not hold the skeleton or list recipes as broken', async () => {
    const client = createClient();
    seedCatalogue(client, { films: [], developers: [], combinations: [] });
    renderWorkbench({
      search: `?${pair}`,
      client,
      customRecipes: [CUSTOM_ON_CATALOGUE],
    });
    await prompt();
    expect(screen.queryByTestId('workbench-skeleton')).toBeNull();
    expect(
      screen.queryByText('Custom recipes missing a film or developer')
    ).toBeNull();
  });
});

describe('review fixes', () => {
  const homeFilm = (over: Partial<CustomRecipe> = {}): CustomRecipe => ({
    ...CUSTOM_OWN_FILM,
    ...over,
  });
  const SECOND_ID = 'custom_1700000000003_abcdefghj';
  const editDialog = async () => {
    fireEvent.click(button('Edit'));
    await screen.findByText('Edit custom recipe');
  };
  const saveForm = () => fireEvent.click(button('Save recipe'));
  const pickHome = async () => {
    await prompt();
    await choose(filmPicker(), /^Home Stock 200/);
    await choose(developerPicker(), /^Home Caffenol/);
    await panelHeading();
  };

  it('B1: renaming the custom film of a default recipe keeps it open', async () => {
    renderWorkbench({ customRecipes: [homeFilm()] });
    await pickHome();
    await editDialog();
    fireEvent.change(screen.getByDisplayValue('Stock 200'), {
      target: { value: 'Stock 300' },
    });
    saveForm();
    await waitFor(() =>
      expect(queryPanelHeading()).toHaveTextContent('Home Stock 300')
    );
    await waitFor(() =>
      expect(screen.queryByText('Edit custom recipe')).toBeNull()
    );
    expect(document.activeElement).not.toBe(document.body);
  });

  it('B1: changing the custom developer of a default recipe keeps it open', async () => {
    renderWorkbench({ customRecipes: [homeFilm()] });
    await pickHome();
    await editDialog();
    fireEvent.change(screen.getByDisplayValue('Caffenol'), {
      target: { value: 'Caffenol C' },
    });
    saveForm();
    await waitFor(() =>
      expect(queryPanelHeading()).toHaveTextContent('Home Caffenol C')
    );
  });

  it('B1: editing the default of two custom recipes does not swap to the other', async () => {
    renderWorkbench({
      customRecipes: [
        homeFilm({ shootingIso: 200, timeMinutes: 15 }),
        homeFilm({ id: SECOND_ID, shootingIso: 100, timeMinutes: 6 }),
      ],
    });
    await pickHome();
    await waitFor(
      () => expect(window.location.search).toBe(`?recipe=${CUSTOM_OWN_ID}`),
      URL_SYNC
    );
    await editDialog();
    fireEvent.change(screen.getByLabelText(/shooting iso/i), {
      target: { value: '800' },
    });
    saveForm();
    await waitFor(() =>
      expect(screen.queryByText('Edit custom recipe')).toBeNull()
    );
    await act(() => new Promise((done) => setTimeout(done, 350)));
    expect(window.location.search).toBe(`?recipe=${CUSTOM_OWN_ID}`);
    expect(screen.getAllByText('15:00').length).toBeGreaterThan(0);
  });

  it('B2: a dilution whose developer is gone is not called Stock, and there is no mixer', async () => {
    const gone: CustomRecipe = {
      ...CUSTOM_ORPHAN,
      developerId: 'uuid-developer-that-left',
      filmId: FILMS.hp5.uuid,
      customDilution: undefined,
      dilutionId: '2',
    };
    renderWorkbench({ customRecipes: [gone], favorites: [gone.id] });
    await screen.findByText('Saved recipes');
    fireEvent.click(button(/Unknown developer/));
    await screen.findAllByText(/Dilution not known/);
    expect(screen.queryByText(/use developer stock/i)).toBeNull();
    expect(screen.queryByLabelText('Total volume')).toBeNull();
    expect(screen.queryByText(/Stock,/)).toBeNull();
    expect(screen.getByText(/^Opened /)).toHaveTextContent(
      'dilution not known'
    );
  });

  it('S1: deleting a just-created recipe falls to the pair default', async () => {
    renderWorkbench({ search: `?${pair}` });
    await panelHeading();
    fireEvent.click(button('Add custom recipe'));
    await screen.findByText('Add custom recipe', { selector: 'h2,h3' });
    await fillCustomFilmForm();
    fireEvent.click(button('Save recipe'));
    await screen.findByRole('button', { name: 'Delete' });
    fireEvent.click(button('Delete'));
    const confirm = await screen.findByRole('dialog', {
      name: 'Delete Recipe',
    });
    fireEvent.click(within(confirm).getByRole('button', { name: 'Delete' }));
    await waitFor(
      () => expect(heldUrl('recipe')).toBe(RECIPES.hp5XtolDefault.uuid),
      URL_SYNC
    );
    expect(filmPicker()).toHaveValue('Ilford HP5 Plus');
  });

  it('S1: deleting a bare custom link keeps its film and developer', async () => {
    renderWorkbench({
      search: `?recipe=${CUSTOM_ID}`,
      customRecipes: [CUSTOM_ON_CATALOGUE],
    });
    await panelHeading();
    fireEvent.click(button('Delete'));
    const confirm = await screen.findByRole('dialog', {
      name: 'Delete Recipe',
    });
    fireEvent.click(within(confirm).getByRole('button', { name: 'Delete' }));
    await screen.findByText(/^No XTOL recipes for Kodak Tri-X 400/);
    expect(filmPicker()).toHaveValue('Kodak Tri-X 400');
    await waitFor(
      () => expect(window.location.search).toBe(`?film=${FILMS.triX.slug}`),
      URL_SYNC
    );
  });

  it('S2: a held iso applies when a scope change releases the pair', async () => {
    renderWorkbench({ search: `?${pair}&iso=800&favorites=true` });
    await screen.findByText(/^No XTOL recipes/);
    fireEvent.click(screen.getByRole('radio', { name: 'All' }));
    await panelHeading();
    await waitFor(() => {
      expect(heldUrl('recipe')).toBe(RECIPES.hp5Xtol800.uuid);
      expect(heldUrl('iso')).toBeNull();
    }, URL_SYNC);
  });

  describe('S3: acting during a slow load', () => {
    const never = () => new Promise<Response>(() => undefined);

    it('a scope chosen during the load survives it, with its event sent once', async () => {
      vi.stubGlobal('fetch', vi.fn(never));
      const client = createClient();
      renderWorkbench({ search: '?q=hp5', client });
      fireEvent.click(screen.getByRole('radio', { name: 'Official' }));
      seedCatalogue(client);
      await screen.findByRole('list', { name: 'Search results' });
      await waitFor(
        () => expect(heldUrl('recipeType')).toBe('official'),
        URL_SYNC
      );
      expect(screen.getByRole('radio', { name: 'Official' })).toBeChecked();
      expect(events('filter_applied')).toHaveLength(1);
      expect(events('search_no_results')).toHaveLength(0);
    });

    it('a custom recipe opened during the load stays open', async () => {
      vi.stubGlobal('fetch', vi.fn(never));
      const client = createClient();
      renderWorkbench({
        search: '?favorites=true',
        client,
        customRecipes: [CUSTOM_OWN_FILM],
        favorites: [CUSTOM_OWN_ID],
      });
      fireEvent.click(
        await screen.findByRole('button', { name: /^Home Stock 200/ })
      );
      await panelHeading();
      seedCatalogue(client);
      await waitFor(
        () => expect(heldUrl('recipe')).toBe(CUSTOM_OWN_ID),
        URL_SYNC
      );
      expect(queryPanelHeading()).toHaveTextContent('Home Stock 200');
    });

    it('never commits an unseeded page once the catalogue is there', async () => {
      renderWorkbench({ search: `?${pair}` });
      expect(screen.queryByTestId('workbench-skeleton')).toBeNull();
      expect(queryPanelHeading()).toHaveTextContent('Kodak XTOL');
    });
  });

  it('leaves focus in a dialog that stayed open because its action failed', async () => {
    renderWorkbench({
      search: `?recipe=${CUSTOM_ID}`,
      customRecipes: [CUSTOM_ON_CATALOGUE],
    });
    await panelHeading();
    fireEvent.click(button('Delete'));
    const confirm = await screen.findByRole('dialog', {
      name: 'Delete Recipe',
    });
    const confirmButton = within(confirm).getByRole('button', {
      name: 'Delete',
    });
    confirmButton.focus();
    const setItem = localStorage.setItem;
    localStorage.setItem = () => {
      throw new Error('quota');
    };
    fireEvent.click(confirmButton);
    await screen.findByText('Failed to delete the recipe. Please try again.');
    localStorage.setItem = setItem;
    expect(screen.getByRole('dialog', { name: 'Delete Recipe' })).toBeVisible();
    expect(confirm.contains(document.activeElement)).toBe(true);
  });

  it('S4: accepting a shared recipe focuses the heading it opened', async () => {
    renderWorkbench({
      search: `?recipe=${encodeCustomRecipe(CUSTOM_ON_CATALOGUE)}&source=share`,
    });
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Add to My Recipes' })
    );
    const heading = await panelHeading();
    await waitFor(() => expect(document.activeElement).toBe(heading));
  });

  it('S4: declining a shared recipe focuses Film', async () => {
    renderWorkbench({
      search: `?recipe=${encodeCustomRecipe(CUSTOM_ON_CATALOGUE)}&source=share`,
    });
    await screen.findByRole('dialog');
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(filmPicker()));
  });

  it('S4, S8: a filmdev import previews, adds, opens and focuses the recipe', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              recipe: {
                id: 77,
                film: 'Ilford HP5 Plus',
                developer: 'Kodak XTOL',
                dilution_ratio: '1+1',
                celcius: '20',
                fahrenheit: '68',
                duration_hours: 0,
                duration_minutes: 11,
                duration_seconds: 0,
                notes: '',
                created: '2026-01-01',
                user: 'someone',
                recipe_link: 'https://filmdev.org/recipe/show/77',
                recipe_name: 'From filmdev',
                profile_link: '',
                photos_link: '',
                format: null,
                developed_at: 400,
              },
            }),
            { status: 200, headers: { 'content-type': 'application/json' } }
          )
        )
      )
    );
    renderWorkbench();
    await prompt();
    fireEvent.click(button('Import recipe'));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByRole('textbox'), {
      target: { value: 'https://filmdev.org/recipe/show/77' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /^Import/ }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Add to My Recipes' })
    );
    const heading = await panelHeading();
    expect(heading).toHaveTextContent('HP5');
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(events('recipe_saved')).toEqual([
      { name: 'recipe_saved', data: { action: 'created', source: 'import' } },
    ]);
  });

  it('S5: says closest, not default, when only part of a hint was missed', async () => {
    renderWorkbench({ search: `?${pair}&iso=800&dilution=1%2B99` });
    await screen.findAllByText(
      'No published recipe for 1+99, showing the closest published recipe.'
    );
    await waitFor(
      () => expect(heldUrl('recipe')).toBe(RECIPES.hp5Xtol800.uuid),
      URL_SYNC
    );
  });

  it('S6: the live line carries the temperature flag and the hint note', async () => {
    renderWorkbench({ search: `?${pair}&dilution=1%2B9&recipe=` });
    await panelHeading();
    expect(screen.getByText(/^Opened /)).toHaveTextContent(
      'No published recipe for 1+9'
    );
    fireEvent.click(
      within(screen.getByRole('radiogroup', { name: 'Temperature' })).getByRole(
        'radio',
        { name: /^24°C/ }
      )
    );
    expect(screen.getByText(/^Opened /)).toHaveTextContent('High temp 24°C');
  });

  it('S7: says why the Film list is empty under an empty scope', async () => {
    renderWorkbench({ search: '?favorites=true' });
    await screen.findByText('No saved recipes yet.');
  });

  it('S7: says why the Developer list is empty for a film with no recipes', async () => {
    renderWorkbench({ search: `?film=${FILMS.panF.slug}` });
    await screen.findByText('No recipes for Ilford Pan F Plus.');
  });

  it("S8: a saved shortcut names the film it opens, not the recipe's spelling", async () => {
    const namesake: CustomRecipe = {
      ...CUSTOM_OWN_FILM,
      customFilm: {
        brand: 'ilford',
        name: 'hp5 plus',
        isoSpeed: 400,
        colorType: 'bw',
      },
    };
    renderWorkbench({ customRecipes: [namesake], favorites: [namesake.id] });
    await screen.findByText('Saved recipes');
    expect(button(/^Ilford HP5 Plus in Home Caffenol/)).toBeVisible();
  });

  it('S8, N5: Save keeps the hint note and a row pick clears it', async () => {
    renderWorkbench({ search: `?${pair}&dilution=1%2B9` });
    const note =
      'No published recipe for 1+9, so this is the default for the pair.';
    await screen.findByText(note);
    fireEvent.click(button('Save'));
    expect(screen.getByText(note)).toBeVisible();
    fireEvent.click(row(/^Stock, EI 400/));
    expect(screen.queryByText(note)).toBeNull();
  });

  it('S8: a dead end under a scope reports the narrowing', async () => {
    renderWorkbench({ search: '?recipeType=official' });
    await prompt();
    fireEvent.change(search(), { target: { value: 'zzz' } });
    await screen.findByText(/No recipes match/);
    await waitFor(
      () =>
        expect(events('search_no_results')).toEqual([
          {
            name: 'search_no_results',
            data: { tool: 'development', filters: 1 },
          },
        ]),
      URL_SYNC
    );
  });

  it('S8: the shared recipe loader stops when the catalogue fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('network down')))
    );
    renderWorkbench({
      search: `?recipe=${RECIPES.hp5Ddx.uuid}&source=share`,
      client: createClient(),
    });
    await screen.findByText(/recipe catalogue did not load/, undefined, {
      timeout: 15000,
    });
    expect(screen.queryByText('Loading shared recipe…')).toBeNull();
  }, 20000);

  it('S8: an opened recipe reads box speed from the selected film', async () => {
    const client = createClient();
    seedCatalogue(client, {
      films: [FILMS.ladyGrey, { ...FILMS.arista, isoSpeed: 800 }],
      developers: [DEVELOPERS.xtol],
      combinations: [RECIPES.ladyGreyXtol, RECIPES.ladyGreyXtolPush],
    });
    renderWorkbench({
      search: `?film=${FILMS.arista.slug}&developer=${XTOL}&recipe=${RECIPES.ladyGreyXtolPush.uuid}`,
      client,
    });
    await panelHeading();
    expect(row(/EI 800, box speed/)).toBeVisible();
  });

  it('S8: fixing an unresolved recipe leaves focus on Film, not the body', async () => {
    renderWorkbench({ customRecipes: [CUSTOM_ORPHAN] });
    fireEvent.click(
      await screen.findByRole('button', { name: 'Edit Lost film recipe' })
    );
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getAllByRole('combobox')[0], {
      target: { value: FILMS.hp5.uuid },
    });
    fireEvent.click(button('Save recipe'));
    await waitFor(() =>
      expect(
        screen.queryByText('Custom recipes missing a film or developer')
      ).toBeNull()
    );
    await waitFor(() => expect(document.activeElement).toBe(filmPicker()));
  });

  it('S8: a developer-only link gets the skeleton while loading', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => undefined))
    );
    renderWorkbench({ search: `?developer=${XTOL}`, client: createClient() });
    expect(screen.getByTestId('workbench-skeleton')).toBeInTheDocument();
  });

  it('S8: Start over is offered for a held iso, and clears it', async () => {
    renderWorkbench({ search: '?iso=800' });
    await prompt();
    fireEvent.click(button('Start over'));
    await waitFor(() => expect(window.location.search).toBe(''), URL_SYNC);
    expect(screen.queryByRole('button', { name: 'Start over' })).toBeNull();
  });

  it('owner: Start over resets scope, search and hints, keeping saved recipes', async () => {
    renderWorkbench({
      search: `?${pair}&favorites=true&q=tri&iso=800`,
      favorites: [RECIPES.hp5Xtol800.uuid],
    });
    await panelHeading();
    fireEvent.click(button('Start over'));
    await prompt();
    expect(screen.getByRole('radio', { name: 'All' })).toBeChecked();
    expect(search()).toHaveValue('');
    expect(filmPicker()).toHaveValue('');
    await waitFor(() => expect(window.location.search).toBe(''), URL_SYNC);
    expect(screen.getByText('Saved recipes')).toBeVisible();
  });

  it('N3: a held dilution goes when the developer changes', async () => {
    renderWorkbench({ search: `?developer=${XTOL}&dilution=Stock` });
    await waitFor(() => expect(developerPicker()).toHaveValue('Kodak XTOL'));
    await choose(developerPicker(), /^Ilford DD-X/);
    await waitFor(() => expect(heldUrl('dilution')).toBeNull(), URL_SYNC);
  });

  it('offers Start over for a scope alone, and clears it', async () => {
    renderWorkbench({ search: '?recipeType=official' });
    await prompt();
    await waitFor(() =>
      expect(screen.getByRole('radio', { name: 'Official' })).toBeChecked()
    );
    fireEvent.click(button('Start over'));
    await waitFor(() => expect(window.location.search).toBe(''), URL_SYNC);
    expect(screen.getByRole('radio', { name: 'All' })).toBeChecked();
  });

  it('does not carry a held dilution across developers', async () => {
    renderWorkbench({
      search: `?developer=${DEVELOPERS.ddx.slug}&dilution=Stock`,
    });
    await waitFor(() => expect(developerPicker()).toHaveValue('Ilford DD-X'));
    await choose(developerPicker(), /^Kodak XTOL/);
    await choose(filmPicker(), /^Ilford HP5 Plus/);
    await panelHeading();
    await waitFor(
      () => expect(heldUrl('recipe')).toBe(RECIPES.hp5XtolDefault.uuid),
      URL_SYNC
    );
  });

  it('names an unresolved recipe in the live line', async () => {
    const lost: CustomRecipe = {
      ...CUSTOM_ORPHAN,
      developerId: 'uuid-developer-that-left',
    };
    renderWorkbench({ search: `?recipe=${lost.id}`, customRecipes: [lost] });
    await screen.findByRole('button', { name: 'Edit' });
    expect(screen.getByText(/^Opened /)).toHaveTextContent(
      /^Opened Unknown film in Unknown developer, /
    );
  });

  it('keeps the form open and says why when a recipe cannot be saved', async () => {
    renderWorkbench();
    await prompt();
    fireEvent.click(button('Add custom recipe'));
    await screen.findByText('Add custom recipe', { selector: 'h2,h3' });
    fireEvent.change(screen.getByLabelText(/recipe name/i), {
      target: { value: 'Only a name' },
    });
    fireEvent.click(button('Save recipe'));
    await screen.findByText('Choose a film, or enter your own.');
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(localStorage.getItem('dorkroom_custom_recipes')).toBeNull();
    expect(queryPanelHeading()).toBeNull();
  });

  it('owner: tags sit on the source line, with no box of their own', async () => {
    renderWorkbench({ search: `?${pair}` });
    await panelHeading();
    const source = screen.getByText('official ilford').closest('dd');
    expect(source?.previousElementSibling).toHaveTextContent('Source');
  });
});

describe('the index', () => {
  it('is one object until the catalogue or a custom recipe changes', async () => {
    const client = createClient();
    seedCatalogue(client);
    const { result, rerender } = renderHook(() => useWorkbenchCatalog(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    const first = result.current.index;
    rerender();
    rerender();
    expect(result.current.index).toBe(first);

    act(() => {
      result.current.addCustomRecipe({
        ...CUSTOM_RECIPE_FORM_DEFAULT,
        name: 'New',
        selectedFilmId: FILMS.hp5.uuid,
        selectedDeveloperId: DEVELOPERS.xtol.uuid,
      });
    });
    const second = result.current.index;
    expect(second).not.toBe(first);
    rerender();
    expect(result.current.index).toBe(second);
  });
});
