import '@testing-library/jest-dom/vitest';
import type { Combination, Developer, Film } from '@dorkroom/api';
import {
  type DevelopmentCombinationView,
  getSpeedChoices,
  getTemperatureChoices,
} from '@dorkroom/logic';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  RecipePanel,
  type RecipePanelProps,
} from '../../../components/development-recipes/recipe-panel';
import { RecipeTemperatureChip } from '../../../components/development-recipes/recipe-temperature-chip';
import { TemperatureProvider } from '../../../contexts/temperature-context';
import { VolumeProvider } from '../../../contexts/volume-context';

const TIMESTAMP = '2026-01-01T00:00:00.000Z';

const film: Film = {
  id: 1,
  uuid: 'f1',
  slug: 'hp5',
  name: 'HP5 Plus',
  brand: 'Ilford',
  isoSpeed: 400,
  colorType: 'bw',
  grainStructure: null,
  description: 'A classic.',
  manufacturerNotes: null,
  reciprocityFailure: null,
  discontinued: false,
  staticImageUrl: null,
  imageCredit: null,
  imageSourceUrl: null,
  aliases: [],
  baseFilmSlug: null,
  dateAdded: TIMESTAMP,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
};

const developer: Developer = {
  id: 1,
  uuid: 'd1',
  slug: 'dd-x',
  name: 'DD-X',
  manufacturer: 'Ilford',
  type: 'concentrate',
  description: 'A liquid developer.',
  filmOrPaper: true,
  dilutions: [],
  mixingInstructions: null,
  storageRequirements: null,
  safetyNotes: null,
  imageCredit: null,
  imageSourceUrl: null,
  notes: null,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
};

const make = (
  uuid: string,
  overrides: Partial<Combination> = {},
  source: 'api' | 'custom' = 'api'
): DevelopmentCombinationView => ({
  combination: {
    id: 1,
    uuid,
    name: uuid,
    filmStockId: 'f1',
    filmSlug: 'hp5',
    developerId: 'd1',
    developerSlug: 'dd-x',
    shootingIso: 400,
    dilutionId: null,
    customDilution: '1+4',
    temperatureC: 20,
    temperatureF: 68,
    timeMinutes: 9.5,
    agitationMethod: '',
    agitationSchedule: null,
    pushPull: 0,
    tags: [],
    notes: null,
    infoSource: null,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  },
  film,
  developer,
  source,
});

/** Mirrors how the page feeds the panel: choices come from the logic functions. */
function Harness({
  pair,
  initial,
  ...props
}: {
  pair: DevelopmentCombinationView[];
  initial: DevelopmentCombinationView;
} & Partial<RecipePanelProps>) {
  const [view, setView] = useState(initial);
  return (
    <RecipePanel
      view={view}
      film={film}
      onSelectRecipe={setView}
      temperatureChoices={getTemperatureChoices(pair, view)}
      speedChoices={getSpeedChoices(pair, view, 400)}
      isSaved={false}
      onToggleSaved={vi.fn()}
      onCopyLink={vi.fn()}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
      {...props}
    />
  );
}

const renderPanel = (
  pair: DevelopmentCombinationView[],
  props: Partial<RecipePanelProps> = {}
) =>
  render(
    <TemperatureProvider>
      <VolumeProvider>
        <Harness pair={pair} initial={pair[0]} {...props} />
      </VolumeProvider>
    </TemperatureProvider>
  );

const single = make('only');

