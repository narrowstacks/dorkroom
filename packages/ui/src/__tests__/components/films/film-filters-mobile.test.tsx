import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { FilmFiltersMobile } from '../../../components/films/film-filters-mobile';

const noop = () => {
  // no-op
};

describe('FilmFiltersMobile stacking', () => {
  afterEach(() => {
    cleanup();
  });

  // jsdom does not paint, so this guards the class rather than the pixels.
  // The results grid after this card is built from absolutely positioned,
  // transformed rows (each its own stacking context at layer 0). The card must
  // sit on a higher layer, or an open SearchableSelect list inside it renders
  // behind the film cards (#596).
  it('puts the filter card on a layer above the results grid', () => {
    const { container } = render(
      <FilmFiltersMobile
        searchQuery=""
        onSearchChange={noop}
        colorTypeFilter=""
        onColorTypeChange={noop}
        isoSpeedFilter=""
        onIsoSpeedChange={noop}
        brandFilter=""
        onBrandChange={noop}
        discontinuedFilter="all"
        onDiscontinuedChange={noop}
        brandOptions={[]}
        isoOptions={[]}
        onClearFilters={noop}
        hasActiveFilters={false}
        resultCount={0}
      />
    );

    const card = container.firstElementChild;
    expect(card).toHaveClass('relative', 'z-10');
  });
});
