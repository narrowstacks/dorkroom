import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RecipeDetailPanel } from '../../components/development-recipes/recipe-detail-panel';
import { TemperatureProvider } from '../../contexts/temperature-context';
import { VolumeProvider } from '../../contexts/volume-context';
import type { DevelopmentCombinationView } from '../../development-recipes';

const customView: DevelopmentCombinationView = {
  combination: {
    id: -1,
    uuid: 'custom-1',
    name: 'Custom recipe',
    filmStockId: 'film-1',
    filmSlug: 'film-1',
    developerId: 'dev-1',
    developerSlug: 'dev-1',
    temperatureF: 68,
    temperatureC: 20,
    timeMinutes: 9.5,
    shootingIso: 400,
    pushPull: 0,
    agitationMethod: 'Standard',
    agitationSchedule: null,
    notes: null,
    customDilution: null,
    dilutionId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    tags: ['custom'],
    infoSource: null,
  },
  source: 'custom',
};

describe('RecipeDetailPanel sharing', () => {
  it('offers Share on a custom recipe', () => {
    const onShareRecipe = vi.fn();
    render(
      <TemperatureProvider>
        <VolumeProvider>
          <RecipeDetailPanel
            view={customView}
            isOpen
            onClose={() => undefined}
            isMobile={false}
            onShareRecipe={onShareRecipe}
          />
        </VolumeProvider>
      </TemperatureProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    expect(onShareRecipe).toHaveBeenCalledWith(customView);
  });
});
