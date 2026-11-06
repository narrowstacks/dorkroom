import '@testing-library/jest-dom/vitest';
import { searchRecipes } from '@dorkroom/logic';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { recipeRowsToPickerOptions } from '../../../components/development-recipes/recipe-picker-option';
import { RecipePickerSheet } from '../../../components/development-recipes/recipe-picker-sheet';
import { RecipeSearchSheet } from '../../../components/development-recipes/recipe-search-sheet';
import { TemperatureProvider } from '../../../contexts/temperature-context';
import {
  delta400,
  delta400Pair,
  hp5,
  ilfotec,
  indexOf,
  makeView,
  rowsFor,
  xtol,
} from './recipe-pickers.fixtures';

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});
beforeEach(() => localStorage.setItem('dorkroom-temperature-unit', 'celsius'));
afterEach(cleanup);

const options = [
  { value: 'hp5', label: 'Ilford HP5 Plus', detail: '76 recipes' },
  { value: 'delta', label: 'Ilford Delta 400', detail: 'No XTOL recipes' },
  { value: 'trix', label: 'Kodak Tri-X 400', detail: '35 recipes' },
];

const PickerHarness = ({
  onSelect,
  children,
}: {
  onSelect?: (value: string) => void;
  children?: ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <TemperatureProvider>
      <button type="button" onClick={() => setIsOpen(true)}>
        Open
      </button>
      {children}
      <RecipePickerSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Film"
        filterLabel="Filter films"
        options={options}
        selectedValue="trix"
        onSelect={onSelect ?? vi.fn()}
      />
    </TemperatureProvider>
  );
};

describe('RecipePickerSheet', () => {
  const open = async () => {
    const user = userEvent.setup();
    render(<PickerHarness />);
    const opener = screen.getByRole('button', { name: 'Open' });
    await user.click(opener);
    const dialog = await screen.findByRole('dialog', { name: 'Film' });
    await within(dialog).findByRole('searchbox', { name: 'Filter films' });
    return { user, opener, dialog };
  };

  it('lists options as buttons with their text, marking the selected one', async () => {
    const { dialog } = await open();
    expect(within(dialog).getAllByRole('listitem')).toHaveLength(3);
    const current = within(dialog).getByRole('button', { current: true });
    expect(current).toHaveTextContent('Kodak Tri-X 400');
    expect(within(dialog).getByText('No XTOL recipes')).toBeVisible();
  });

  it('filters on the label, not the detail, and says when nothing matches', async () => {
    const { user, dialog } = await open();
    const filter = within(dialog).getByRole('searchbox', {
      name: 'Filter films',
    });
    await user.type(filter, 'ilford');
    expect(within(dialog).getAllByRole('listitem')).toHaveLength(2);
    await user.clear(filter);
    await user.type(filter, 'recipes');
    expect(within(dialog).queryAllByRole('listitem')).toHaveLength(0);
    expect(within(dialog).getByRole('status')).toHaveTextContent(
      'Nothing matches'
    );
  });

  it('does not put focus in the filter on open, which would raise the keyboard', async () => {
    const { dialog } = await open();
    await waitFor(() =>
      expect(dialog.contains(document.activeElement)).toBe(true)
    );
    expect(within(dialog).getByRole('searchbox')).not.toHaveFocus();
  });

  it('returns focus to the opener on Escape', async () => {
    const { user, opener } = await open();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it('returns focus to the opener after a pick, and reports it', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<PickerHarness onSelect={onSelect} />);
    const opener = screen.getByRole('button', { name: 'Open' });
    await user.click(opener);
    const dialog = await screen.findByRole('dialog', { name: 'Film' });
    await user.click(
      await within(dialog).findByRole('button', { name: /HP5 Plus/ })
    );
    expect(onSelect).toHaveBeenCalledWith('hp5');
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it('starts empty again after closing with a filter typed', async () => {
    const { user, opener, dialog } = await open();
    await user.type(within(dialog).getByRole('searchbox'), 'zzz');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('searchbox')).toBeNull(), {
      timeout: 2000,
    });
    await user.click(opener);
    expect(await screen.findByRole('searchbox')).toHaveValue('');
  });
});

