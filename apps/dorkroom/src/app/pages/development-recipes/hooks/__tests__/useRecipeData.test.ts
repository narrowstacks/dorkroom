import type { CustomRecipe } from '@dorkroom/logic';
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useCustomCombinationViews,
  useRecipesByUuid,
  useSharedCustomRecipeView,
} from '../useRecipeData';

const noFilm = () => undefined;
const noDeveloper = () => undefined;

const createRecipe = (overrides: Partial<CustomRecipe> = {}): CustomRecipe => ({
  id: 'custom-valid',
  name: 'Valid Recipe',
  filmId: 'film-uuid-1',
  developerId: 'dev-uuid-1',
  temperatureF: 68,
  timeMinutes: 9.5,
  shootingIso: 400,
  pushPull: 0,
  isCustomFilm: false,
  isCustomDeveloper: false,
  dateCreated: '2024-01-01T00:00:00.000Z',
  dateModified: '2024-01-01T00:00:00.000Z',
  isPublic: false,
  ...overrides,
});

type SharedRecipe = Omit<CustomRecipe, 'id' | 'dateCreated' | 'dateModified'>;

const createShared = (overrides: Partial<SharedRecipe> = {}): SharedRecipe => ({
  name: 'Shared Recipe',
  filmId: 'film-uuid-1',
  developerId: 'dev-uuid-1',
  temperatureF: 68,
  timeMinutes: 9.5,
  shootingIso: 400,
  pushPull: 0,
  isCustomFilm: false,
  isCustomDeveloper: false,
  isPublic: false,
  ...overrides,
});

// Regression for #323: a recipe saved before range validation existed used to
// throw during render and crash /development on every load.
describe('recipe views with invalid stored recipes', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('skips out-of-range stored recipes and still renders valid ones', () => {
    const valid = createRecipe();
    const invalid = createRecipe({
      id: 'custom-invalid',
      name: 'Too Hot',
      temperatureF: 250,
    });

    const { result } = renderHook(() =>
      useCustomCombinationViews([invalid, valid], noFilm, noDeveloper)
    );

    expect(result.current.map((view) => view.combination.uuid)).toEqual([
      'custom-valid',
    ]);

    const { result: byUuid } = renderHook(() =>
      useRecipesByUuid([], [invalid, valid])
    );
    expect(byUuid.current.has('custom-valid')).toBe(true);
    expect(byUuid.current.has('custom-invalid')).toBe(false);
  });

  it('returns no shared view for an out-of-range shared recipe', () => {
    const shared = createShared({ pushPull: 9 });

    const { result } = renderHook(() =>
      useSharedCustomRecipeView(shared, noFilm, noDeveloper)
    );

    expect(result.current).toBeNull();
  });

  it('builds a shared view for a valid shared recipe', () => {
    const shared = createShared();

    const { result } = renderHook(() =>
      useSharedCustomRecipeView(shared, noFilm, noDeveloper)
    );

    expect(result.current?.combination.uuid).toBe('shared-custom');
  });
});
