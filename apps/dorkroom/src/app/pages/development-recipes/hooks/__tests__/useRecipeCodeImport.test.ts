import {
  createCustomRecipeFromEncoded,
  decodeCustomRecipe,
  type EncodedCustomRecipe,
  type ImportedCustomRecipe,
} from '@dorkroom/logic';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type UseRecipeCodeImportProps,
  useRecipeCodeImport,
} from '../useRecipeCodeImport';

const encode = (payload: EncodedCustomRecipe): string =>
  Buffer.from(JSON.stringify(payload), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

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

/** The real decode path, minus the React hook wrapper around it. */
const decodeSharedCustomRecipe = (
  input: string
): ImportedCustomRecipe | null => {
  const decoded = decodeCustomRecipe(input);
  return decoded
    ? {
        recipe: createCustomRecipeFromEncoded(decoded),
        encodedData: input,
        isValid: true,
      }
    : null;
};

const createProps = (
  overrides: Partial<UseRecipeCodeImportProps> = {}
): UseRecipeCodeImportProps => ({
  addCustomRecipe: vi.fn().mockResolvedValue('new-id'),
  refreshCustomRecipes: vi.fn().mockResolvedValue([]),
  decodeSharedCustomRecipe,
  getFilmById: () => undefined,
  getDeveloperById: () => undefined,
  setIsImportModalOpen: vi.fn(),
  setIsImporting: vi.fn(),
  setImportError: vi.fn(),
  ...overrides,
});

// Regression for #323: an out-of-range recipe code used to be saved to
// localStorage and crash /development on every later visit.
describe('useRecipeCodeImport', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('rejects an out-of-range recipe code without saving it', async () => {
    const props = createProps();
    const { result } = renderHook(() => useRecipeCodeImport(props));

    await act(async () => {
      await result.current.handleCodeImport(
        encode({ ...baseRecipe, temperatureF: 250 })
      );
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
      await result.current.handleCodeImport(encode(baseRecipe));
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
      await result.current.handleCodeImport(encode(baseRecipe));
    });

    expect(props.addCustomRecipe).toHaveBeenCalledWith(
      expect.objectContaining({ temperatureF: 68, timeMinutes: 8 })
    );
    expect(props.setIsImportModalOpen).toHaveBeenCalledWith(false);
  });
});