describe('RecipePickerSheet with recipe rows', () => {
  it('filters rows by label and keeps duplicates apart and the chip on', async () => {
    const user = userEvent.setup();
    const warm = makeView('warm', delta400, ilfotec, {
      customDilution: '1:47',
      shootingIso: 800,
      temperatureC: 24,
      temperatureF: 75.2,
    });
    render(
      <TemperatureProvider>
        <RecipePickerSheet
          isOpen
          onClose={vi.fn()}
          title="Recipe"
          filterLabel="Filter recipes"
          options={recipeRowsToPickerOptions(rowsFor([...delta400Pair, warm]), {
            unit: 'celsius',
            boxIso: 400,
          })}
          onSelect={vi.fn()}
        />
      </TemperatureProvider>
    );
    const dialog = await screen.findByRole('dialog', { name: 'Recipe' });
    expect(await within(dialog).findByText('Listing 2 of 2')).toBeVisible();
    await user.type(within(dialog).getByRole('searchbox'), '800');
    const row = within(dialog).getByRole('button', { name: /EI 800/ });
    expect(row).toHaveTextContent('High temp 24°C');
    expect(within(dialog).getAllByRole('listitem')).toHaveLength(1);
  });
});

const index = indexOf(
  [makeView('h1', hp5, xtol, { shootingIso: 800 })],
  [hp5],
  [xtol]
);

const SearchHarness = ({
  seed = '',
  onSelectHit = vi.fn(),
  withReturnFocus = false,
}: {
  seed?: string;
  onSelectHit?: () => void;
  withReturnFocus?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(seed);
  const heading = useRef<HTMLHeadingElement>(null);
  return (
    <TemperatureProvider>
      <h2 ref={heading} tabIndex={-1}>
        Recipe heading
      </h2>
      <button type="button" onClick={() => setIsOpen(true)}>
        Open search
      </button>
      <RecipeSearchSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        query={query}
        onQueryChange={setQuery}
        result={searchRecipes(query, index)}
        onSelectHit={onSelectHit}
        returnFocus={withReturnFocus ? heading : undefined}
      >
        <p>Scope goes here</p>
      </RecipeSearchSheet>
    </TemperatureProvider>
  );
};

describe('RecipeSearchSheet', () => {
  it('opens with focus in the search box and the seeded query', async () => {
    const user = userEvent.setup();
    render(<SearchHarness seed="hp5 800" />);
    await user.click(screen.getByRole('button', { name: 'Open search' }));
    const dialog = await screen.findByRole('dialog', {
      name: 'Search recipes',
    });
    const box = await within(dialog).findByRole('searchbox');
    expect(box).toHaveValue('hp5 800');
    await waitFor(() => expect(box).toHaveFocus());
    expect(
      within(dialog).getByRole('button', { name: /HP5 Plus in Kodak XTOL/ })
    ).toBeVisible();
    expect(within(dialog).getByText('Scope goes here')).toBeVisible();
  });

  it('returns focus to the opener on Escape', async () => {
    const user = userEvent.setup();
    render(<SearchHarness />);
    const opener = screen.getByRole('button', { name: 'Open search' });
    await user.click(opener);
    await screen.findByRole('dialog', { name: 'Search recipes' });
    await user.keyboard('{Escape}');
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it('a pick reports the hit, closes, and sends focus where asked', async () => {
    const user = userEvent.setup();
    const onSelectHit = vi.fn();
    render(
      <SearchHarness seed="hp5" onSelectHit={onSelectHit} withReturnFocus />
    );
    await user.click(screen.getByRole('button', { name: 'Open search' }));
    const dialog = await screen.findByRole('dialog', {
      name: 'Search recipes',
    });
    await user.click(
      await within(dialog).findByRole('button', { name: /HP5 Plus/ })
    );
    expect(onSelectHit).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'Recipe heading', hidden: true })
      ).toHaveFocus()
    );
  });
});

