import '@testing-library/jest-dom/vitest';
import {
  type DevelopmentCombinationView,
  TemperatureProvider,
  VolumeProvider,
} from '@dorkroom/ui';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RecipeDetailModal } from '../recipe-detail-modal';

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

describe('RecipeDetailModal sharing', () => {
  it('shows Share recipe and Copy link for a custom recipe', () => {
    const onShareRecipe = vi.fn().mockResolvedValue(undefined);
    const onCopyRecipe = vi.fn().mockResolvedValue(undefined);
    render(
      <TemperatureProvider>
        <VolumeProvider>
          <RecipeDetailModal
            isOpen
            onClose={() => undefined}
            detailView={customView}
            isMobile
            isFavorite={() => false}
            toggleFavorite={() => undefined}
            onEditCustomRecipe={() => undefined}
            onDeleteCustomRecipe={() => undefined}
            onShareRecipe={onShareRecipe}
            onCopyRecipe={onCopyRecipe}
          />
        </VolumeProvider>
      </TemperatureProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Share recipe' }));
    expect(onShareRecipe).toHaveBeenCalledWith(customView);
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    expect(onCopyRecipe).toHaveBeenCalledWith(customView);
  });
});
