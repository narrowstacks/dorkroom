import type { Combination, Developer, Film } from '@dorkroom/api';
import type { DevelopmentCombinationView } from '@dorkroom/logic';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RecipeDetailPanel } from '../../components/development-recipes/recipe-detail-panel';
import { TemperatureProvider } from '../../contexts/temperature-context';
import { VolumeProvider } from '../../contexts/volume-context';

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
  description: '',
  manufacturerNotes: null,
  reciprocityFailure: null,
  discontinued: false,
  staticImageUrl: null,
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
  description: '',
  filmOrPaper: true,
  dilutions: [],
  mixingInstructions: null,
  storageRequirements: null,
  safetyNotes: null,
  notes: null,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
};

const combination: Combination = {
  id: 1,
  uuid: 'c1',
  name: 'HP5 in DD-X',
  filmStockId: 'f1',
  filmSlug: 'hp5',
  developerId: 'd1',
  developerSlug: 'dd-x',
  shootingIso: 400,
  dilutionId: null,
  customDilution: '1+4',
  temperatureC: 20,
  temperatureF: 68,
  timeMinutes: 9,
  agitationMethod: 'standard',
  agitationSchedule: null,
  pushPull: 0,
  tags: [],
  notes: null,
  infoSource: null,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
};

const viewOf = (source: 'api' | 'custom'): DevelopmentCombinationView => ({
  combination,
  film,
  developer,
  source,
  canShare: true,
});

function renderPanel(source: 'api' | 'custom', sharingEnabled: boolean) {
  return render(
    <TemperatureProvider>
      <VolumeProvider>
        <RecipeDetailPanel
          view={viewOf(source)}
          isOpen
          onClose={vi.fn()}
          isMobile={false}
          onToggleFavorite={vi.fn()}
          onShareRecipe={vi.fn()}
          onCopyRecipe={vi.fn()}
          customRecipeSharingEnabled={sharingEnabled}
        />
      </VolumeProvider>
    </TemperatureProvider>
  );
}

const hasButton = (name: string) =>
  screen.queryByRole('button', { name }) !== null;

afterEach(cleanup);

describe('RecipeDetailPanel share actions', () => {
  it.each([false, true])(
    'always offers Share, never Copy link, on a built-in recipe (sharing %s)',
    (sharingEnabled) => {
      renderPanel('api', sharingEnabled);
      expect(hasButton('Share')).toBe(true);
      expect(hasButton('Copy link')).toBe(false);
    }
  );

  it('hides Share and Copy link on a custom recipe while sharing is off', () => {
    renderPanel('custom', false);
    expect(hasButton('Share')).toBe(false);
    expect(hasButton('Copy link')).toBe(false);
  });

  it('shows Share and Copy link on a custom recipe once sharing is on', () => {
    renderPanel('custom', true);
    expect(hasButton('Share')).toBe(true);
    expect(hasButton('Copy link')).toBe(true);
  });
});
