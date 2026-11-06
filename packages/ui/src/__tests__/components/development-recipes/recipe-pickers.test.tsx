import '@testing-library/jest-dom/vitest';
import { getFilmOptions, searchRecipes } from '@dorkroom/logic';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, type ReactNode, useState } from 'react';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  FilmDeveloperSelection,
  type FilmDeveloperSelectionHandle,
} from '../../../components/development-recipes/film-developer-selection';
import { RecipeList } from '../../../components/development-recipes/recipe-list';
import { RecipeScopeFilter } from '../../../components/development-recipes/recipe-scope-filter';
import { RecipeSearchBox } from '../../../components/development-recipes/recipe-search-box';
import { RecipeSearchResults } from '../../../components/development-recipes/recipe-search-results';
import { SavedRecipes } from '../../../components/development-recipes/saved-recipes';
import { SearchableSelect } from '../../../components/searchable-select';
import { TemperatureProvider } from '../../../contexts/temperature-context';
import {
  delta400,
  delta400Pair,
  hp5,
  ilfotec,
  indexOf,
  makeDeveloper,
  makeFilm,
  makeView,
  rowsFor,
  xtol,
} from './recipe-pickers.fixtures';

const inProvider = (ui: ReactNode) =>
  render(<TemperatureProvider>{ui}</TemperatureProvider>);

/** Only React's key message, so an unrelated log cannot fail these tests. */
const expectNoKeyWarning = (renderIt: () => void) => {
  const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  try {
    renderIt();
    const keyWarnings = logged.mock.calls.filter(([message]) =>
      String(message).includes('same key')
    );
    expect(keyWarnings).toEqual([]);
  } finally {
    logged.mockRestore();
  }
};

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});
beforeEach(() => localStorage.setItem('dorkroom-temperature-unit', 'celsius'));
afterEach(cleanup);

describe('SearchableSelect options with a detail', () => {
  const index = indexOf(
    [
      makeView('h1', hp5, xtol),
      makeView('h2', hp5, xtol, { shootingIso: 800 }),
      makeView('d1', delta400, ilfotec),
    ],
    [hp5, delta400],
    [xtol, ilfotec]
  );
  const films = getFilmOptions(index, { developerKey: 'ilfotec-hc' });

  const setup = (selected = '') => {
    const onValueChange = vi.fn();
    render(
      <SearchableSelect
        label="Film"
        selectedValue={selected}
        onValueChange={onValueChange}
        items={films}
      />
    );
    return { onValueChange, input: screen.getByRole('combobox') };
  };

  it('names each option with its count, from the real options function', async () => {
    const user = userEvent.setup();
    const { input } = setup();
    await user.click(input);
    expect(
      screen.getByRole('option', { name: 'Ilford Delta 400, 1 recipe' })
    ).toBeInTheDocument();
  });

  it('keeps a film with no recipes for the developer selectable, and says so', async () => {
    const user = userEvent.setup();
    const { input, onValueChange } = setup();
    await user.click(input);
    const option = screen.getByRole('option', {
      name: 'Ilford HP5 Plus, No Ilfotec HC recipes',
    });
    expect(within(option).getByText('No Ilfotec HC recipes')).toBeVisible();
    await user.click(option);
    expect(onValueChange).toHaveBeenCalledWith('hp5-plus');
  });

  it('filters on the label, never the detail', async () => {
    const user = userEvent.setup();
    const { input } = setup();
    await user.click(input);
    await user.type(input, 'recipes');
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('selects a zero-count option by keyboard', async () => {
    const user = userEvent.setup();
    const { input, onValueChange } = setup();
    await user.click(input);
    await user.type(input, 'hp5');
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onValueChange).toHaveBeenCalledWith('hp5-plus');
  });

  it('shows only the label once closed', () => {
    const { input } = setup('hp5-plus');
    expect(input).toHaveValue('Ilford HP5 Plus');
  });

  it('leaves options without a detail exactly as they were', async () => {
    const user = userEvent.setup();
    render(
      <SearchableSelect
        label="Old"
        selectedValue=""
        onValueChange={vi.fn()}
        items={[{ value: 'a', label: 'Alpha' }]}
      />
    );
    await user.click(screen.getByRole('combobox'));
    const option = screen.getByRole('option', { name: 'Alpha' });
    expect(option).not.toHaveAttribute('aria-label');
    expect(option).not.toHaveClass('min-h-11');
  });
});

describe('FilmDeveloperSelection', () => {
  const setup = (
    props: Partial<Parameters<typeof FilmDeveloperSelection>[0]> = {}
  ) =>
    render(
      <FilmDeveloperSelection
        selectedFilm="a"
        onFilmChange={vi.fn()}
        filmOptions={[{ value: 'a', label: 'Alpha' }]}
        selectedDeveloper=""
        onDeveloperChange={vi.fn()}
        developerOptions={[{ value: 'b', label: 'Beta' }]}
        {...props}
      />
    );
  const outline = 'outline-[color:var(--color-brand)]';

  it('outlines only the picker still needed', () => {
    setup({ needs: 'developer' });
    expect(screen.getByRole('combobox', { name: 'Developer' })).toHaveClass(
      outline
    );
    expect(screen.getByRole('combobox', { name: 'Film' })).not.toHaveClass(
      outline
    );
    expect(screen.getByText('Choose a developer next.')).toBeInTheDocument();
  });

  it('moves the outline to the film', () => {
    setup({ needs: 'film' });
    expect(screen.getByRole('combobox', { name: 'Film' })).toHaveClass(outline);
    expect(screen.getByRole('combobox', { name: 'Developer' })).not.toHaveClass(
      outline
    );
  });

  it('keeps the original card, clear button and X by default', () => {
    setup();
    expect(
      screen.getByRole('button', { name: 'Clear selections' })
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Clear selection' })
    ).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Film' })).not.toHaveClass(
      outline
    );
    expect(screen.getByRole('combobox', { name: 'Film' })).not.toHaveClass(
      'min-h-11'
    );
  });

  it('hideClear removes both clear controls', () => {
    setup({ hideClear: true });
    expect(screen.queryByRole('button', { name: /clear/i })).toBeNull();
  });

  it('the frameless layouts give the inputs 44px targets', () => {
    setup({ layout: 'stacked' });
    expect(screen.getByRole('combobox', { name: 'Film' })).toHaveClass(
      'min-h-11'
    );
  });
});

