import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FieldButton } from '../components/workbench-phone-header';
import {
  createClient,
  CUSTOM_ID,
  CUSTOM_ON_CATALOGUE,
  CUSTOM_ORPHAN,
  DEVELOPERS,
  FILMS,
  panelHeading,
  params,
  queryPanelHeading,
  RECIPES,
  recordAnalytics,
  renderWorkbench,
  seedCatalogue,
  stubViewport,
  URL_SYNC,
} from './workbench-test-setup';

const HP5 = FILMS.hp5.slug;
const XTOL = DEVELOPERS.xtol.slug;
const pair = `film=${HP5}&developer=${XTOL}`;
const writeText = vi.fn<(text: string) => Promise<void>>();

let sent = recordAnalytics();
const events = (name: string) => sent().filter((event) => event.name === name);
const button = (name: string | RegExp) => {
  const named = screen.getAllByRole('button', { name });
  // The recipe panel's About sections have buttons named Film and Developer too.
  return (
    named.find((el) => el.getAttribute('aria-haspopup') === 'dialog') ??
    screen.getByRole('button', { name })
  );
};
const sheet = (name: string) => screen.findByRole('dialog', { name });
const prompt = () =>
  screen.findByRole('heading', { name: 'What are you developing?' });
const heading = () => screen.getByRole('heading', { level: 2, name: / in / });
const noSheet = () =>
  waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

