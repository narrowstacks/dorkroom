import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  FilmToolbar,
  type FilmToolbarProps,
} from '../../../components/films/film-toolbar';

function setup(overrides: Partial<FilmToolbarProps> = {}) {
  const handlers = {
    onSearchChange: vi.fn(),
    onColorTypeChange: vi.fn(),
    onIsoSpeedChange: vi.fn(),
    onBrandChange: vi.fn(),
    onDiscontinuedChange: vi.fn(),
    onClearFilters: vi.fn(),
    onSortChange: vi.fn(),
  };
  const props: FilmToolbarProps = {
    searchQuery: '',
    colorTypeFilter: '',
    isoSpeedFilter: '',
    brandFilter: '',
    discontinuedFilter: 'all',
    brandOptions: [
      { label: 'All brands', value: '' },
      { label: 'Ilford', value: 'Ilford' },
    ],
    isoOptions: [
      { label: 'All ISO', value: '' },
      { label: '400', value: '400' },
    ],
    hasActiveFilters: false,
    resultCount: 225,
    sort: 'name',
    recipesSortAvailable: true,
    showSortSelect: true,
    ...handlers,
    ...overrides,
  };
  const view = render(<FilmToolbar {...props} />);
  return { ...handlers, ...view };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('FilmToolbar', () => {
  // The results below are absolutely positioned, transformed rows, each its
  // own stacking context at layer 0. The toolbar must sit on a higher layer,
  // or an open SearchableSelect list inside it renders behind them (#596).
  it('sits on a layer above the results', () => {
    const { container } = setup();
    expect(container.firstElementChild).toHaveClass('relative', 'z-10');
  });

  it('reports search text', () => {
    const { onSearchChange } = setup();
    fireEvent.change(screen.getByRole('textbox', { name: 'Search films' }), {
      target: { value: 'hp5' },
    });
    expect(onSearchChange).toHaveBeenCalledWith('hp5');
  });

  it('reports the film type from a radio group', () => {
    const { onColorTypeChange } = setup();
    const group = screen.getByRole('radiogroup', { name: 'Film type' });
    const radios = within(group).getAllByRole('radio');
    expect(radios.map((radio) => radio.closest('label')?.textContent)).toEqual([
      'All types',
      'Black & White',
      'Color',
      'Slide',
    ]);
    expect(radios[0]).toBeChecked();
    fireEvent.click(within(group).getByRole('radio', { name: 'Slide' }));
    expect(onColorTypeChange).toHaveBeenCalledWith('slide');
  });

  it('uses native radios sharing one name, so arrow keys and one tab stop come for free', () => {
    setup({ colorTypeFilter: 'bw' });
    const radios = screen.getAllByRole('radio');
    expect(
      new Set(radios.map((radio) => radio.getAttribute('name'))).size
    ).toBe(1);
    expect(radios.every((radio) => radio instanceof HTMLInputElement)).toBe(
      true
    );
    expect(screen.getByRole('radio', { name: 'Black & White' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Color' })).not.toBeChecked();
  });

  it('selects the neighbouring type when the user arrows to it', async () => {
    // user-event's radio walk needs CSS.escape, which happy-dom lacks.
    vi.stubGlobal('CSS', { escape: (value: string) => value });
    const user = userEvent.setup();
    const { onColorTypeChange } = setup({
      colorTypeFilter: 'bw',
      showSortSelect: false,
    });
    await user.tab();
    await user.tab();
    expect(screen.getByRole('radio', { name: 'Black & White' })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(onColorTypeChange).toHaveBeenLastCalledWith('color');
  });

  it('reports the status filter', () => {
    const { onDiscontinuedChange } = setup();
    fireEvent.change(screen.getByLabelText('Status'), {
      target: { value: 'discontinued' },
    });
    expect(onDiscontinuedChange).toHaveBeenCalledWith('discontinued');
  });

  it('offers ISO and brand selects', () => {
    setup();
    expect(screen.getByLabelText('ISO speed')).toBeInTheDocument();
    expect(screen.getByLabelText('Brand')).toBeInTheDocument();
  });

  it('puts the result count in the search placeholder, not as visible text', () => {
    setup({ resultCount: 225 });
    expect(screen.getByPlaceholderText('Search 225 films...')).toBeVisible();
    expect(screen.queryByText('225 films')).not.toBeInTheDocument();
    cleanup();
    setup({ resultCount: 1 });
    expect(screen.getByPlaceholderText('Search 1 film...')).toBeVisible();
  });

  it('shows Clear filters only with active filters', () => {
    const { onClearFilters } = setup({ hasActiveFilters: true });
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(onClearFilters).toHaveBeenCalledTimes(1);
    cleanup();
    setup({ hasActiveFilters: false });
    expect(
      screen.queryByRole('button', { name: 'Clear filters' })
    ).not.toBeInTheDocument();
  });

  it('returns focus to the search box after Clear filters', () => {
    setup({ hasActiveFilters: true });
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByRole('textbox', { name: 'Search films' })).toHaveFocus();
  });

  it('shows no count while the catalog is loading', () => {
    setup({ resultCount: null });
    expect(screen.getByPlaceholderText('Search films...')).toBeVisible();
  });

  it('keeps the visually hidden search label', () => {
    setup();
    expect(screen.getByText('Search films', { selector: 'label' })).toHaveClass(
      'sr-only'
    );
  });

  it('hides the sort select unless asked', () => {
    setup({ showSortSelect: false });
    expect(screen.queryByLabelText('Sort')).not.toBeInTheDocument();
  });

  it('shows the applied sort and reports changes', () => {
    const { onSortChange } = setup({ sort: 'iso' });
    const sort = screen.getByLabelText('Sort');
    expect(sort).toHaveValue('iso');
    expect(
      within(sort)
        .getAllByRole('option')
        .map((option) => option.textContent)
    ).toEqual(['Sort: Name', 'Sort: ISO', 'Sort: Recipes']);
    fireEvent.change(sort, { target: { value: 'recipes' } });
    expect(onSortChange).toHaveBeenCalledWith('recipes');
  });

  it('never mentions recipes when the recipes sort is unavailable', () => {
    const { container } = setup({ recipesSortAvailable: false });
    expect(container).not.toHaveTextContent(/recipe/i);
    expect(
      within(screen.getByLabelText('Sort'))
        .getAllByRole('option')
        .map((option) => option.textContent)
    ).toEqual(['Sort: Name', 'Sort: ISO']);
  });
});