describe('RecipePanel', () => {
  beforeEach(() => {
    localStorage.clear();
    // user-event's radio arrow-key walk needs CSS.escape, which this DOM lacks.
    window.CSS.escape ??= (value: string) => value.replace(/[^\w-]/g, '\\$&');
  });
  afterEach(cleanup);

  it('shows the time and the temperature in both units', () => {
    renderPanel([single]);
    expect(screen.getByText('9:30')).toBeInTheDocument();
    expect(screen.getByText('minutes at 68°F (20°C)')).toBeInTheDocument();
  });

  it('reads the time in one announcement', () => {
    renderPanel([single]);
    expect(
      screen.getByText('Development time 9 minutes 30 seconds at 20°C and 68°F')
    ).toBeInTheDocument();
  });

  it('says "Not in source" when the recipe has no agitation', () => {
    renderPanel([single]);
    expect(screen.getByText('Agitation').nextElementSibling).toHaveTextContent(
      'Not in source'
    );
  });

  it('shows a stored agitation value as stored', () => {
    renderPanel([
      make('a', { agitationSchedule: '30s first, then 10s per minute' }),
    ]);
    expect(
      screen.getByText('30s first, then 10s per minute')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Agitation').nextElementSibling
    ).not.toHaveTextContent('Not in source');
  });

  it('links the source', () => {
    renderPanel([
      make('s', { infoSource: 'https://www.filmdev.org/recipe/1' }),
    ]);
    expect(screen.getByRole('link', { name: /FilmDev\.org/ })).toHaveAttribute(
      'href',
      'https://www.filmdev.org/recipe/1'
    );
  });

  it('draws no choice chips when the source has no alternatives', () => {
    renderPanel([single]);
    expect(
      screen.queryByRole('radiogroup', { name: 'Temperature' })
    ).toBeNull();
    expect(screen.queryByRole('radiogroup', { name: 'Speed' })).toBeNull();
  });

  describe('with alternatives', () => {
    const pair = [
      make('t20', { timeMinutes: 9.5 }),
      make('t24', { temperatureC: 24, temperatureF: 75.2, timeMinutes: 7 }),
      make('i800', { shootingIso: 800, timeMinutes: 11 }),
      make('i1600warm', {
        shootingIso: 1600,
        temperatureC: 24,
        temperatureF: 75.2,
        timeMinutes: 12.5,
      }),
    ];

    it('lists temperature choices with their times as radios', () => {
      renderPanel(pair);
      const group = screen.getByRole('radiogroup', { name: 'Temperature' });
      expect(
        within(group).getByRole('radio', { name: '68°F, 9 minutes 30 seconds' })
      ).toBeChecked();
      expect(
        within(group).getByRole('radio', { name: '75.2°F, 7 minutes' })
      ).not.toBeChecked();
    });

    it('follows the C/F unit in chip labels', () => {
      localStorage.setItem('dorkroom-temperature-unit', 'celsius');
      renderPanel(pair);
      const group = screen.getByRole('radiogroup', { name: 'Temperature' });
      expect(
        within(group).getByRole('radio', { name: '24°C, 7 minutes' })
      ).toBeInTheDocument();
    });

    it('lists speed choices and names the temperature of one published elsewhere', () => {
      renderPanel(pair);
      const group = screen.getByRole('radiogroup', { name: 'Speed' });
      expect(
        within(group).getByRole('radio', {
          name: 'EI 400, 9 minutes 30 seconds, box speed',
        })
      ).toBeChecked();
      expect(
        within(group).getByRole('radio', {
          name: 'EI 800, 11 minutes',
        })
      ).toBeInTheDocument();
      expect(
        within(group).getByRole('radio', {
          name: 'EI 1600, 12 minutes 30 seconds, at 75.2°F',
        })
      ).toBeInTheDocument();
    });

    it('selects a recipe on click and moves the checked chip', () => {
      renderPanel(pair);
      fireEvent.click(
        screen.getByRole('radio', { name: 'EI 800, 11 minutes' })
      );
      expect(
        screen.getByText(/^Development time 11 minutes/)
      ).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /^EI 800/ })).toBeChecked();
    });

    it('moves with arrow keys, keeping one tab stop', async () => {
      const user = userEvent.setup();
      renderPanel(pair);
      const group = screen.getByRole('radiogroup', { name: 'Speed' });
      for (let i = 0; i < 20 && !group.contains(document.activeElement); i++) {
        await user.tab();
      }
      expect(within(group).getByRole('radio', { checked: true })).toHaveFocus();
      await user.keyboard('{ArrowRight}');
      const checked = within(group).getByRole('radio', { checked: true });
      expect(checked).toHaveAccessibleName(/^EI 800/);
      expect(checked).toHaveFocus();
      await user.keyboard('{ArrowLeft}');
      expect(
        within(group).getByRole('radio', { checked: true })
      ).toHaveAccessibleName(/^EI 400/);
    });

    it('marks the selected chip with a check, not colour alone', () => {
      renderPanel(pair);
      const group = screen.getByRole('radiogroup', { name: 'Speed' });
      const [selected, other] = within(group).getAllByRole('radio');
      const check = (radio: HTMLElement) =>
        radio.parentElement?.querySelector('svg');
      expect(check(selected)).not.toBeNull();
      expect(check(other)).toBeNull();
    });

    it('keeps the chip off the bare border class that high contrast repaints', () => {
      renderPanel(pair);
      for (const radio of screen.getAllByRole('radio')) {
        const classes = (radio.nextElementSibling?.className ?? '').split(' ');
        expect(classes).toContain('border-1');
        expect(classes).not.toContain('border');
      }
    });

    it('keeps chip targets at least 44px', () => {
      renderPanel(pair);
      for (const radio of screen.getAllByRole('radio')) {
        expect(radio.nextElementSibling?.className).toContain('min-h-11');
      }
    });
  });

  describe('mixing', () => {
    it('offers 300, 500 and 1000 ml and a free input', () => {
      renderPanel([single]);
      const presets = screen.getByRole('radiogroup', {
        name: 'Total volume presets',
      });
      expect(
        within(presets)
          .getAllByRole('radio')
          .map((r) => r.getAttribute('aria-label'))
      ).toEqual(['300 ml', '500 ml', '1000 ml']);
      expect(screen.getByRole('radio', { name: '500 ml' })).toBeChecked();
      expect(screen.getByLabelText('Total volume')).toHaveValue(500);
    });

    it('gives developer and water for 1+4', () => {
      renderPanel([single]);
      fireEvent.click(screen.getByRole('radio', { name: '1000 ml' }));
      expect(screen.getByText('200 ml')).toBeInTheDocument();
      expect(screen.getByText('800 ml')).toBeInTheDocument();
    });

    it('accepts a typed volume and unchecks the presets', () => {
      renderPanel([single]);
      fireEvent.change(screen.getByLabelText('Total volume'), {
        target: { value: '350' },
      });
      expect(screen.getByText('70 ml')).toBeInTheDocument();
      for (const radio of within(
        screen.getByRole('radiogroup', { name: 'Total volume presets' })
      ).getAllByRole('radio')) {
        expect(radio).not.toBeChecked();
      }
    });

    it('keeps the volume when the recipe changes', () => {
      const pair = [
        make('a'),
        make('b', { shootingIso: 800, timeMinutes: 11 }),
      ];
      renderPanel(pair);
      fireEvent.change(screen.getByLabelText('Total volume'), {
        target: { value: '350' },
      });
      fireEvent.click(screen.getByRole('radio', { name: /^EI 800/ }));
      expect(screen.getByLabelText('Total volume')).toHaveValue(350);
      fireEvent.click(screen.getByRole('radio', { name: '1000 ml' }));
      fireEvent.click(screen.getByRole('radio', { name: /^EI 400/ }));
      expect(screen.getByRole('radio', { name: '1000 ml' })).toBeChecked();
    });

    it('says nothing needs mixing for stock', () => {
      renderPanel([make('stock', { customDilution: 'Stock' })]);
      expect(
        screen.getByText(/No mixing needed: use developer stock/)
      ).toBeInTheDocument();
      expect(screen.queryByRole('radio', { name: '300 ml' })).toBeNull();
    });
  });

  describe('actions', () => {
    it('saves, copies the link and switches units on the wide layout', () => {
      const onToggleSaved = vi.fn();
      const onCopyLink = vi.fn();
      renderPanel([single], { onToggleSaved, onCopyLink });
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
      expect(onToggleSaved).toHaveBeenCalledTimes(1);
      expect(onCopyLink).toHaveBeenCalledTimes(1);
      expect(
        screen.getByRole('switch', { name: /Switch to/ })
      ).toBeInTheDocument();
    });

    it('reflects the saved state', () => {
      renderPanel([single], { isSaved: true });
      expect(screen.getByRole('button', { name: 'Saved' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
    });

    it('leaves Save, Copy link and the unit toggle to the page on the phone layout', () => {
      renderPanel([single], { layout: 'phone' });
      expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Copy link' })).toBeNull();
      expect(screen.queryByRole('switch', { name: /Switch to/ })).toBeNull();
    });

    it('offers Edit and Delete on a custom recipe only', () => {
      const onEdit = vi.fn();
      const onDelete = vi.fn();
      const custom = make('c', {}, 'custom');
      const { unmount } = renderPanel([custom], { onEdit, onDelete });
      fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledTimes(1);
      unmount();

      renderPanel([single], { onEdit, onDelete });
      expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
    });
  });

  it('names the recipe in a heading and prefers the film prop', () => {
    const sibling: Film = {
      ...film,
      slug: 'arista',
      name: 'Arista EDU',
      brand: 'Freestyle',
    };
    renderPanel([single], { film: sibling });
    expect(
      screen.getByRole('heading', {
        name: 'Freestyle Arista EDU in Ilford DD-X',
      })
    ).toBeInTheDocument();
  });

  it('names the preferred film in the Film section too', () => {
    const sibling: Film = { ...film, slug: 'arista', name: 'Arista EDU' };
    renderPanel([single], { film: sibling });
    expect(screen.getByRole('button', { name: /Film/ })).toHaveTextContent(
      'Ilford Arista EDU'
    );
    fireEvent.click(screen.getByRole('button', { name: /Film/ }));
    expect(
      screen.getByRole('link', { name: /View in Film Database/ })
    ).toHaveAttribute('href', '/films?film=arista');
  });

  it('gives a custom film no database link', () => {
    const custom: Film = { ...film, slug: 'custom_film_123' };
    renderPanel([single], { film: custom });
    fireEvent.click(screen.getByRole('button', { name: /Film/ }));
    expect(
      screen.queryByRole('link', { name: /View in Film Database/ })
    ).toBeNull();
  });

  it('reports the Film section as expanded or not', () => {
    renderPanel([single]);
    const button = screen.getByRole('button', { name: /Film/ });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('hides the visual time from a screen reader, which gets the sentence instead', () => {
    renderPanel([single]);
    expect(
      screen.getByText('9:30').closest('[aria-hidden="true"]')
    ).not.toBeNull();
    expect(
      screen
        .getByText(/^Development time 9 minutes/)
        .closest('[aria-hidden="true"]')
    ).toBeNull();
  });

  it('puts a visible focus ring on the heading it can be sent to', () => {
    renderPanel([single]);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.className).toContain('focus-visible:ring-2');
  });

  it('hands the heading to headingRef', () => {
    const ref = createRef<HTMLHeadingElement>();
    renderPanel([single], { headingRef: ref });
    ref.current?.focus();
    expect(screen.getByRole('heading', { level: 2 })).toHaveFocus();
  });

  it('falls back to "Your recipe" for a custom recipe with no source', () => {
    renderPanel([make('c', {}, 'custom')]);
    expect(screen.getByText('Source').nextElementSibling).toHaveTextContent(
      'Your recipe'
    );
  });

  it('names the maker for an official source link', () => {
    renderPanel([
      make('k', {
        infoSource: 'https://example.com/f4017.pdf',
        tags: ['official-kodak'],
      }),
    ]);
    expect(
      screen.getByRole('link', { name: 'Official Kodak source' })
    ).toBeInTheDocument();
  });

  it('keeps a 44px target on the source link and the volume input', () => {
    renderPanel([make('k', { infoSource: 'https://example.com/x' })]);
    expect(
      screen.getByRole('link', { name: /View source/ }).className
    ).toContain('min-h-11');
    expect(screen.getByLabelText('Total volume').className).toContain(
      'min-h-11'
    );
  });

  it('shows no chip group for a single temperature, whatever the page passes', () => {
    const only = make('x');
    render(
      <TemperatureProvider>
        <VolumeProvider>
          <RecipePanel
            view={only}
            film={film}
            onSelectRecipe={vi.fn()}
            temperatureChoices={getTemperatureChoices([only], only)}
            speedChoices={[]}
            isSaved={false}
            onToggleSaved={vi.fn()}
            onCopyLink={vi.fn()}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
          />
        </VolumeProvider>
      </TemperatureProvider>
    );
    expect(
      screen.queryByRole('radiogroup', { name: 'Temperature' })
    ).toBeNull();
  });

  it.each([
    [{ shootingIso: 400 }, 'box speed'],
    [{ shootingIso: 800 }, 'push +1'],
    [{ shootingIso: 200 }, 'pull -1'],
    [{ shootingIso: 640 }, 'above box speed'],
    [{ shootingIso: 320 }, 'below box speed'],
  ])('describes %j against box speed in the subtitle', (overrides, text) => {
    renderPanel([make('s', overrides)]);
    expect(
      screen.getByRole('heading', { level: 2 }).nextElementSibling
    ).toHaveTextContent(text);
  });

  it('positions every chip label so the hidden radio can not widen the page', () => {
    renderPanel([make('a'), make('b', { shootingIso: 800, timeMinutes: 11 })]);
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio.parentElement?.className).toContain('relative');
    }
  });

  it('sizes chip groups by height only on the wide layout', () => {
    const pair = [make('a'), make('b', { shootingIso: 800, timeMinutes: 11 })];
    const { unmount } = renderPanel(pair, { layout: 'phone' });
    expect(
      screen.getByRole('radiogroup', { name: 'Speed' }).parentElement?.className
    ).not.toContain('basis-64');
    unmount();
    renderPanel(pair, { layout: 'wide' });
    expect(
      screen.getByRole('radiogroup', { name: 'Speed' }).parentElement?.className
    ).toContain('basis-64');
  });

  it('shows Speed without Temperature when only speeds are published', () => {
    renderPanel([make('a'), make('b', { shootingIso: 800, timeMinutes: 11 })]);
    expect(
      screen.getByRole('radiogroup', { name: 'Speed' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('radiogroup', { name: 'Temperature' })
    ).toBeNull();
  });

  it('measures the speed against the film prop, not view.film', () => {
    const rated: Film = { ...film, isoSpeed: 800 };
    renderPanel([make('s', { shootingIso: 800 })], { film: rated });
    expect(
      screen.getByRole('heading', { level: 2 }).nextElementSibling
    ).toHaveTextContent('box speed');
  });

  it('shows no banner above the time', () => {
    renderPanel([
      make('w', { shootingIso: 1600, temperatureC: 26, temperatureF: 78.8 }),
    ]);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText(/stops/)).toBeNull();
  });

  it('reads a Fahrenheit-stored custom recipe at a non-standard temperature', () => {
    renderPanel([
      make(
        'f',
        { temperatureF: 75, temperatureC: 23.89, timeMinutes: 8 },
        'custom'
      ),
    ]);
    expect(screen.getByText('minutes at 75°F (23.9°C)')).toBeInTheDocument();
    expect(screen.getByText(/at 23\.9°C and 75°F/)).toBeInTheDocument();
  });

  it('keeps the film and developer sections and the notes', () => {
    renderPanel([
      make('n', { notes: 'Rate at box speed.', tags: ['official-ilford'] }),
    ]);
    fireEvent.click(screen.getByRole('button', { name: /Film/ }));
    expect(screen.getByText('A classic.')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /View in Film Database/ })
    ).toHaveAttribute('href', '/films?film=hp5');
    fireEvent.click(screen.getByRole('button', { name: /Developer/ }));
    expect(screen.getByText('A liquid developer.')).toBeInTheDocument();
    expect(screen.getByText('Rate at box speed.')).toBeInTheDocument();
  });
});

