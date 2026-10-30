import { afterEach, describe, expect, it, vi } from 'vitest';
import { CUSTOM_RECIPES_STORAGE_KEY } from '../../constants/storage-keys';
import {
  createCustomRecipeStore,
  createLocalStorageRecipeAdapter,
  createMemoryRecipeAdapter,
  type CustomRecipeStorageAdapter,
} from '../../services/custom-recipe-store';
import type {
  CustomRecipe,
  CustomRecipeFormData,
} from '../../types/custom-recipes';

const baseFormData: CustomRecipeFormData = {
  name: 'Test Recipe',
  useExistingFilm: true,
  selectedFilmId: 'film-1',
  customFilm: undefined,
  useExistingDeveloper: true,
  selectedDeveloperId: 'dev-1',
  customDeveloper: undefined,
  temperatureF: 68,
  timeMinutes: 9.5,
  shootingIso: 400,
  pushPull: 0,
  agitationSchedule: '30s every minute',
  notes: 'notes',
  customDilution: '',
  isPublic: false,
  tags: ['bw'],
  isFavorite: false,
};

const createStoredRecipe = (
  overrides: Partial<CustomRecipe> = {}
): CustomRecipe => ({
  id: 'custom_recipe',
  name: 'Stored Recipe',
  filmId: 'film-1',
  developerId: 'dev-1',
  temperatureF: 68,
  timeMinutes: 8,
  shootingIso: 400,
  pushPull: 0,
  agitationSchedule: '30s every minute',
  notes: '',
  customDilution: '',
  isCustomFilm: false,
  isCustomDeveloper: false,
  dateCreated: new Date(2023, 0, 1).toISOString(),
  dateModified: new Date(2023, 0, 1).toISOString(),
  isPublic: false,
  tags: ['bw'],
  ...overrides,
});

const rawStored = () => window.localStorage.getItem(CUSTOM_RECIPES_STORAGE_KEY);

/** What the app would load, through the validating adapter. */
const storedRecipes = (): CustomRecipe[] =>
  createLocalStorageRecipeAdapter().read();

const memoryStore = (initial: CustomRecipe[] = []) =>
  createCustomRecipeStore(createMemoryRecipeAdapter(initial));

const localStore = () =>
  createCustomRecipeStore(createLocalStorageRecipeAdapter());

afterEach(() => {
  window.localStorage.clear();
});

describe('memory adapter', () => {
  it('reads back what was written, without sharing the array', () => {
    const initial = [createStoredRecipe()];
    const adapter = createMemoryRecipeAdapter(initial);
    expect(adapter.read()).toEqual(initial);

    const next = [createStoredRecipe({ id: 'two' })];
    adapter.write(next);
    next.push(createStoredRecipe({ id: 'three' }));
    expect(adapter.read().map((r) => r.id)).toEqual(['two']);
  });
});