describe('RecipeSearchBox', () => {
  const Controlled = ({ seed }: { seed: string }) => {
    const [value, setValue] = useState(seed);
    return <RecipeSearchBox value={value} onChange={setValue} />;
  };

  it('seeds from its prop', () => {
    render(<Controlled seed="hp5 1600" />);
    expect(
      screen.getByRole('searchbox', { name: 'Search recipes' })
    ).toHaveValue('hp5 1600');
  });

  it('clears and keeps focus in the box, by keyboard too', async () => {
    const user = userEvent.setup();
    render(<Controlled seed="hp5" />);
    const box = screen.getByRole('searchbox');
    await user.click(box);
    await user.tab();
    expect(screen.getByRole('button', { name: 'Clear text' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(box).toHaveValue('');
    expect(box).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Clear text' })).toBeNull();
  });
});

describe('RecipeSearchResults', () => {
  const warm = makeView('warm', hp5, xtol, {
    shootingIso: 800,
    temperatureC: 24,
    temperatureF: 75.2,
    timeMinutes: 5.25,
  });
  const room = makeView('room', hp5, xtol, {
    shootingIso: 800,
    timeMinutes: 9.5,
    customDilution: 'Stock',
  });
  const films = [hp5, delta400];

  it('shows film, developer, dilution, EI, time and temperature', () => {
    const index = indexOf([room], films, [xtol, ilfotec]);
    const result = searchRecipes('hp5 800 xtol', index);
    inProvider(
      <RecipeSearchResults
        query="hp5 800 xtol"
        result={result}
        onSelectHit={vi.fn()}
      />
    );
    const row = screen.getByRole('button', {
      name: 'Ilford HP5 Plus in Kodak XTOL, Stock, EI 800, 9 minutes 30 seconds, 20°C',
    });
    expect(
      within(row).getByText('Ilford HP5 Plus in Kodak XTOL')
    ).toBeVisible();
    expect(within(row).getByText('Stock, EI 800, 20°C')).toBeVisible();
    expect(within(row).getByText('9:30')).toBeVisible();
  });

  it('flags a recipe away from 20C with the chip, and does not say the temperature twice', () => {
    const index = indexOf([warm], films, [xtol, ilfotec]);
    const result = searchRecipes('hp5 24c', index);
    inProvider(
      <RecipeSearchResults
        query="hp5 24c"
        result={result}
        onSelectHit={vi.fn()}
      />
    );
    const row = screen.getByRole('button', { name: /High temp 24°C/ });
    expect(within(row).getByText(/High temp/)).toBeVisible();
    expect(row.textContent?.match(/24°C/g)).toHaveLength(1);
  });

  it('names the film the hit belongs to on a row shared from a rebrand base', async () => {
    const user = userEvent.setup();
    const base = makeFilm('base-400', { name: 'Base 400' });
    const rebrand = makeFilm('rebrand-400', {
      name: 'Rebrand 400',
      brand: 'Arista',
      baseFilmSlug: 'base-400',
    });
    const shared = makeView('shared', base, xtol);
    const index = indexOf([shared], [base, rebrand], [xtol]);
    const result = searchRecipes('rebrand xtol', index);
    expect(result.hits[0].view.film?.slug).toBe('base-400');
    const onSelectHit = vi.fn();
    inProvider(
      <RecipeSearchResults
        query="rebrand xtol"
        result={result}
        onSelectHit={onSelectHit}
      />
    );
    const row = screen.getByRole('button', {
      name: /Arista Rebrand 400 in Kodak XTOL/,
    });
    expect(screen.queryByText(/Base 400/)).toBeNull();
    await user.click(row);
    expect(onSelectHit).toHaveBeenCalledWith(result.hits[0]);
  });

  it('keeps published duplicates as separate rows with their own keys', () => {
    const index = indexOf(delta400Pair, films, [xtol, ilfotec]);
    const result = searchRecipes('delta 400 ilfotec 1:31', index);
    expect(result.hits).toHaveLength(2);
    expectNoKeyWarning(() =>
      inProvider(
        <RecipeSearchResults
          query="delta 400 ilfotec 1:31"
          result={result}
          onSelectHit={vi.fn()}
        />
      )
    );
    expect(
      screen.getByRole('button', { name: /6 minutes 30 seconds/ })
    ).toBeVisible();
    expect(screen.getByRole('button', { name: /7 minutes/ })).toBeVisible();
  });

  it('notes the cap and asks to narrow only when truncated', () => {
    const many = Array.from({ length: 12 }, (_, n) =>
      makeView(`m${n}`, hp5, xtol, {
        shootingIso: 100 * (n + 1),
        timeMinutes: 5 + n,
      })
    );
    const index = indexOf(many, films, [xtol]);
    const capped = searchRecipes('hp5', index);
    expect(capped.truncated).toBe(true);
    const view = inProvider(
      <RecipeSearchResults query="hp5" result={capped} onSelectHit={vi.fn()} />
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(8);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Showing the fastest 8 of 12. Add a word to narrow it.'
    );
    view.unmount();

    const whole = searchRecipes('hp5 800', index);
    expect(whole.truncated).toBe(false);
    inProvider(
      <RecipeSearchResults
        query="hp5 800"
        result={whole}
        onSelectHit={vi.fn()}
      />
    );
    expect(screen.getByRole('status')).not.toHaveTextContent(/narrow/);
  });

  it('says when nothing matches, and nothing at all before a search', () => {
    const index = indexOf([room], films, [xtol]);
    const view = inProvider(
      <RecipeSearchResults
        query="zzz"
        result={searchRecipes('zzz', index)}
        onSelectHit={vi.fn()}
      />
    );
    expect(screen.getByRole('status')).toHaveTextContent('No recipes match');
    view.unmount();
    inProvider(
      <RecipeSearchResults
        query="  "
        result={searchRecipes('  ', index)}
        onSelectHit={vi.fn()}
      />
    );
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('hides results left over from before the box was emptied', () => {
    const index = indexOf([room], films, [xtol]);
    inProvider(
      <RecipeSearchResults
        query=""
        result={searchRecipes('hp5', index)}
        onSelectHit={vi.fn()}
      />
    );
    expect(screen.queryByRole('list')).toBeNull();
  });
});

describe('RecipeScopeFilter', () => {
  it('is a radio group, one checked, reporting the chosen scope', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RecipeScopeFilter value="official" onChange={onChange} />);
    expect(
      screen.getByRole('radiogroup', { name: 'Show recipes' })
    ).toBeVisible();
    expect(
      screen
        .getAllByRole('radio')
        .map((radio) => radio.getAttribute('aria-label'))
    ).toEqual(['All', 'Official', 'Custom', 'Saved']);
    expect(screen.getByRole('radio', { name: 'Official' })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: 'Saved' }));
    expect(onChange).toHaveBeenCalledWith('saved');
  });
});

describe('RecipeList', () => {
  it('marks the current recipe beyond colour', () => {
    inProvider(
      <RecipeList
        rows={rowsFor(delta400Pair)}
        currentId="delta-hc-b"
        onSelect={vi.fn()}
      />
    );
    const current = screen.getByRole('button', { current: true });
    expect(current).toHaveAccessibleName(/7 minutes/);
    expect(current.querySelector('svg')).not.toBeNull();
    expect(
      screen.getAllByRole('button').filter((b) => b.querySelector('svg'))
    ).toHaveLength(1);
  });

  it('shows duplicates as separate, distinguishable rows with their own keys', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    expectNoKeyWarning(() =>
      inProvider(
        <RecipeList rows={rowsFor(delta400Pair)} onSelect={onSelect} />
      )
    );

    const first = screen.getByRole('button', {
      name: /1:31, EI 400.*Listing 1 of 2/,
    });
    const second = screen.getByRole('button', {
      name: /1:31, EI 400.*Listing 2 of 2/,
    });
    expect(within(first).getByText('6:30')).toBeVisible();
    expect(within(first).getByText('Listing 1 of 2')).toBeVisible();
    expect(within(second).getByText('7:00')).toBeVisible();
    await user.click(second);
    expect(onSelect).toHaveBeenCalledWith(delta400Pair[1]);
  });

  it('tells two duplicates apart when even the time matches', () => {
    const pair = [
      makeView('a', delta400, ilfotec, { customDilution: '1:31' }),
      // The same mix spelled the other way is the same row group.
      makeView('b', delta400, ilfotec, { customDilution: '1+31' }),
    ];
    inProvider(<RecipeList rows={rowsFor(pair)} onSelect={vi.fn()} />);
    const names = screen
      .getAllByRole('button')
      .map((b) => b.getAttribute('aria-label'));
    expect(new Set(names).size).toBe(2);
    expect(screen.getByText('Listing 1 of 2')).toBeVisible();
  });

  it('numbers nothing when a dilution and EI are published once', () => {
    inProvider(
      <RecipeList rows={rowsFor([delta400Pair[2]])} onSelect={vi.fn()} />
    );
    expect(screen.queryByText(/Listing/)).toBeNull();
  });

  it('marks custom recipes in words', () => {
    const pair = [
      makeView('api', hp5, xtol),
      makeView('mine', hp5, xtol, { shootingIso: 800 }, 'custom'),
    ];
    inProvider(
      <RecipeList rows={rowsFor(pair)} onSelect={vi.fn()} boxIso={400} />
    );
    const mine = screen.getByRole('button', { name: /custom recipe/ });
    expect(within(mine).getByText('Custom')).toBeVisible();
    expect(screen.getAllByText('Custom')).toHaveLength(1);
    expect(
      screen.getByRole('button', { name: /^1\+1, EI 400, box speed/ })
    ).toBeVisible();
    expect(within(mine).getByText('1+1, EI 800, push +1')).toBeVisible();
  });

  describe('temperature', () => {
    const warm = makeView('warm', hp5, xtol, {
      temperatureC: 24,
      temperatureF: 75.2,
    });
    const cold = makeView('cold', hp5, xtol, {
      shootingIso: 800,
      temperatureC: 18,
      temperatureF: 64.4,
    });
    const room = makeView('room', hp5, xtol, { shootingIso: 1600 });

    it('puts the chip on any row not at 20C, and none on a row at 20C', () => {
      inProvider(
        <RecipeList rows={rowsFor([warm, cold, room])} onSelect={vi.fn()} />
      );
      expect(
        screen.getByRole('button', { name: /EI 400.*High temp 24°C/ })
      ).toHaveTextContent('High temp 24°C');
      expect(
        screen.getByRole('button', { name: /EI 800.*Low temp 18°C/ })
      ).toHaveTextContent('Low temp 18°C');
      const roomRow = screen.getByRole('button', { name: /EI 1600/ });
      expect(roomRow).not.toHaveTextContent(/temp/);
    });

    it('with the current recipe at 24C, says a 20C row is at 20C, in plain words', () => {
      inProvider(
        <RecipeList
          rows={rowsFor([warm, room], warm)}
          currentId="warm"
          onSelect={vi.fn()}
        />
      );
      const roomRow = screen.getByRole('button', { name: /EI 1600/ });
      expect(roomRow).toHaveTextContent('at 20°C');
      expect(roomRow).not.toHaveTextContent(/temp/);
    });

    it('never doubles the chip with the plain note when a differing row is not at 20C', () => {
      const rows = rowsFor([room, cold], room);
      expect(rows.find((r) => r.view === cold)?.temperatureDiffers).toBe(true);
      inProvider(
        <RecipeList rows={rows} currentId="room" onSelect={vi.fn()} />
      );
      const row = screen.getByRole('button', { name: /EI 800/ });
      expect(row).toHaveTextContent('Low temp 18°C');
      expect(row.textContent?.match(/18°C/g)).toHaveLength(1);
    });
  });

  it('draws nothing with no rows', () => {
    inProvider(<RecipeList rows={[]} onSelect={vi.fn()} />);
    expect(screen.queryByRole('list')).toBeNull();
  });
});

