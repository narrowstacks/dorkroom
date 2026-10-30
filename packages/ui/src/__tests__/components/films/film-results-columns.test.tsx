import type { Film } from '@dorkroom/api';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FilmResultsVirtualized } from '../../../components/films/film-results-virtualized';
import { RESIZE_DEBOUNCE_MS } from '../../../lib/resize-debounce';

// Cold load: the list first renders its loading skeleton, then swaps in the
// results scroll container. The column count must follow the element that is
// actually mounted, and keep following its resizes.

let containerWidth = 0;
const observers: MockResizeObserver[] = [];

class MockResizeObserver implements ResizeObserver {
  readonly targets = new Set<Element>();

  constructor(private readonly callback: ResizeObserverCallback) {
    observers.push(this);
  }

  observe(target: Element) {
    this.targets.add(target);
  }

  unobserve(target: Element) {
    this.targets.delete(target);
  }

  disconnect() {
    this.targets.clear();
  }

  resize(width: number) {
    const size: ResizeObserverSize = { blockSize: 600, inlineSize: width };
    const entries = Array.from(this.targets, (target) => ({
      target,
      contentRect: DOMRectReadOnly.fromRect({ width, height: 600 }),
      borderBoxSize: [size],
      contentBoxSize: [size],
      devicePixelContentBoxSize: [size],
    }));
    if (entries.length > 0) this.callback(entries, this);
  }
}

const films: Film[] = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  uuid: `film-${index + 1}`,
  slug: `film-${index + 1}`,
  name: `Film ${index + 1}`,
  brand: 'Ilford',
  isoSpeed: 400,
  colorType: 'bw',
  grainStructure: null,
  description: '',
  manufacturerNotes: null,
  reciprocityFailure: null,
  discontinued: false,
  staticImageUrl: null,
  aliases: [],
  baseFilmSlug: null,
  dateAdded: '2023-01-01',
  createdAt: '2023-01-01',
  updatedAt: '2023-01-01',
}));

const noop = () => {
  // no-op
};

function renderList(isLoading: boolean) {
  return (
    <FilmResultsVirtualized
      films={isLoading ? [] : films}
      selectedFilmId={null}
      onSelectFilm={noop}
      isLoading={isLoading}
    />
  );
}

/** Pushes a container resize through every live observer, past the debounce. */
function resizeTo(width: number) {
  containerWidth = width;
  act(() => {
    for (const observer of observers) observer.resize(width);
    vi.advanceTimersByTime(RESIZE_DEBOUNCE_MS);
  });
}

/** Column count of the rendered results grid. */
function renderedColumnCount(): number | undefined {
  const firstCard = screen.getAllByRole('button', { name: /Film \d+/ })[0];
  const grid = firstCard?.closest<HTMLElement>('.grid');
  if (!grid) throw new Error('no results grid rendered');
  const match = /repeat\((\d+),/.exec(grid.style.gridTemplateColumns);
  return match ? Number(match[1]) : undefined;
}

describe('FilmResultsVirtualized column count on a cold load', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    observers.length = 0;
    containerWidth = 1400;
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(
      () => containerWidth
    );
    // The virtualizer sizes its viewport from this; without it no rows render.
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
      () => DOMRect.fromRect({ width: containerWidth, height: 600 })
    );
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('measures the results container once it replaces the skeleton', () => {
    const { rerender } = render(renderList(true));
    // The skeleton grid is measured too: three rows of four.
    expect(
      screen.getAllByRole('status', { name: 'Loading film card' })
    ).toHaveLength(12);

    rerender(renderList(false));

    expect(renderedColumnCount()).toBe(4);
  });

  it('follows resizes of the container after loading', () => {
    const { rerender } = render(renderList(true));
    rerender(renderList(false));
    expect(renderedColumnCount()).toBe(4);

    resizeTo(1100);
    expect(renderedColumnCount()).toBe(3);

    resizeTo(700);
    expect(renderedColumnCount()).toBe(2);
  });
});