beforeEach(() => {
  localStorage.clear();
  stubViewport(390);
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

describe('the phone prompt', () => {
  it('has buttons for the pickers, search, Add and Import, and no list', async () => {
    renderWorkbench();
    await prompt();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(button(/^Film/)).toBeVisible();
    expect(button(/^Developer/)).toBeVisible();
    expect(button(/^Or search/)).toBeVisible();
    expect(button('Add custom recipe')).toBeVisible();
    expect(button('Import recipe')).toBeVisible();
    expect(queryPanelHeading()).toBeNull();
  });

  it('keeps the scope filter and Start over in the menu, not on the page', async () => {
    renderWorkbench({ search: `?film=${HP5}` });
    await prompt();
    expect(screen.queryByRole('radio')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Start over' })).toBeNull();
    fireEvent.click(button('More options'));
    const menu = await sheet('More options');
    expect(within(menu).getByRole('radio', { name: 'Saved' })).toBeVisible();
    expect(
      within(menu).getByRole('button', { name: 'Start over' })
    ).toBeVisible();
  });

  it('outlines the button still needed', async () => {
    renderWorkbench();
    await prompt();
    expect(button(/^Film/).className).toContain('outline-dashed');
    expect(button(/^Developer/).className).not.toContain('outline-dashed');
    fireEvent.click(button(/^Film/));
    const films = await sheet('Film');
    fireEvent.click(within(films).getByRole('button', { name: /^Ilford HP5/ }));
    await noSheet();
    expect(button(/^Developer/).className).toContain('outline-dashed');
    expect(button(/^Film/).className).not.toContain('outline-dashed');
  });

  it('opens a recipe after a film and a developer, and focuses its heading', async () => {
    renderWorkbench();
    await prompt();
    fireEvent.click(button(/^Film/));
    fireEvent.click(
      within(await sheet('Film')).getByRole('button', { name: /^Ilford HP5/ })
    );
    await noSheet();
    fireEvent.click(button(/^Developer/));
    fireEvent.click(
      within(await sheet('Developer')).getByRole('button', {
        name: /^Kodak XTOL/,
      })
    );
    await waitFor(() => expect(document.activeElement).toBe(heading()));
    await noSheet();
    await waitFor(
      () => expect(params().get('recipe')).toBe(RECIPES.hp5XtolDefault.uuid),
      URL_SYNC
    );
    expect(events('detail_opened')).toHaveLength(1);
  });

  it('opens a saved shortcut in one tap', async () => {
    renderWorkbench({ favorites: [RECIPES.hp5Ddx.uuid] });
    fireEvent.click(
      await screen.findByRole('button', {
        name: /^Ilford HP5 Plus in Ilford DD-X/,
      })
    );
    await panelHeading();
    await waitFor(() => expect(document.activeElement).toBe(heading()));
  });

  it('opens the search sheet for ?q= and keeps the scope filter out of it', async () => {
    renderWorkbench({ search: '?q=hp5' });
    const dialog = await sheet('Search recipes');
    expect(within(dialog).getByRole('searchbox')).toHaveValue('hp5');
    expect(within(dialog).queryByRole('radio')).toBeNull();
    await within(dialog).findByRole('list', { name: 'Search results' });
  });

  it('opens a search result, closes the sheet and focuses the heading', async () => {
    renderWorkbench();
    await prompt();
    fireEvent.click(button(/^Or search/));
    const dialog = await sheet('Search recipes');
    fireEvent.change(within(dialog).getByRole('searchbox'), {
      target: { value: 'hp5 800' },
    });
    fireEvent.click(
      await within(dialog).findByRole('button', {
        name: /HP5 Plus in Kodak XTOL/,
      })
    );
    await panelHeading();
    await noSheet();
    await waitFor(() => expect(document.activeElement).toBe(heading()));
    expect(screen.getByRole('button', { name: /^Recipe/ })).toHaveTextContent(
      'EI 800'
    );
  });

  it('closing the search sheet returns focus to its button and keeps the text', async () => {
    renderWorkbench();
    await prompt();
    const opener = button(/^Or search/);
    fireEvent.click(opener);
    const dialog = await sheet('Search recipes');
    fireEvent.change(within(dialog).getByRole('searchbox'), {
      target: { value: 'tri-x' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await noSheet();
    expect(document.activeElement).toBe(button(/^Or search/));
    expect(opener).toHaveTextContent('tri-x');
  });
});

describe('the phone workbench', () => {
  it('fills the screen with the recipe: no list, a compact header, Save and Copy link', async () => {
    renderWorkbench({ search: `?${pair}` });
    await panelHeading();
    expect(
      screen.queryByRole('list', {
        name: 'Recipes for this film and developer',
      })
    ).toBeNull();
    expect(button(/^Film/)).toHaveTextContent('Ilford HP5 Plus');
    expect(button(/^Developer/)).toHaveTextContent('Kodak XTOL');
    expect(button(/^Recipe/)).toHaveTextContent('1+1, EI 400, box speed');
    expect(button('Search recipes')).toBeVisible();
    expect(button('More options')).toBeVisible();
    expect(button('Save')).toBeVisible();
    expect(button('Copy link')).toBeVisible();
    expect(screen.queryByRole('switch', { name: /^Switch to/ })).toBeNull();
  });

  it('states film, developer and recipe once on screen, keeping the heading for assistive technology', async () => {
    renderWorkbench({ search: `?${pair}` });
    await panelHeading();
    expect(heading()).toHaveClass('sr-only');
    expect(heading()).toHaveTextContent('Ilford HP5 Plus in Kodak XTOL');
    expect(
      screen.queryByText('1+1, EI 400, box speed', { selector: 'p' })
    ).toBeNull();
    expect(screen.getAllByText('1+1, EI 400, box speed')).toHaveLength(1);
  });

  it('lets film and developer take two lines and cuts only the recipe, all still spoken', async () => {
    renderWorkbench({ search: `?${pair}` });
    await panelHeading();
    expect(
      screen.getByText('Ilford HP5 Plus', { selector: '.line-clamp-2' })
    ).toBeVisible();
    expect(
      screen.getByText('Kodak XTOL', { selector: '.line-clamp-2' })
    ).toBeVisible();
    expect(
      screen.getByText('1+1, EI 400, box speed', { selector: '.truncate' })
    ).toBeVisible();
    expect(button(/^Film/)).toHaveAccessibleName('Film Ilford HP5 Plus');
    expect(button(/^Developer/)).toHaveAccessibleName('Developer Kodak XTOL');
    expect(button(/^Recipe/)).toHaveAccessibleName(
      'Recipe 1+1, EI 400, box speed'
    );
  });

  it('does not let a film name break at its hyphen', async () => {
    renderWorkbench({
      search: `?film=${FILMS.triX.slug}&developer=${DEVELOPERS.ddx.slug}`,
    });
    await panelHeading();
    const film = button(/^Film/);
    expect(film).toHaveAccessibleName('Film Kodak Tri-X 400');
    expect(film.querySelector('.line-clamp-2')?.textContent).toBe(
      'Kodak Tri-X 400'
    );
    expect(film.querySelector('.whitespace-nowrap')).toHaveTextContent(
      /^Tri-X$/
    );
  });

  it('lets a film name break after a slash, adding nothing to its text', () => {
    render(
      <FieldButton
        caption="Film"
        value="Kodak T-MAX/Ektapan P3200"
        wrapValue
        onClick={() => undefined}
      />
    );
    const film = screen.getByRole('button');
    expect(film).toHaveAccessibleName('Film Kodak T-MAX/Ektapan P3200');
    expect(film.querySelectorAll('wbr')).toHaveLength(1);
    expect(film.querySelector('.whitespace-nowrap')).toHaveTextContent(
      /^T-MAX\/$/
    );
  });

  it('lets a hyphenated word too long for the button break', () => {
    const name = 'Home Extraordinarily-Long-Hyphenated-Word Tri-X';
    render(
      <FieldButton
        caption="Film"
        value={name}
        wrapValue
        onClick={() => undefined}
      />
    );
    const film = screen.getByRole('button');
    expect(film.querySelector('.line-clamp-2')?.textContent).toBe(name);
    const unbroken = film.querySelectorAll('.whitespace-nowrap');
    expect(unbroken).toHaveLength(1);
    expect(unbroken[0]).toHaveTextContent(/^Tri-X$/);
  });

  it('survives a name that repeats a part', () => {
    const spy = vi.spyOn(console, 'error');
    render(
      <FieldButton
        caption="Film"
        value="A/A"
        wrapValue
        onClick={() => undefined}
      />
    );
    expect(screen.getByRole('button')).toHaveAccessibleName('Film A/A');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('flags a recipe away from 20C under the time and in the picker, not in the header', async () => {
    renderWorkbench({ search: `?recipe=${RECIPES.hp5Xtol24C.uuid}` });
    await panelHeading();
    expect(screen.getAllByText('High temp 24°C (75.2°F)')).toHaveLength(1);
    expect(within(button(/^Recipe/)).queryByText(/High temp/)).toBeNull();
    expect(screen.queryByText(/^at 24°C/)).toBeNull();
    fireEvent.click(button(/^Recipe/));
    const picker = await sheet('Recipe');
    expect(
      within(picker).getAllByText('High temp 24°C').length
    ).toBeGreaterThan(0);
  });

  it('shows no chip at 20C', async () => {
    renderWorkbench({ search: `?${pair}` });
    await panelHeading();
    expect(screen.queryByText(/High temp|Low temp/)).toBeNull();
  });

  it('changes the recipe from the picker sheet and focuses the heading', async () => {
    renderWorkbench({ search: `?${pair}` });
    await panelHeading();
    fireEvent.click(button(/^Recipe/));
    const picker = await sheet('Recipe');
    fireEvent.click(within(picker).getByRole('button', { name: /EI 800/ }));
    await noSheet();
    expect(button(/^Recipe/)).toHaveTextContent('EI 800');
    await waitFor(() => expect(document.activeElement).toBe(heading()));
  });

  it('changes the developer from its sheet', async () => {
    renderWorkbench({ search: `?${pair}` });
    await panelHeading();
    fireEvent.click(button(/^Developer/));
    fireEvent.click(
      within(await sheet('Developer')).getByRole('button', {
        name: /^Ilford DD-X/,
      })
    );
    await noSheet();
    expect(heading()).toHaveTextContent('Ilford HP5 Plus in Ilford DD-X');
  });

  it.each([
    ['Film', /^Film/],
    ['Developer', /^Developer/],
    ['Recipe', /^Recipe/],
    ['Search recipes', 'Search recipes'],
    ['More options', 'More options'],
  ] as const)(
    'the %s sheet returns focus to its button on close',
    async (title, opener) => {
      renderWorkbench({ search: `?${pair}` });
      await panelHeading();
      const trigger = button(opener);
      fireEvent.click(trigger);
      const dialog = await sheet(title);
      expect(dialog.contains(document.activeElement)).toBe(true);
      fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
      await noSheet();
      expect(document.activeElement).toBe(trigger);
    }
  );

  it('keeps focus in a sheet that is open', async () => {
    renderWorkbench({ search: `?${pair}` });
    await panelHeading();
    fireEvent.click(button('More options'));
    const dialog = await sheet('More options');
    screen.getByRole('button', { name: 'Save' }).focus();
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('Save and Copy link work from the bar', async () => {
    renderWorkbench({ search: `?${pair}` });
    await panelHeading();
    fireEvent.click(button('Save'));
    expect(button('Saved')).toBeVisible();
    expect(events('favorite_toggled')).toHaveLength(1);
    fireEvent.click(button('Copy link'));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0]?.[0]).toContain(
      `recipe=${RECIPES.hp5XtolDefault.uuid}`
    );
  });

  it('has no Save and Copy link bar on the prompt', async () => {
    renderWorkbench();
    await prompt();
    expect(screen.queryByRole('button', { name: 'Copy link' })).toBeNull();
  });

  it('keeps tabbed-to controls clear of the bar only while the bar is there', async () => {
    const root = document.documentElement;
    renderWorkbench({ search: `?${pair}` });
    await panelHeading();
    expect(root.style.scrollPaddingBottom).toContain('5rem');
    fireEvent.click(button('More options'));
    fireEvent.click(
      within(await sheet('More options')).getByRole('button', {
        name: 'Start over',
      })
    );
    await prompt();
    expect(root.style.scrollPaddingBottom).toBe('');
  });
});

describe('the phone menu', () => {
  const openMenu = async () => {
    fireEvent.click(button('More options'));
    return sheet('More options');
  };

  it('switches C and F', async () => {
    renderWorkbench({ search: `?${pair}` });
    await panelHeading();
    expect(screen.getAllByText(/^at 20°C/).length).toBeGreaterThan(0);
    const menu = await openMenu();
    fireEvent.click(
      within(menu).getByRole('switch', { name: /Switch to Fahrenheit/ })
    );
    expect(screen.getAllByText(/^at 68°F/).length).toBeGreaterThan(0);
  });

  it('Saved narrows the pickers to saved recipes', async () => {
    renderWorkbench({
      search: `?${pair}`,
      favorites: [RECIPES.hp5Ddx.uuid],
    });
    await panelHeading();
    fireEvent.click(button(/^Developer/));
    const before = await sheet('Developer');
    expect(
      within(before).getByRole('button', { name: /^Kodak XTOL/ })
    ).toBeVisible();
    fireEvent.click(within(before).getByRole('button', { name: 'Close' }));
    await noSheet();

    const menu = await openMenu();
    fireEvent.click(within(menu).getByRole('radio', { name: 'Saved' }));
    expect(events('filter_applied')).toHaveLength(1);
    fireEvent.click(within(menu).getByRole('button', { name: 'Close' }));
    await noSheet();

    fireEvent.click(button(/^Developer/));
    const after = await sheet('Developer');
    expect(
      within(after).getByRole('button', { name: /^Ilford DD-X/ })
    ).toBeVisible();
    expect(
      within(after).queryByRole('button', { name: /^Ilford DD-X.*0 recipes/ })
    ).toBeNull();
    expect(
      within(after).queryByRole('button', { name: /^Kodak T-MAX/ })
    ).toBeNull();
  });

  it('opens a saved recipe from the menu', async () => {
    renderWorkbench({
      search: `?${pair}`,
      favorites: [RECIPES.hp5Ddx.uuid],
    });
    await panelHeading();
    const menu = await openMenu();
    expect(within(menu).getByText('Saved recipes')).toBeVisible();
    fireEvent.click(
      within(menu).getByRole('button', {
        name: /^Ilford HP5 Plus in Ilford DD-X/,
      })
    );
    await noSheet();
    expect(heading()).toHaveTextContent('Ilford HP5 Plus in Ilford DD-X');
    await waitFor(() => expect(document.activeElement).toBe(heading()));
  });

  it('puts the actions above the saved list, which can be any length', async () => {
    renderWorkbench({
      search: `?${pair}`,
      favorites: [RECIPES.hp5Ddx.uuid],
    });
    await panelHeading();
    const menu = await openMenu();
    const savedHeading = within(menu).getByText('Saved recipes');
    for (const name of ['Start over', 'Add custom recipe', 'Import recipe']) {
      expect(
        within(menu)
          .getByRole('button', { name })
          .compareDocumentPosition(savedHeading) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    }
  });

  it('Start over resets the page and focuses Film', async () => {
    renderWorkbench({ search: `?${pair}&recipeType=official` });
    await panelHeading();
    const menu = await openMenu();
    fireEvent.click(within(menu).getByRole('button', { name: 'Start over' }));
    await prompt();
    await noSheet();
    expect(queryPanelHeading()).toBeNull();
    expect(button(/^Film/)).toHaveTextContent('Choose a film');
    await waitFor(() => expect(document.activeElement).toBe(button(/^Film/)));
    await waitFor(() => expect(window.location.search).toBe(''), URL_SYNC);
  });

  it('Add opens the form and Escape returns focus to the menu button', async () => {
    renderWorkbench({ search: `?${pair}` });
    await panelHeading();
    const trigger = button('More options');
    const menu = await openMenu();
    fireEvent.click(
      within(menu).getByRole('button', { name: 'Add custom recipe' })
    );
    await screen.findByText('Add custom recipe', { selector: 'h2,h3' });
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() =>
      expect(
        screen.queryByText('Add custom recipe', { selector: 'h2,h3' })
      ).toBeNull()
    );
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it('Import opens the import form', async () => {
    renderWorkbench({ search: `?${pair}` });
    await panelHeading();
    const menu = await openMenu();
    fireEvent.click(
      within(menu).getByRole('button', { name: 'Import recipe' })
    );
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('textbox')).toBeVisible();
    expect(screen.queryByRole('dialog', { name: 'More options' })).toBeNull();
  });

  it('keeps unresolved custom recipes reachable for edit', async () => {
    renderWorkbench({
      search: `?${pair}`,
      customRecipes: [CUSTOM_ORPHAN],
    });
    await panelHeading();
    const menu = await openMenu();
    fireEvent.click(
      within(menu).getByRole('button', { name: 'Edit Lost film recipe' })
    );
    await screen.findByText('Edit custom recipe');
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'More options' })).toBeNull()
    );
  });

  it('keeps unresolved custom recipes reachable for delete', async () => {
    renderWorkbench({
      search: `?${pair}`,
      customRecipes: [CUSTOM_ORPHAN],
    });
    await panelHeading();
    const menu = await openMenu();
    fireEvent.click(
      within(menu).getByRole('button', { name: 'Delete Lost film recipe' })
    );
    expect(
      await screen.findByRole('dialog', { name: 'Delete Recipe' })
    ).toBeVisible();
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'More options' })).toBeNull()
    );
  });

  it('keeps Edit and Delete of an open custom recipe in the panel', async () => {
    renderWorkbench({
      search: `?recipe=${CUSTOM_ID}`,
      customRecipes: [CUSTOM_ON_CATALOGUE],
    });
    await panelHeading();
    expect(button('Edit')).toBeVisible();
    fireEvent.click(button('Delete'));
    expect(
      await screen.findByRole('dialog', { name: 'Delete Recipe' })
    ).toBeVisible();
  });
});

describe('crossing the breakpoint', () => {
  it('keeps the open recipe, and the mixer volume, from wide to phone and back', async () => {
    const viewport = stubViewport(1280);
    renderWorkbench({ search: `?recipe=${RECIPES.hp5Xtol24C.uuid}` });
    await panelHeading();
    const volume = () => screen.getByLabelText('Total volume');
    fireEvent.change(volume(), { target: { value: '750' } });
    expect(
      screen.getByRole('list', { name: 'Recipes for this film and developer' })
    ).toBeVisible();

    viewport.resize(390);
    await screen.findByRole('button', { name: 'More options' });
    expect(
      screen.queryByRole('list', {
        name: 'Recipes for this film and developer',
      })
    ).toBeNull();
    expect(heading()).toHaveTextContent('Ilford HP5 Plus in Kodak XTOL');
    expect(screen.getAllByText(/^High temp 24°C/).length).toBeGreaterThan(0);
    expect(volume()).toHaveValue(750);
    expect(button('Save')).toBeVisible();

    viewport.resize(1280);
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Film' })).toBeVisible()
    );
    expect(heading()).toHaveTextContent('Ilford HP5 Plus in Kodak XTOL');
    expect(volume()).toHaveValue(750);
    expect(screen.queryByRole('button', { name: 'More options' })).toBeNull();
  });

  it('keeps the search text, which opens the sheet on the phone', async () => {
    const viewport = stubViewport(1280);
    renderWorkbench();
    fireEvent.change(
      await screen.findByRole('searchbox', { name: 'Or search' }),
      {
        target: { value: 'tri-x' },
      }
    );
    viewport.resize(390);
    const dialog = await sheet('Search recipes');
    expect(within(dialog).getByRole('searchbox')).toHaveValue('tri-x');
    viewport.resize(1280);
    expect(
      await screen.findByRole('searchbox', { name: 'Or search' })
    ).toHaveValue('tri-x');
  });
});