describe('SavedRecipes', () => {
  it('draws nothing at all when there are none', () => {
    const { container } = inProvider(
      <SavedRecipes recipes={[]} onSelect={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('lists shortcuts, with the chip on a recipe away from 20C and the film it opens', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const rebrand = makeFilm('rebrand', { name: 'Rebrand 400' });
    const warm = makeView('warm', hp5, xtol, {
      temperatureC: 24,
      temperatureF: 75.2,
    });
    const room = makeView('room', hp5, xtol, { shootingIso: 800 }, 'custom');
    const recipes = [{ view: warm, film: rebrand }, { view: room }];
    inProvider(<SavedRecipes recipes={recipes} onSelect={onSelect} />);
    expect(
      screen.getByRole('heading', { name: 'Saved recipes' })
    ).toBeVisible();
    const warmRow = screen.getByRole('button', {
      name: /Ilford Rebrand 400 in Kodak XTOL.*High temp 24°C/,
    });
    expect(warmRow).toHaveTextContent('High temp 24°C');
    const roomRow = screen.getByRole('button', {
      name: /Ilford HP5 Plus in Kodak XTOL, 1\+1, EI 800/,
    });
    expect(roomRow).not.toHaveTextContent(/temp/);
    expect(within(roomRow).getByText('Custom')).toBeVisible();
    await user.click(warmRow);
    expect(onSelect).toHaveBeenCalledWith(recipes[0]);
  });
});

describe('option helpers stay honest about units', () => {
  it('follows the Fahrenheit setting in the chip and spoken name', () => {
    localStorage.setItem('dorkroom-temperature-unit', 'fahrenheit');
    const warm = makeView('warm', hp5, makeDeveloper('dev', { name: 'Dev' }), {
      temperatureC: 24,
      temperatureF: 75.2,
    });
    inProvider(<RecipeList rows={rowsFor([warm])} onSelect={vi.fn()} />);
    expect(
      screen.getByRole('button', { name: /High temp 75\.2°F/ })
    ).toHaveTextContent('High temp 75.2°F');
  });
});

describe('SearchableSelect option target size', () => {
  it('gives an option with a detail 44px', async () => {
    const user = userEvent.setup();
    render(
      <SearchableSelect
        label="Film"
        selectedValue=""
        onValueChange={vi.fn()}
        items={[{ value: 'a', label: 'Alpha', detail: '2 recipes' }]}
      />
    );
    await user.click(screen.getByRole('combobox'));
    expect(screen.getByRole('option')).toHaveClass('min-h-11');
  });
});

describe('FilmDeveloperSelection layouts', () => {
  const setup = (
    props: Partial<Parameters<typeof FilmDeveloperSelection>[0]> = {}
  ) =>
    render(
      <FilmDeveloperSelection
        selectedFilm=""
        onFilmChange={vi.fn()}
        filmOptions={[{ value: 'a', label: 'Alpha' }]}
        selectedDeveloper=""
        onDeveloperChange={vi.fn()}
        developerOptions={[{ value: 'b', label: 'Beta' }]}
        {...props}
      />
    );
  const gridOf = (root: Element) => root.querySelector('.grid');

  it('frames only the card', () => {
    const card = setup();
    expect(card.container.firstElementChild).toHaveClass('rounded-2xl', 'p-6');
    card.unmount();
    for (const layout of ['columns', 'stacked'] as const) {
      const view = setup({ layout });
      expect(view.container.firstElementChild).not.toHaveClass('rounded-2xl');
      expect(view.container.firstElementChild).not.toHaveClass('p-6');
      view.unmount();
    }
  });

  it('puts the pickers side by side except in stacked', () => {
    for (const [layout, twoColumns] of [
      ['card', true],
      ['columns', true],
      ['stacked', false],
    ] as const) {
      const view = setup({ layout });
      const grid = gridOf(view.container);
      if (twoColumns) expect(grid).toHaveClass('md:grid-cols-2');
      else expect(grid).not.toHaveClass('md:grid-cols-2');
      view.unmount();
    }
  });

  it('keeps the live region mounted and polite, so a later change is announced', () => {
    const live = () => document.querySelector('p[aria-live="polite"]');
    const view = setup({ layout: 'stacked' });
    expect(live()).toBeEmptyDOMElement();
    view.rerender(
      <FilmDeveloperSelection
        selectedFilm=""
        onFilmChange={vi.fn()}
        filmOptions={[]}
        selectedDeveloper=""
        onDeveloperChange={vi.fn()}
        developerOptions={[]}
        layout="stacked"
        needs="film"
      />
    );
    expect(live()).toHaveTextContent('Choose a film next.');
  });

  it('draws the needed outline dashed and offset, unlike the solid focus ring', () => {
    setup({ needs: 'film' });
    expect(screen.getByRole('combobox', { name: 'Film' })).toHaveClass(
      'outline-dashed',
      'outline-offset-2'
    );
  });

  describe('focusFilm', () => {
    it('focuses Film without opening its list', () => {
      const ref = createRef<FilmDeveloperSelectionHandle>();
      setup({ ref, layout: 'stacked' });
      act(() => ref.current?.focusFilm());
      const film = screen.getByRole('combobox', { name: 'Film' });
      expect(film).toHaveFocus();
      expect(film).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByRole('listbox')).toBeNull();
    });

    it('still opens on a later click, so the opt-out is one shot', async () => {
      const user = userEvent.setup();
      const ref = createRef<FilmDeveloperSelectionHandle>();
      setup({ ref, layout: 'stacked' });
      act(() => ref.current?.focusFilm());
      await user.click(screen.getByRole('combobox', { name: 'Film' }));
      expect(screen.getByRole('listbox')).toBeVisible();
    });

    it('still opens when tabbed back to, so the opt-out does not stay armed', async () => {
      const user = userEvent.setup();
      const ref = createRef<FilmDeveloperSelectionHandle>();
      setup({ ref, layout: 'stacked' });
      act(() => ref.current?.focusFilm());
      const film = screen.getByRole('combobox', { name: 'Film' });
      await user.tab();
      expect(film).not.toHaveFocus();
      await user.tab({ shift: true });
      expect(film).toHaveFocus();
      expect(film).toHaveAttribute('aria-expanded', 'true');
    });
  });
});

describe('RecipeSearchBox keys and text size', () => {
  const box = (props: Partial<Parameters<typeof RecipeSearchBox>[0]> = {}) => {
    render(<RecipeSearchBox value="hp5" onChange={vi.fn()} {...props} />);
    return screen.getByRole('searchbox');
  };

  it('with onEscape, takes Escape from the browser and from useEscapeKey', () => {
    const onEscape = vi.fn();
    const input = box({ onEscape });
    // fireEvent returns false when the handler called preventDefault.
    expect(fireEvent.keyDown(input, { key: 'Escape' })).toBe(false);
    expect(onEscape).toHaveBeenCalledOnce();
  });

  it('without onEscape, leaves Escape to the browser', () => {
    expect(fireEvent.keyDown(box(), { key: 'Escape' })).toBe(true);
  });

  it('leaves Escape alone during IME composition', () => {
    const onEscape = vi.fn();
    const input = box({ onEscape });
    expect(fireEvent.keyDown(input, { key: 'Escape', isComposing: true })).toBe(
      true
    );
    expect(onEscape).not.toHaveBeenCalled();
  });

  it('reports Enter, and no other key', () => {
    const onEnter = vi.fn();
    const input = box({ onEnter });
    fireEvent.keyDown(input, { key: 'a' });
    expect(onEnter).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onEnter).toHaveBeenCalledOnce();
  });

  it('uses 16px text, or iOS zooms on focus', () => {
    expect(box()).toHaveClass('text-base');
  });

  it('uses the ref it is given', () => {
    const inputRef = createRef<HTMLInputElement>();
    box({ inputRef });
    expect(inputRef.current).toBe(screen.getByRole('searchbox'));
  });

  it('a mouse press on clear does not take focus from the box', () => {
    box();
    const pressed = fireEvent.mouseDown(
      screen.getByRole('button', { name: 'Clear text' })
    );
    expect(pressed).toBe(false);
  });
});

describe('RecipeSearchResults details', () => {
  const films = [hp5];

  it('names the developer the hit belongs to, not the row spelling', () => {
    const typed = makeDeveloper('custom-xtol', {
      name: 'xtol',
      manufacturer: 'kodak',
    });
    const index = indexOf([makeView('mine', hp5, typed, {}, 'custom')], films, [
      xtol,
    ]);
    const result = searchRecipes('hp5 xtol', index);
    expect(result.hits[0].view.developer?.name).toBe('xtol');
    inProvider(
      <RecipeSearchResults
        query="hp5 xtol"
        result={result}
        onSelectHit={vi.fn()}
      />
    );
    expect(
      screen.getByRole('button', { name: /Ilford HP5 Plus in Kodak XTOL/ })
    ).toBeVisible();
  });

  it('marks a custom recipe in words and in its spoken name', () => {
    const index = indexOf([makeView('mine', hp5, xtol, {}, 'custom')], films, [
      xtol,
    ]);
    inProvider(
      <RecipeSearchResults
        query="hp5"
        result={searchRecipes('hp5', index)}
        onSelectHit={vi.fn()}
      />
    );
    const row = screen.getByRole('button', { name: /custom recipe/ });
    expect(within(row).getByText('Custom')).toBeVisible();
  });

  it('says one result in the singular', () => {
    const index = indexOf([makeView('one', hp5, xtol)], films, [xtol]);
    inProvider(
      <RecipeSearchResults
        query="hp5"
        result={searchRecipes('hp5', index)}
        onSelectHit={vi.fn()}
      />
    );
    expect(screen.getByRole('status')).toHaveTextContent(/^1 recipe\.$/);
  });

  it('says several results fastest first', () => {
    const index = indexOf(
      [
        makeView('one', hp5, xtol),
        makeView('two', hp5, xtol, { shootingIso: 800 }),
      ],
      films,
      [xtol]
    );
    inProvider(
      <RecipeSearchResults
        query="hp5"
        result={searchRecipes('hp5', index)}
        onSelectHit={vi.fn()}
      />
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      '2 recipes, fastest first.'
    );
  });

  it('puts the status above the list, where the keyboard does not cover it', () => {
    const index = indexOf([makeView('one', hp5, xtol)], films, [xtol]);
    inProvider(
      <RecipeSearchResults
        query="hp5"
        result={searchRecipes('hp5', index)}
        onSelectHit={vi.fn()}
      />
    );
    const position = screen
      .getByRole('status')
      .compareDocumentPosition(screen.getByRole('list'));
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('takes the empty text from the page', () => {
    inProvider(
      <RecipeSearchResults
        query="hp5"
        result={{ hits: [], total: 0, truncated: false }}
        onSelectHit={vi.fn()}
        emptyText="None of your saved recipes match."
      />
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'None of your saved recipes match.'
    );
  });

  it('hands out the first result only through firstResultRef', () => {
    const index = indexOf(
      [
        makeView('slow', hp5, xtol, { shootingIso: 800, timeMinutes: 12 }),
        makeView('fast', hp5, xtol, { timeMinutes: 5 }),
      ],
      films,
      [xtol]
    );
    const firstResultRef = createRef<HTMLButtonElement>();
    inProvider(
      <RecipeSearchResults
        query="hp5"
        result={searchRecipes('hp5', index)}
        onSelectHit={vi.fn()}
        firstResultRef={firstResultRef}
      />
    );
    expect(firstResultRef.current).toHaveTextContent('5:00');
  });
});

describe('RecipeList details', () => {
  it('draws a border on the current row, beyond the tint', () => {
    inProvider(
      <RecipeList
        rows={rowsFor(delta400Pair)}
        currentId="delta-hc-a"
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { current: true })).toHaveClass(
      'border-primary'
    );
    expect(screen.getByRole('button', { name: /7 minutes/ })).toHaveClass(
      'border-transparent',
      'hover:border-primary'
    );
  });

  it('numbers rows only within one EI', () => {
    const pair = [
      makeView('a', delta400, ilfotec, { customDilution: '1:31' }),
      makeView('b', delta400, ilfotec, {
        customDilution: '1:31',
        shootingIso: 800,
      }),
    ];
    inProvider(<RecipeList rows={rowsFor(pair)} onSelect={vi.fn()} />);
    expect(screen.queryByText(/Listing/)).toBeNull();
  });
});

describe('SavedRecipes details', () => {
  const room = makeView('room', hp5, xtol);

  it('uses brand and maker, because "100 in XTOL" is ambiguous', () => {
    inProvider(<SavedRecipes recipes={[{ view: room }]} onSelect={vi.fn()} />);
    expect(screen.getByText('Ilford HP5 Plus in Kodak XTOL')).toBeVisible();
  });

  it('film: null says Unknown film rather than falling back to view.film', () => {
    inProvider(
      <SavedRecipes recipes={[{ view: room, film: null }]} onSelect={vi.fn()} />
    );
    expect(screen.getByText('Unknown film in Kodak XTOL')).toBeVisible();
    expect(screen.queryByText(/HP5/)).toBeNull();
  });

  it('marks the current recipe', () => {
    inProvider(
      <SavedRecipes
        recipes={[{ view: room }]}
        currentId="room"
        onSelect={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { current: true })).toBeVisible();
  });

  it('shows a dilution the developer defines, with none typed on the row', () => {
    const developer = makeDeveloper('ddx', {
      name: 'DD-X',
      dilutions: [{ id: '7', name: 'Standard', dilution: '1+4' }],
    });
    const view = makeView('picked', hp5, developer, {
      customDilution: null,
      dilutionId: '7',
    });
    inProvider(<SavedRecipes recipes={[{ view }]} onSelect={vi.fn()} />);
    expect(screen.getByText('1+4, EI 400')).toBeVisible();
  });

  it('omits an invented Stock when the developer is missing', () => {
    const lost = {
      ...makeView('lost', hp5, xtol, { customDilution: null, dilutionId: '7' }),
      developer: undefined,
    };
    inProvider(<SavedRecipes recipes={[{ view: lost }]} onSelect={vi.fn()} />);
    expect(screen.getByText('EI 400')).toBeVisible();
    expect(screen.queryByText(/Stock/)).toBeNull();
  });

  it('reads Stock with no dilution at all, like the panel', () => {
    const stock = {
      ...makeView('stock', hp5, xtol, { customDilution: null }),
      developer: undefined,
    };
    inProvider(<SavedRecipes recipes={[{ view: stock }]} onSelect={vi.fn()} />);
    expect(screen.getByText('Stock, EI 400')).toBeVisible();
  });

  it('keeps a typed dilution when the developer is missing', () => {
    const lost = {
      ...makeView('lost', hp5, xtol, { customDilution: '1+3' }),
      developer: undefined,
    };
    inProvider(<SavedRecipes recipes={[{ view: lost }]} onSelect={vi.fn()} />);
    expect(screen.getByText('1+3, EI 400')).toBeVisible();
  });
});