describe('localStorage adapter', () => {
  it('uses the existing storage key and entity shape', () => {
    const recipe = createStoredRecipe();
    createLocalStorageRecipeAdapter().write([recipe]);
    expect(CUSTOM_RECIPES_STORAGE_KEY).toBe('dorkroom_custom_recipes');
    expect(rawStored()).toBe(JSON.stringify([recipe]));
  });

  it('reads recipes stored by earlier versions', () => {
    const recipe = createStoredRecipe({ dilutionId: '3' });
    window.localStorage.setItem(
      CUSTOM_RECIPES_STORAGE_KEY,
      JSON.stringify([recipe])
    );
    expect(createLocalStorageRecipeAdapter().read()).toEqual([recipe]);
  });

  it.each([
    ['malformed JSON', '{not json'],
    ['a non-array value', JSON.stringify({ id: 'x' })],
  ])('reads %s as an empty list', (_label, raw) => {
    window.localStorage.setItem(CUSTOM_RECIPES_STORAGE_KEY, raw);
    expect(createLocalStorageRecipeAdapter().read()).toEqual([]);
    expect(localStore().read()).toEqual([]);
  });

  it('reports storage events for its key only', () => {
    const onChange = vi.fn();
    const unsubscribe =
      createLocalStorageRecipeAdapter().subscribe?.(onChange) ?? (() => {});

    window.dispatchEvent(new StorageEvent('storage', { key: 'other_key' }));
    // localStorage.clear() in another tab arrives with key === null.
    window.dispatchEvent(new StorageEvent('storage', { key: null }));
    expect(onChange).not.toHaveBeenCalled();

    window.dispatchEvent(
      new StorageEvent('storage', { key: CUSTOM_RECIPES_STORAGE_KEY })
    );
    expect(onChange).toHaveBeenCalledTimes(1);

    unsubscribe();
    window.dispatchEvent(
      new StorageEvent('storage', { key: CUSTOM_RECIPES_STORAGE_KEY })
    );
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('subscribes as a no-op where window has no addEventListener (React Native)', () => {
    const realWindow = globalThis.window;
    // React Native defines a global `window` that is not a DOM event target.
    vi.stubGlobal('window', { localStorage: realWindow.localStorage });
    try {
      const onChange = vi.fn();
      const adapter = createLocalStorageRecipeAdapter();
      let unsubscribe: (() => void) | undefined;
      expect(() => {
        unsubscribe = adapter.subscribe?.(onChange);
      }).not.toThrow();
      expect(() => unsubscribe?.()).not.toThrow();

      const store = createCustomRecipeStore(adapter);
      expect(() => store.subscribe(() => {})()).not.toThrow();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('customRecipeStore', () => {
  it('returns a stable snapshot until something changes', () => {
    const store = memoryStore([createStoredRecipe()]);
    const first = store.read();
    expect(store.read()).toBe(first);

    store.add(baseFormData);
    expect(store.read()).not.toBe(first);
    expect(store.read()).toHaveLength(2);
  });

  it('adds a sanitized recipe and persists it', () => {
    const store = localStore();
    const saved = store.add({
      ...baseFormData,
      name: '<script>alert(1)</script>Rodinal',
    });

    expect(saved.id).toMatch(/^custom_/);
    expect(saved.name).not.toContain('<script>');
    expect(store.read()).toEqual([saved]);
    expect(storedRecipes()).toEqual([saved]);
  });

  it('updates a recipe in place, keeping id and dateCreated', () => {
    const existing = createStoredRecipe();
    const store = memoryStore([existing, createStoredRecipe({ id: 'other' })]);

    const saved = store.update(existing.id, {
      ...baseFormData,
      name: 'Updated Recipe',
    });

    expect(saved.id).toBe(existing.id);
    expect(saved.dateCreated).toBe(existing.dateCreated);
    expect(store.read().map((r) => r.name)).toEqual([
      'Updated Recipe',
      'Stored Recipe',
    ]);
  });

  it('throws when updating a missing recipe', () => {
    const store = memoryStore();
    expect(() => store.update('nope', baseFormData)).toThrow(
      'Recipe with id nope not found'
    );
  });

  it('removes a recipe', () => {
    const store = localStore();
    const saved = store.add(baseFormData);
    store.remove(saved.id);
    expect(store.read()).toEqual([]);
    expect(storedRecipes()).toEqual([]);
  });

  // Regression for #323: an out-of-range recipe used to be persisted and then
  // crash /development on every load.
  it('rejects out-of-range values on add without persisting', () => {
    const store = localStore();
    expect(() => store.add({ ...baseFormData, temperatureF: 250 })).toThrow(
      'Temperature must be at most 212°F'
    );
    expect(store.read()).toEqual([]);
    expect(rawStored()).toBeNull();
  });

  it('rejects out-of-range values on update without persisting', () => {
    const existing = createStoredRecipe();
    const store = memoryStore([existing]);
    expect(() =>
      store.update(existing.id, { ...baseFormData, pushPull: 9 })
    ).toThrow('Push/pull must be at most +5 stops');
    expect(store.read()).toEqual([existing]);
  });

  it('builds writes on storage, not a stale snapshot', () => {
    const store = localStore();
    expect(store.read()).toEqual([]);

    // Another tab writes without this store seeing an event.
    const fromOtherTab = createStoredRecipe({ id: 'other-tab' });
    window.localStorage.setItem(
      CUSTOM_RECIPES_STORAGE_KEY,
      JSON.stringify([fromOtherTab])
    );

    const saved = store.add(baseFormData);
    expect(store.read().map((r) => r.id)).toEqual(['other-tab', saved.id]);
  });

  it('notifies subscribers on each write until they unsubscribe', () => {
    const store = memoryStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    const saved = store.add(baseFormData);
    store.update(saved.id, { ...baseFormData, name: 'Renamed' });
    store.remove(saved.id);
    expect(listener).toHaveBeenCalledTimes(3);

    unsubscribe();
    store.add(baseFormData);
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it('does not notify when a write throws', () => {
    const store = memoryStore();
    const listener = vi.fn();
    store.subscribe(listener);
    expect(() => store.add({ ...baseFormData, timeMinutes: -1 })).toThrow();
    expect(listener).not.toHaveBeenCalled();
  });

  it('re-reads storage and notifies on a storage event for its key', () => {
    const store = localStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    expect(store.read()).toEqual([]);

    const fromOtherTab = createStoredRecipe({ id: 'other-tab' });
    window.localStorage.setItem(
      CUSTOM_RECIPES_STORAGE_KEY,
      JSON.stringify([fromOtherTab])
    );
    window.dispatchEvent(
      new StorageEvent('storage', { key: CUSTOM_RECIPES_STORAGE_KEY })
    );

    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.read()).toEqual([fromOtherTab]);

    window.dispatchEvent(new StorageEvent('storage', { key: null }));
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('reads invalid data from another tab as an empty list', () => {
    const store = localStore();
    store.add(baseFormData);
    const unsubscribe = store.subscribe(() => {});

    window.localStorage.setItem(CUSTOM_RECIPES_STORAGE_KEY, '"garbage"');
    window.dispatchEvent(
      new StorageEvent('storage', { key: CUSTOM_RECIPES_STORAGE_KEY })
    );

    expect(store.read()).toEqual([]);
    unsubscribe();
  });

  it('reads fresh after the last subscriber leaves', () => {
    const store = localStore();
    const unsubscribe = store.subscribe(() => {});
    expect(store.read()).toEqual([]);
    unsubscribe();

    // No listener is attached now, so this change produces no event.
    const later = createStoredRecipe({ id: 'later' });
    window.localStorage.setItem(
      CUSTOM_RECIPES_STORAGE_KEY,
      JSON.stringify([later])
    );
    expect(store.read()).toEqual([later]);
  });

  it('re-reads on first subscribe after a read outside React', () => {
    const store = localStore();
    expect(store.read()).toEqual([]);

    const fromOtherTab = createStoredRecipe({ id: 'other-tab' });
    window.localStorage.setItem(
      CUSTOM_RECIPES_STORAGE_KEY,
      JSON.stringify([fromOtherTab])
    );

    const unsubscribe = store.subscribe(() => {});
    expect(store.read()).toEqual([fromOtherTab]);
    unsubscribe();
  });

  it('keeps the cached array on first subscribe when nothing changed', () => {
    const store = localStore();
    store.add(baseFormData);
    const before = store.read();
    const unsubscribe = store.subscribe(() => {});
    expect(store.read()).toBe(before);
    unsubscribe();
  });

  describe('when storage silently drops writes', () => {
    const existing = createStoredRecipe();
    const droppingAdapter = (): CustomRecipeStorageAdapter => ({
      read: () => [existing],
      write: () => {},
    });

    it('throws on add instead of returning an unsaved recipe', () => {
      const store = createCustomRecipeStore(droppingAdapter());
      const listener = vi.fn();
      store.subscribe(listener);
      expect(() => store.add(baseFormData)).toThrow(
        /Could not save custom recipes/
      );
      expect(store.read()).toEqual([existing]);
    });

    it('throws on update', () => {
      const store = createCustomRecipeStore(droppingAdapter());
      expect(() =>
        store.update(existing.id, { ...baseFormData, name: 'Renamed' })
      ).toThrow(/Could not save custom recipes/);
      expect(store.read()[0].name).toBe('Stored Recipe');
    });

    it('throws on remove', () => {
      const store = createCustomRecipeStore(droppingAdapter());
      expect(() => store.remove(existing.id)).toThrow(
        /Could not save custom recipes/
      );
      expect(store.read()).toEqual([existing]);
    });
  });

  it('returns the entry as storage holds it', () => {
    const store = localStore();
    const saved = store.add(baseFormData);
    expect(saved).toBe(store.read()[0]);
  });
});

describe('custom recipe dilution persistence (#322)', () => {
  const addRecipe = (formData: CustomRecipeFormData) =>
    localStore().add(formData);

  const updateRecipe = (
    existing: CustomRecipe,
    formData: CustomRecipeFormData
  ) => {
    createLocalStorageRecipeAdapter().write([existing]);
    return localStore().update(existing.id, formData);
  };

  it('persists a dilution picked from the dropdown', () => {
    const saved = addRecipe({
      ...baseFormData,
      selectedDilutionId: '69affee4-6a3f-44d2-8ec3-1dc83eca7449',
      customDilution: '1+1',
    });

    expect(saved.dilutionId).toBe('69affee4-6a3f-44d2-8ec3-1dc83eca7449');
    // A stale free-text dilution would win over the id in every display.
    expect(saved.customDilution).toBe('');

    const [persisted] = storedRecipes();
    expect(persisted.dilutionId).toBe('69affee4-6a3f-44d2-8ec3-1dc83eca7449');
    expect(persisted.customDilution).toBe('');
  });

  it("keeps the free-text dilution for the 'custom' option", () => {
    const saved = addRecipe({
      ...baseFormData,
      selectedDilutionId: 'custom',
      customDilution: '1+31',
    });

    expect(saved.dilutionId).toBeUndefined();
    expect(saved.customDilution).toBe('1+31');
  });

  it('keeps the free-text dilution when nothing is selected', () => {
    const saved = addRecipe({
      ...baseFormData,
      selectedDilutionId: '',
      customDilution: '1+31',
    });

    expect(saved.dilutionId).toBeUndefined();
    expect(saved.customDilution).toBe('1+31');
  });

  it('ignores a dropdown id when the developer is custom', () => {
    const saved = addRecipe({
      ...baseFormData,
      useExistingDeveloper: false,
      selectedDeveloperId: '',
      customDeveloper: {
        manufacturer: 'Home',
        name: 'Brew',
        type: 'liquid',
        filmOrPaper: 'film',
        dilutions: [{ name: 'Stock', dilution: 'Stock' }],
      },
      selectedDilutionId: '2',
      customDilution: '1+4',
    });

    expect(saved.dilutionId).toBeUndefined();
    expect(saved.customDilution).toBe('1+4');
  });

  it('replaces a stored dilution id with the newly picked one on edit', () => {
    const saved = updateRecipe(createStoredRecipe({ dilutionId: '1' }), {
      ...baseFormData,
      selectedDilutionId: '2',
    });

    expect(saved.dilutionId).toBe('2');
    expect(storedRecipes()[0].dilutionId).toBe('2');
  });

  it('drops the stored dilution id when edited to a custom dilution', () => {
    const saved = updateRecipe(createStoredRecipe({ dilutionId: '1' }), {
      ...baseFormData,
      selectedDilutionId: 'custom',
      customDilution: '1+100',
    });

    expect(saved.dilutionId).toBeUndefined();
    expect(saved.customDilution).toBe('1+100');
  });
});