describe('crossing the breakpoint after closing the search sheet', () => {
  const closeSearch = async () => {
    const dialog = await sheet('Search recipes');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await noSheet();
  };
  const swap = async (viewport: ReturnType<typeof stubViewport>) => {
    viewport.resize(844);
    await screen.findByRole('combobox', { name: 'Film' });
    viewport.resize(390);
    await screen.findByRole('button', { name: 'More options' });
  };

  it('does not reopen the sheet over the recipe, and keeps the text', async () => {
    const viewport = stubViewport(390);
    renderWorkbench({ search: `?q=hp5&${pair}` });
    await closeSearch();
    await panelHeading();
    await swap(viewport);
    expect(screen.queryByRole('dialog')).toBeNull();
    await panelHeading();
    expect(params().get('q')).toBe('hp5');
  });

  it('opens it again once the text changes', async () => {
    const viewport = stubViewport(390);
    renderWorkbench({ search: '?q=hp5' });
    await closeSearch();
    await swap(viewport);
    expect(screen.queryByRole('dialog')).toBeNull();

    viewport.resize(844);
    fireEvent.change(
      await screen.findByRole('searchbox', { name: 'Or search' }),
      { target: { value: 'tri-x' } }
    );
    viewport.resize(390);
    expect(
      within(await sheet('Search recipes')).getByRole('searchbox')
    ).toHaveValue('tri-x');
  });

  it('counts one opening across a swap', async () => {
    const viewport = stubViewport(390);
    renderWorkbench({ search: `?recipe=${RECIPES.hp5Ddx.uuid}&source=share` });
    await panelHeading();
    expect(events('share_opened')).toHaveLength(1);
    fireEvent.click(button(/^Developer/));
    fireEvent.click(
      within(await sheet('Developer')).getByRole('button', {
        name: /^Kodak XTOL/,
      })
    );
    await noSheet();
    expect(events('detail_opened')).toHaveLength(1);

    await swap(viewport);
    await panelHeading();
    expect(events('share_opened')).toHaveLength(1);
    expect(events('detail_opened')).toHaveLength(1);
  });
});

