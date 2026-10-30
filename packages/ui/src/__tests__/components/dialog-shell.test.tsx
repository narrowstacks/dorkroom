import type { Combination, Developer, Film } from '@dorkroom/api';
import {
  type DevelopmentCombinationView,
  type FilmdevRecipe,
  mapFilmdevRecipe,
} from '@dorkroom/logic';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfirmModal } from '../../components/confirm-modal';
import { FilmdevPreviewModal } from '../../components/development-recipes/filmdev-preview-modal';
import { SharedRecipeModal } from '../../components/development-recipes/shared-recipe-modal';
import { SaveBeforeShareModal } from '../../components/save-before-share-modal';
import { ShareModal } from '../../components/share-modal';
import { TemperatureProvider } from '../../contexts/temperature-context';
import { VolumeProvider } from '../../contexts/volume-context';

const film: Film = {
  id: 1,
  uuid: 'f1',
  slug: 'hp5',
  name: 'HP5 Plus',
  brand: 'Ilford',
  isoSpeed: 400,
  colorType: 'bw',
  grainStructure: 'classic',
  description: 'Classic film',
  manufacturerNotes: null,
  reciprocityFailure: null,
  discontinued: false,
  staticImageUrl: null,
  aliases: [],
  baseFilmSlug: null,
  dateAdded: '2023-01-01',
  createdAt: '2023-01-01',
  updatedAt: '2023-01-01',
};

const developer: Developer = {
  id: 1,
  uuid: 'd1',
  slug: 'dd-x',
  name: 'DD-X',
  manufacturer: 'Ilford',
  type: 'liquid',
  description: 'Standard dev',
  filmOrPaper: true,
  dilutions: [{ id: '1', name: '1+4', dilution: '1+4' }],
  mixingInstructions: null,
  storageRequirements: null,
  safetyNotes: null,
  notes: null,
  createdAt: '2023-01-01',
  updatedAt: '2023-01-01',
};

const combination: Combination = {
  id: 1,
  uuid: 'c1',
  name: 'HP5 Plus in DD-X',
  filmStockId: 'f1',
  developerId: 'd1',
  dilutionId: '1',
  pushPull: 0,
  shootingIso: 400,
  timeMinutes: 8,
  temperatureF: 68,
  temperatureC: 20,
  agitationMethod: 'continuous',
  agitationSchedule: null,
  notes: null,
  infoSource: null,
  customDilution: null,
  filmSlug: 'hp5',
  developerSlug: 'dd-x',
  tags: [],
  createdAt: '2023-01-01',
  updatedAt: '2023-01-01',
};

const recipeView: DevelopmentCombinationView = {
  combination,
  film,
  developer,
  source: 'api',
};

const filmdevRecipe: FilmdevRecipe = {
  id: 1,
  film: 'Ilford HP5 Plus',
  developer: 'Ilford DD-X',
  dilution_ratio: '1+4',
  celcius: '20',
  fahrenheit: '68',
  duration_hours: 0,
  duration_minutes: 8,
  duration_seconds: 0,
  notes: '',
  created: '2023-01-01',
  user: 'someone',
  recipe_link: 'https://filmdev.org/recipe/show/1',
  recipe_name: 'HP5 Plus in DD-X',
  profile_link: 'https://filmdev.org/users/someone',
  photos_link: 'https://filmdev.org/recipe/show/1/photos',
  format: null,
  developed_at: null,
};

const mappingResult = mapFilmdevRecipe(filmdevRecipe, [film], [developer]);

interface DialogCase {
  name: string;
  /** Accessible name the dialog must expose through aria-labelledby. */
  label: string | RegExp;
  render: (onClose: () => void, isMobile?: boolean) => ReactElement;
}