describe('sheet sizing', () => {
  it('the search drawer is nearly full height, limited in vh', async () => {
    render(
      <TemperatureProvider>
        <RecipeSearchSheet
          isOpen
          onClose={vi.fn()}
          query=""
          onQueryChange={vi.fn()}
          result={{ hits: [], total: 0, truncated: false }}
          onSelectHit={vi.fn()}
        />
      </TemperatureProvider>
    );
    const dialog = await screen.findByRole('dialog', {
      name: 'Search recipes',
    });
    expect(dialog).toHaveClass('h-[92dvh]');
    const limited = dialog.querySelector<HTMLElement>('[style*="max-height"]');
    expect(limited?.style.maxHeight).toBe('92vh');
  });
});

describe('sheet details', () => {
  it('the close button takes the 44px class', async () => {
    render(
      <TemperatureProvider>
        <RecipePickerSheet
          isOpen
          onClose={vi.fn()}
          title="Film"
          filterLabel="Filter films"
          options={options}
          onSelect={vi.fn()}
        />
      </TemperatureProvider>
    );
    const dialog = await screen.findByRole('dialog', { name: 'Film' });
    expect(
      await within(dialog).findByRole('button', { name: 'Close' })
    ).toHaveClass('size-11');
  });

  it('the picker sends focus to returnFocus on close', async () => {
    const user = userEvent.setup();
    const Harness = () => {
      const [isOpen, setIsOpen] = useState(false);
      const target = useRef<HTMLButtonElement>(null);
      return (
        <TemperatureProvider>
          <button ref={target} type="button">
            Target
          </button>
          <button type="button" onClick={() => setIsOpen(true)}>
            Open
          </button>
          <RecipePickerSheet
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            title="Film"
            filterLabel="Filter films"
            options={options}
            onSelect={vi.fn()}
            returnFocus={target}
          />
        </TemperatureProvider>
      );
    };
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await screen.findByRole('dialog', { name: 'Film' });
    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Target' })).toHaveFocus()
    );
  });

  it('the picker opens scrolled to the selected row', async () => {
    const rect = (top: number, bottom: number): DOMRect => ({
      top,
      bottom,
      left: 0,
      right: 0,
      x: 0,
      y: top,
      width: 0,
      height: bottom - top,
      toJSON: () => ({}),
    });
    const measure = vi
      .spyOn(Element.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: Element) {
        if (this.tagName === 'UL') return rect(100, 200);
        if (this.hasAttribute('aria-current')) return rect(500, 544);
        return rect(0, 0);
      });
    try {
      render(
        <TemperatureProvider>
          <RecipePickerSheet
            isOpen
            onClose={vi.fn()}
            title="Film"
            filterLabel="Filter films"
            options={options}
            selectedValue="trix"
            onSelect={vi.fn()}
          />
        </TemperatureProvider>
      );
      const dialog = await screen.findByRole('dialog', { name: 'Film' });
      const list = await within(dialog).findByRole('list');
      expect(list.scrollTop).toBe(344);
    } finally {
      measure.mockRestore();
    }
  });

  it('keeps the no-match region mounted before anything is typed', async () => {
    render(
      <TemperatureProvider>
        <RecipePickerSheet
          isOpen
          onClose={vi.fn()}
          title="Film"
          filterLabel="Filter films"
          options={options}
          onSelect={vi.fn()}
        />
      </TemperatureProvider>
    );
    const dialog = await screen.findByRole('dialog', { name: 'Film' });
    const status = await within(dialog).findByRole('status');
    expect(status).toBeEmptyDOMElement();
    expect(status).not.toHaveClass('empty:hidden');
    expect(status).toHaveClass('min-h-4');
  });

  it('keeps the last row clear of the home indicator', async () => {
    render(
      <TemperatureProvider>
        <RecipePickerSheet
          isOpen
          onClose={vi.fn()}
          title="Film"
          filterLabel="Filter films"
          options={options}
          onSelect={vi.fn()}
        />
      </TemperatureProvider>
    );
    const dialog = await screen.findByRole('dialog', { name: 'Film' });
    expect(await within(dialog).findByRole('list')).toHaveClass(
      'pb-[calc(1rem+env(safe-area-inset-bottom))]'
    );
  });

  it('Enter in the picker filter moves to the first row shown', async () => {
    const user = userEvent.setup();
    render(<PickerHarness />);
    await user.click(screen.getByRole('button', { name: 'Open' }));
    const dialog = await screen.findByRole('dialog', { name: 'Film' });
    await user.type(
      await within(dialog).findByRole('searchbox'),
      'kodak{Enter}'
    );
    expect(
      within(dialog).getByRole('button', { name: /Kodak Tri-X/ })
    ).toHaveFocus();
  });

  describe('Enter in the picker filter', () => {
    const enterIn = async (
      selectedValue: string | null,
      typed: string
    ): Promise<HTMLElement> => {
      const user = userEvent.setup();
      render(
        <TemperatureProvider>
          <RecipePickerSheet
            isOpen
            onClose={vi.fn()}
            title="Film"
            filterLabel="Filter films"
            options={options}
            selectedValue={selectedValue}
            onSelect={vi.fn()}
          />
        </TemperatureProvider>
      );
      const dialog = await screen.findByRole('dialog', { name: 'Film' });
      await user.click(await within(dialog).findByRole('searchbox'));
      await user.keyboard(`${typed}{Enter}`);
      return dialog;
    };

    it('goes to the selected row when nothing is typed', async () => {
      const dialog = await enterIn('trix', '');
      expect(
        within(dialog).getByRole('button', { name: /Kodak Tri-X/ })
      ).toHaveFocus();
    });

    it('goes to the first row when nothing is typed and nothing is selected', async () => {
      const dialog = await enterIn(null, '');
      expect(
        within(dialog).getByRole('button', { name: /HP5 Plus/ })
      ).toHaveFocus();
    });

    it('goes to the first match once something is typed, even past the selected row', async () => {
      const dialog = await enterIn('trix', '400');
      expect(
        within(dialog).getByRole('button', { name: /Delta 400/ })
      ).toHaveFocus();
    });
  });

  it('Escape in the picker filter closes, taking it from the browser', async () => {
    const user = userEvent.setup();
    render(<PickerHarness />);
    const opener = screen.getByRole('button', { name: 'Open' });
    await user.click(opener);
    const dialog = await screen.findByRole('dialog', { name: 'Film' });
    const box = await within(dialog).findByRole('searchbox');
    await user.click(box);
    // fireEvent returns false when the handler called preventDefault.
    expect(fireEvent.keyDown(box, { key: 'Escape' })).toBe(false);
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it('Enter in the search box moves to the first result', async () => {
    const user = userEvent.setup();
    render(<SearchHarness seed="hp5" />);
    await user.click(screen.getByRole('button', { name: 'Open search' }));
    const dialog = await screen.findByRole('dialog', {
      name: 'Search recipes',
    });
    const box = await within(dialog).findByRole('searchbox');
    await waitFor(() => expect(box).toHaveFocus());
    await user.keyboard('{Enter}');
    expect(
      within(dialog).getByRole('button', { name: /HP5 Plus/ })
    ).toHaveFocus();
  });

  it('Enter with no results stays in the box', async () => {
    const user = userEvent.setup();
    render(<SearchHarness seed="zzzz" />);
    await user.click(screen.getByRole('button', { name: 'Open search' }));
    const dialog = await screen.findByRole('dialog', {
      name: 'Search recipes',
    });
    const box = await within(dialog).findByRole('searchbox');
    await waitFor(() => expect(box).toHaveFocus());
    await user.keyboard('{Enter}');
    expect(box).toHaveFocus();
  });

  it('Escape in the search box closes and keeps the query', async () => {
    const user = userEvent.setup();
    const seen: string[] = [];
    const Harness = () => {
      const [isOpen, setIsOpen] = useState(false);
      const [query, setQuery] = useState('hp5');
      return (
        <TemperatureProvider>
          <button type="button" onClick={() => setIsOpen(true)}>
            Open search
          </button>
          <RecipeSearchSheet
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            query={query}
            onQueryChange={(next) => {
              seen.push(next);
              setQuery(next);
            }}
            result={searchRecipes(query, index)}
            onSelectHit={vi.fn()}
          />
        </TemperatureProvider>
      );
    };
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open search' });
    await user.click(opener);
    const dialog = await screen.findByRole('dialog', {
      name: 'Search recipes',
    });
    const box = await within(dialog).findByRole('searchbox');
    await waitFor(() => expect(box).toHaveFocus());
    // fireEvent returns false when the handler called preventDefault.
    expect(fireEvent.keyDown(box, { key: 'Escape' })).toBe(false);
    await waitFor(() => expect(opener).toHaveFocus());
    expect(seen).toEqual([]);
  });

  it('passes emptyText through to the results', async () => {
    render(
      <TemperatureProvider>
        <RecipeSearchSheet
          isOpen
          onClose={vi.fn()}
          query="hp5"
          onQueryChange={vi.fn()}
          result={{ hits: [], total: 0, truncated: false }}
          onSelectHit={vi.fn()}
          emptyText="None saved."
        />
      </TemperatureProvider>
    );
    const dialog = await screen.findByRole('dialog', {
      name: 'Search recipes',
    });
    expect(await within(dialog).findByRole('status')).toHaveTextContent(
      'None saved.'
    );
  });

  describe('a heading the pick mounts in the same commit', () => {
    const Harness = () => {
      const [isOpen, setIsOpen] = useState(false);
      const [picked, setPicked] = useState(false);
      const heading = useRef<HTMLHeadingElement>(null);
      useEffect(() => {
        if (picked && focusFromEffect.current) heading.current?.focus();
      }, [picked]);
      return (
        <TemperatureProvider>
          {picked && (
            <h2 ref={heading} tabIndex={-1}>
              Recipe heading
            </h2>
          )}
          <button type="button" onClick={() => setIsOpen(true)}>
            Open search
          </button>
          <RecipeSearchSheet
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            query="hp5"
            onQueryChange={vi.fn()}
            result={searchRecipes('hp5', index)}
            onSelectHit={() => setPicked(true)}
            returnFocus={heading}
          />
        </TemperatureProvider>
      );
    };
    const focusFromEffect = { current: false };

    const pick = async () => {
      const user = userEvent.setup();
      render(<Harness />);
      await user.click(screen.getByRole('button', { name: 'Open search' }));
      const dialog = await screen.findByRole('dialog', {
        name: 'Search recipes',
      });
      await user.click(
        await within(dialog).findByRole('button', { name: /HP5 Plus/ })
      );
    };

    it('is too late for returnFocus, so focus goes to the opener', async () => {
      focusFromEffect.current = false;
      await pick();
      await waitFor(() =>
        expect(
          screen.getByRole('button', { name: 'Open search', hidden: true })
        ).toHaveFocus()
      );
    });

    it('takes focus from its own effect, and keeps it', async () => {
      focusFromEffect.current = true;
      await pick();
      const heading = await screen.findByRole('heading', {
        name: 'Recipe heading',
        hidden: true,
      });
      await waitFor(() => expect(heading).toHaveFocus());
      // A drawer stays mounted through its slide-out; that must not move focus.
      await waitFor(
        () =>
          expect(screen.queryByRole('searchbox', { hidden: true })).toBeNull(),
        { timeout: 2000 }
      );
      expect(heading).toHaveFocus();
    });
  });
});

describe('search drawer focus timing', () => {
  it('focuses the box in the same task as the tap, for the iOS keyboard', () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', false);
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    const sheet = (isOpen: boolean) => (
      <TemperatureProvider>
        <RecipeSearchSheet
          isOpen={isOpen}
          onClose={vi.fn()}
          query=""
          onQueryChange={vi.fn()}
          result={{ hits: [], total: 0, truncated: false }}
          onSelectHit={vi.fn()}
        />
      </TemperatureProvider>
    );
    try {
      flushSync(() => root.render(sheet(false)));
      flushSync(() => root.render(sheet(true)));
      expect(document.activeElement).toBe(screen.getByRole('searchbox'));
    } finally {
      flushSync(() => root.unmount());
      host.remove();
      vi.unstubAllGlobals();
    }
  });
});