describe('a scope narrower than All', () => {
  const NOTE = 'Showing saved recipes only';

  it('says nothing with All', async () => {
    renderWorkbench({ search: `?${pair}` });
    await panelHeading();
    expect(screen.queryByText(/recipes only$/)).toBeNull();
    fireEvent.click(button(/^Film/));
    expect(within(await sheet('Film')).queryByText(/recipes only$/)).toBeNull();
  });

  it('says so on the prompt, and Show all clears it and keeps focus', async () => {
    renderWorkbench({
      search: '?favorites=true',
      favorites: [RECIPES.hp5Ddx.uuid],
    });
    await prompt();
    expect(await screen.findByText(NOTE)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Show all' }));
    await waitFor(() => expect(screen.queryByText(NOTE)).toBeNull());
    expect(document.activeElement).toBe(button(/^Film/));
    await waitFor(() => expect(params().get('favorites')).toBeNull(), URL_SYNC);
  });

  it('says so with a pair open, where custom recipes are hidden', async () => {
    renderWorkbench({ search: `?${pair}&recipeType=official` });
    await panelHeading();
    expect(screen.getByText('Showing official recipes only')).toBeVisible();
  });

  it('blames the scope, not the words, in the search sheet', async () => {
    renderWorkbench({
      search: '?favorites=true&q=hp5',
      favorites: [RECIPES.triXDdx.uuid],
    });
    const dialog = await sheet('Search recipes');
    expect(within(dialog).getByText(NOTE)).toBeVisible();
    expect(
      await within(dialog).findByText(
        'No saved recipes match. Try Show all, or fewer words.'
      )
    ).toBeVisible();
    expect(within(dialog).queryByText(/^No recipes match/)).toBeNull();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Show all' }));
    await within(dialog).findByRole('list', { name: 'Search results' });
    expect(within(dialog).queryByText(NOTE)).toBeNull();
    expect(document.activeElement).toBe(within(dialog).getByRole('searchbox'));
  });

  it('says so in a picker sheet, and an empty one does not blame the filter', async () => {
    renderWorkbench({ search: '?favorites=true' });
    await prompt();
    fireEvent.click(button(/^Film/));
    const dialog = await sheet('Film');
    expect(within(dialog).getByText(NOTE)).toBeVisible();
    expect(
      within(dialog).getByText('No saved recipes to choose from.')
    ).toBeVisible();
    expect(within(dialog).queryByText('Nothing matches that.')).toBeNull();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Show all' }));
    const rows = await within(dialog).findAllByRole('button', {
      name: /recipes?$/,
    });
    expect(within(dialog).queryByText(NOTE)).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(rows[0]));
  });

  it('Show all in a picker lands on the selected row', async () => {
    renderWorkbench({
      search: `?${pair}&favorites=true`,
      favorites: [RECIPES.hp5XtolDefault.uuid],
    });
    await panelHeading();
    fireEvent.click(button(/^Developer/));
    const dialog = await sheet('Developer');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Show all' }));
    await within(dialog).findByRole('button', { name: /^Ilford DD-X/ });
    const selected = within(dialog).getByRole('button', {
      name: /^Kodak XTOL/,
    });
    expect(selected).toHaveAttribute('aria-current', 'true');
    await waitFor(() => expect(document.activeElement).toBe(selected));
  });

  it('keeps the search note below the results, so they stay above a keyboard', async () => {
    renderWorkbench({
      search: '?favorites=true&q=hp5',
      favorites: [RECIPES.hp5Ddx.uuid],
    });
    const dialog = await sheet('Search recipes');
    const list = await within(dialog).findByRole('list', {
      name: 'Search results',
    });
    expect(
      list.compareDocumentPosition(within(dialog).getByText(NOTE)) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });
});

describe('Start over', () => {
  it.each([
    ['phone', 390],
    ['wide', 1280],
  ] as const)('forgets the mixer volume on the %s layout', async (_, width) => {
    const viewport = stubViewport(width);
    renderWorkbench({ search: `?${pair}` });
    await panelHeading();
    const volume = () =>
      screen.getByLabelText<HTMLInputElement>('Total volume');
    const fresh = volume().valueAsNumber;
    fireEvent.change(volume(), { target: { value: '750' } });
    expect(volume()).toHaveValue(750);

    if (width === 390) {
      fireEvent.click(button('More options'));
      fireEvent.click(
        within(await sheet('More options')).getByRole('button', {
          name: 'Start over',
        })
      );
    } else {
      fireEvent.click(screen.getByRole('button', { name: 'Start over' }));
      viewport.resize(390);
    }
    await prompt();
    await noSheet();

    fireEvent.click(button(/^Film/));
    fireEvent.click(
      within(await sheet('Film')).getByRole('button', { name: /^Ilford HP5/ })
    );
    await noSheet();
    fireEvent.click(button(/^Developer/));
    fireEvent.click(
      within(await sheet('Developer')).getByRole('button', {
        name: /^Kodak XTOL/,
      })
    );
    await panelHeading();
    expect(volume()).toHaveValue(fresh);
  });
});

describe('the phone search sheet before the catalogue is here', () => {
  it('says it is loading, not that nothing matches', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => undefined))
    );
    renderWorkbench({ search: '?q=hp5', client: createClient() });
    const dialog = await sheet('Search recipes');
    expect(within(dialog).getByText('Loading recipes…')).toBeVisible();
    expect(within(dialog).queryByText(/No recipes match/)).toBeNull();
    expect(within(dialog).queryByRole('button', { name: 'Retry' })).toBeNull();
  });

  it('says it failed, with a Retry inside the sheet that works', async () => {
    const down = vi.fn(() =>
      Promise.resolve(new Response('{"error":"down"}', { status: 500 }))
    );
    vi.stubGlobal('fetch', down);
    const client = createClient();
    renderWorkbench({ search: '?q=hp5', client });
    const dialog = await sheet('Search recipes');
    const retry = await within(dialog).findByRole(
      'button',
      { name: 'Retry' },
      { timeout: 15000 }
    );
    expect(
      within(dialog).getByText('The recipe catalogue did not load.')
    ).toBeVisible();
    expect(within(dialog).queryByText(/No recipes match/)).toBeNull();

    const fetched = down.mock.calls.length;
    fireEvent.click(retry);
    await waitFor(() =>
      expect(down.mock.calls.length).toBeGreaterThan(fetched)
    );
    await within(dialog).findByRole(
      'button',
      { name: 'Retry' },
      { timeout: 15000 }
    );

    within(dialog).getByRole('button', { name: 'Retry' }).focus();
    seedCatalogue(client);
    await within(dialog).findByRole('list', { name: 'Search results' });
    expect(within(dialog).queryByRole('button', { name: 'Retry' })).toBeNull();
    expect(within(dialog).queryByText(/did not load/)).toBeNull();
    await waitFor(() =>
      expect(document.activeElement).toBe(within(dialog).getByRole('searchbox'))
    );
  }, 40000);
});