const MODAL_CASES: DialogCase[] = [
  {
    name: 'ConfirmModal',
    label: 'Delete Recipe',
    render: (onClose) => (
      <ConfirmModal
        isOpen
        onClose={onClose}
        onConfirm={vi.fn()}
        title="Delete Recipe"
        message="Are you sure?"
      />
    ),
  },
  {
    name: 'ShareModal',
    label: 'Share "My Preset"',
    render: (onClose) => (
      <ShareModal
        isOpen
        onClose={onClose}
        presetName="My Preset"
        webUrl="https://dorkroom.art/border?p=abc"
        onCopyToClipboard={vi.fn(async () => {})}
      />
    ),
  },
  {
    name: 'ShareModal (no URL)',
    label: 'Unable to Share',
    render: (onClose) => (
      <ShareModal
        isOpen
        onClose={onClose}
        presetName="My Preset"
        webUrl=""
        onCopyToClipboard={vi.fn(async () => {})}
      />
    ),
  },
  {
    name: 'SaveBeforeShareModal',
    label: 'Save Preset to Share',
    render: (onClose) => (
      <SaveBeforeShareModal isOpen onClose={onClose} onSaveAndShare={vi.fn()} />
    ),
  },
  {
    name: 'SharedRecipeModal',
    label: 'Recipe Shared',
    render: (onClose, isMobile = false) => (
      <SharedRecipeModal
        isOpen
        onClose={onClose}
        recipe={recipeView}
        onAddToCollection={vi.fn()}
        isMobile={isMobile}
      />
    ),
  },
  {
    name: 'FilmdevPreviewModal',
    label: 'Preview Recipe from filmdev.org',
    render: (onClose, isMobile = false) => (
      <FilmdevPreviewModal
        isOpen
        onClose={onClose}
        onConfirm={vi.fn()}
        mappingResult={mappingResult}
        previewRecipe={recipeView}
        isMobile={isMobile}
      />
    ),
  },
];

// The recipe dialogs embed DevelopmentRecipeDetail, which reads the
// temperature and volume units from context.
const wrapper = ({ children }: { children: ReactNode }) => (
  <TemperatureProvider>
    <VolumeProvider>{children}</VolumeProvider>
  </TemperatureProvider>
);

function renderDialog(ui: ReactElement) {
  return render(ui, { wrapper });
}

afterEach(() => {
  cleanup();
  document.body.style.overflow = '';
});

describe.each(MODAL_CASES)('$name renders through the shared Modal', (c) => {
  it('exposes a modal dialog named by aria-labelledby', () => {
    renderDialog(c.render(vi.fn()));

    const dialog = screen.getByRole('dialog', { name: c.label });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).not.toHaveAttribute('aria-label');

    const labelId = dialog.getAttribute('aria-labelledby');
    expect(labelId).toBeTruthy();
    expect(document.getElementById(labelId ?? '')).toHaveTextContent(c.label);
  });

  it('is portalled to document.body behind the shared backdrop', () => {
    const { container } = renderDialog(c.render(vi.fn()));

    expect(container).toBeEmptyDOMElement();
    expect(screen.getByTestId('modal-backdrop')).toBeInTheDocument();
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    renderDialog(c.render(onClose));

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on backdrop click but not on a click inside the panel', () => {
    const onClose = vi.fn();
    renderDialog(c.render(onClose));

    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('modal-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('locks body scroll while open', () => {
    document.body.style.overflow = 'auto';
    renderDialog(c.render(vi.fn()));

    expect(document.body.style.overflow).toBe('hidden');
  });
});

const DRAWER_CASES = MODAL_CASES.filter(
  (c) => c.name === 'SharedRecipeModal' || c.name === 'FilmdevPreviewModal'
);

describe.each(DRAWER_CASES)(
  '$name renders through the shared ResponsiveModal drawer on mobile',
  (c) => {
    it('uses the shared drawer header instead of a centred modal', () => {
      renderDialog(c.render(vi.fn(), true));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByTestId('modal-backdrop')).not.toBeInTheDocument();
      expect(
        screen.getByRole('heading', { level: 2, name: c.label })
      ).toBeInTheDocument();
    });

    it('closes from the header close button', () => {
      const onClose = vi.fn();
      renderDialog(c.render(onClose, true));

      fireEvent.click(screen.getByRole('button', { name: 'Close' }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('closes on Escape', () => {
      const onClose = vi.fn();
      renderDialog(c.render(onClose, true));

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('closes on backdrop click', () => {
      const onClose = vi.fn();
      renderDialog(c.render(onClose, true));

      const backdrop = document.querySelector('[role="presentation"]');
      if (!backdrop) throw new Error('drawer backdrop not found');
      fireEvent.click(backdrop);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('pins the actions below the scrolling drawer body', () => {
      renderDialog(c.render(vi.fn(), true));

      const heading = screen.getByRole('heading', { level: 2, name: c.label });
      const content = heading.parentElement?.parentElement;
      if (!content) throw new Error('drawer content not found');
      const [header, body, footer] = Array.from(content.children);

      expect(header).toContainElement(heading);
      expect(body).toHaveClass('overflow-y-auto');
      expect(footer).toContainElement(
        screen.getByRole('button', { name: /^(Cancel|Not now)$/ })
      );
    });
  }
);
