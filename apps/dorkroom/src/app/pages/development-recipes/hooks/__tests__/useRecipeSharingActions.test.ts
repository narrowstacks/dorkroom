import type { Combination } from '@dorkroom/api';
import type { DevelopmentCombinationView } from '@dorkroom/logic';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRecipeSharingActions } from '../useRecipeSharingActions';

const TIMESTAMP = '2024-01-01T00:00:00Z';

const combination = (overrides: Partial<Combination>): Combination => ({
  id: 1,
  uuid: '11111111-1111-4111-8111-111111111111',
  name: 'HP5 in DD-X',
  filmStockId: 'f1',
  filmSlug: 'hp5-plus',
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
  ...overrides,
});

const view = (recipe: Combination): DevelopmentCombinationView => ({
  combination: recipe,
  source: 'api',
});

/**
 * Recipe shares count once per link, like every other share: copying the
 * same recipe twice is one share, another recipe is a new one.
 * `window.va` is the queue `@vercel/analytics` forwards to.
 */
describe('useRecipeSharingActions analytics', () => {
  const va = vi.fn();

  beforeEach(() => {
    va.mockReset();
    window.va = va;
  });

  afterEach(() => {
    delete window.va;
  });

  it('reports each recipe link once', async () => {
    const copied = vi
      .fn()
      .mockResolvedValue({ success: true, method: 'clipboard' as const });
    const { result } = renderHook(() =>
      useRecipeSharingActions({
        customRecipes: [],
        shareCustomRecipe: vi.fn(),
        copyCustomRecipeToClipboard: vi.fn(),
        shareRegularRecipe: vi.fn(),
        copyRegularRecipeToClipboard: copied,
        showToast: vi.fn(),
      })
    );
    const first = view(combination({}));
    const second = view(
      combination({ uuid: '22222222-2222-4222-8222-222222222222' })
    );

    await act(() => result.current.handleCopyCombination(first));
    await act(() => result.current.handleCopyCombination(first));
    expect(copied).toHaveBeenCalledTimes(2);
    expect(va).toHaveBeenCalledTimes(1);
    expect(va).toHaveBeenCalledWith('event', {
      name: 'share',
      data: { tool: 'recipe', method: 'clipboard' },
      options: undefined,
    });

    await act(() => result.current.handleCopyCombination(second));
    expect(va).toHaveBeenCalledTimes(2);
  });
});