describe('a picker sheet before the catalogue is here', () => {
  it('says it is loading, not that there is nothing to choose', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => undefined))
    );
    renderWorkbench({ client: createClient() });
    await prompt();
    fireEvent.click(button(/^Film/));
    const dialog = await sheet('Film');
    expect(within(dialog).getByRole('status')).toHaveTextContent(
      'Loading recipes…'
    );
    expect(within(dialog).queryByText(/to choose from/)).toBeNull();
  });

  it('says the load failed, not that there is nothing to choose', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('network down')))
    );
    renderWorkbench({ client: createClient() });
    await screen.findByRole('button', { name: 'Retry' }, { timeout: 15000 });
    fireEvent.click(button(/^Film/));
    const dialog = await sheet('Film');
    expect(within(dialog).getByRole('status')).toHaveTextContent(
      'The recipe catalogue did not load.'
    );
    expect(within(dialog).queryByText(/to choose from/)).toBeNull();
  }, 20000);
});

describe('the phone with a failed catalogue', () => {
  it('keeps Retry and Add reachable', async () => {
    const client = createClient();
    seedCatalogue(client, { combinations: null });
    client.setQueryDefaults(['combinations', 'list'], {
      queryFn: () => Promise.reject(new Error('down')),
    });
    renderWorkbench({ client });
    expect(await screen.findByRole('button', { name: 'Retry' })).toBeVisible();
    expect(button('Add custom recipe')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Import recipe' })).toBeNull();
  });
});