describe('RecipePanel temperature flag', () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  const warm = make('w', {
    temperatureC: 24,
    temperatureF: 75.2,
    timeMinutes: 7,
  });

  it('shows "High temp" beside the time for a warm recipe', () => {
    renderPanel([warm]);
    expect(screen.getByText('High temp 75.2°F')).toBeInTheDocument();
  });

  it('follows the user unit', () => {
    localStorage.setItem('dorkroom-temperature-unit', 'celsius');
    renderPanel([warm]);
    expect(screen.getByText('High temp 24°C')).toBeInTheDocument();
  });

  it('reserves its row while another temperature is one tap away', () => {
    const pair = [
      make('t20', { timeMinutes: 9 }),
      make('t24', { temperatureC: 24, temperatureF: 75.2, timeMinutes: 7 }),
    ];
    const { container } = renderPanel(pair);
    const row = container.querySelector('.min-h-8');
    expect(row).not.toBeNull();
    expect(row).toBeEmptyDOMElement();
  });

  it('adds no row for a room-temperature recipe with no other temperature', () => {
    const { container } = renderPanel([single]);
    expect(container.querySelector('.min-h-8')).toBeNull();
  });
});

describe('RecipeTemperatureChip', () => {
  beforeEach(() => localStorage.clear());
  afterEach(cleanup);

  const chip = (temperatureC: number, temperatureF: number) =>
    render(
      <TemperatureProvider>
        <RecipeTemperatureChip
          temperatureC={temperatureC}
          temperatureF={temperatureF}
        />
      </TemperatureProvider>
    );

  it('renders nothing at 20C', () => {
    const { container } = chip(20, 68);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing inside the tolerance', () => {
    expect(chip(20.06, 68.1).container).toBeEmptyDOMElement();
  });

  it('uses the sun icon for High', () => {
    const { container } = chip(24, 75.2);
    expect(container.querySelector('svg')).toHaveClass(
      'lucide-thermometer-sun'
    );
  });

  it('follows its surface colour instead of pinning one', () => {
    chip(24, 75.2);
    const classes = screen.getByText(/High temp/).className.split(' ');
    expect(classes).toContain('border-current');
    expect(classes).not.toContain('text-primary');
    expect(classes).not.toContain('border-primary');
  });

  it('renders just past the tolerance', () => {
    chip(20.1, 68.2);
    expect(screen.getByText('High temp 68.2°F')).toBeInTheDocument();
  });

  it('says "Low temp" below, with a snowflake icon', () => {
    localStorage.setItem('dorkroom-temperature-unit', 'celsius');
    const { container } = chip(18, 64.4);
    expect(screen.getByText('Low temp 18°C')).toBeInTheDocument();
    expect(container.querySelector('svg')).toHaveAttribute(
      'aria-hidden',
      'true'
    );
  });

  it('reads a Fahrenheit-stored custom recipe at 75F', () => {
    chip(23.89, 75);
    expect(screen.getByText('High temp 75°F')).toBeInTheDocument();
  });

  it('avoids the bare border class', () => {
    chip(24, 75.2);
    const classes = screen.getByText(/High temp/).className.split(' ');
    expect(classes).toContain('border-1');
    expect(classes).not.toContain('border');
  });
});
