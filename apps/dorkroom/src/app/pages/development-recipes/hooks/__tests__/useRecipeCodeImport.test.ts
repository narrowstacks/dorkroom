import {
  createCustomRecipeFromEncoded,
  type EncodedCustomRecipe,
  type ImportedCustomRecipe,
} from '@dorkroom/logic';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useRecipeCodeImport,
  type UseRecipeCodeImportProps,
} from '../useRecipeCodeImport';

const baseRecipe: EncodedCustomRecipe = {
  name: 'x',
  filmId: 'a',
  developerId: 'b',
  temperatureF: 68,
  timeMinutes: 8,
  shootingIso: 400,
  pushPull: 0,
  isCustomFilm: false,
  isCustomDeveloper: false,
  isPublic: false,
};

/**
 * What the real decoder hands back for a valid code. The hook is given the
 * decoder as a prop, so these tests stub it: decoding and its range checks are
 * covered where they live, in `packages/logic`'s recipe-sharing tests.
 */
const decoded: ImportedCustomRecipe = {
  recipe: createCustomRecipeFromEncoded(baseRecipe),
  encodedData: 'code',
  isValid: true,
};

const createProps = (
  overrides: Partial<UseRecipeCodeImportProps> = {}
): UseRecipeCodeImportProps => ({
  addCustomRecipe: vi.fn().mockResolvedValue('new-id'),
  refreshCustomRecipes: vi.fn().mockResolvedValue([]),
  decodeSharedCustomRecipe: () => decoded,
  getFilmById: () => undefined,
  getDeveloperById: () => undefined,
  setIsImportModalOpen: vi.fn(),
  setIsImporting: vi.fn(),
  setImportError: vi.fn(),
  ...overrides,
});

describe('useRecipeCodeImport', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  // Regression for #323: a code the decoder rejects (an out-of-range one, for
  // instance) used to be saved to localStorage and crash /development on every
  // later visit. Whatever the reason the decoder returns null, nothing saves.
  it('reports a code the decoder rejects without saving it', async () => {
    const props = createProps({ decodeSharedCustomRecipe: () => null });
    const { result } = renderHook(() => useRecipeCodeImport(props));

    await act(async () => {
      await result.current.handleCodeImport('rejected-code');
    });

    expect(props.addCustomRecipe).not.toHaveBeenCalled();
    expect(props.setIsImportModalOpen).not.toHaveBeenCalled();
    expect(props.setImportError).toHaveBeenLastCalledWith(
      expect.stringContaining('Unable to decode this recipe')
    );
  });

  it('surfaces a validation error from the save as the import error', async () => {
    const props = createProps({
      addCustomRecipe: vi
        .fn()
        .mockRejectedValue(new Error('Time must be positive')),
    });
    const { result } = renderHook(() => useRecipeCodeImport(props));

    await act(async () => {
      await result.current.handleCodeImport('code');
    });

    expect(props.setImportError).toHaveBeenLastCalledWith(
      'Time must be positive'
    );
    expect(props.setIsImportModalOpen).not.toHaveBeenCalled();
  });

  it('imports a valid recipe code', async () => {
    const props = createProps();
    const { result } = renderHook(() => useRecipeCodeImport(props));

    await act(async () => {
      await result.current.handleCodeImport('code');
    });

    expect(props.addCustomRecipe).toHaveBeenCalledWith(
      expect.objectContaining({ temperatureF: 68, timeMinutes: 8 })
    );
    expect(props.setIsImportModalOpen).toHaveBeenCalledWith(false);
  });
});
