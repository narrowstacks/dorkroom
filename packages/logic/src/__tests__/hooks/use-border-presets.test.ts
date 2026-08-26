import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BORDER_CALCULATOR_DEFAULTS } from '../../constants/border-calculator-defaults';
import { useBorderPresets } from '../../hooks/use-border-presets';
import type { PersistedValue } from '../../hooks/use-local-storage-form-persistence';
import type {
  BorderPreset,
  BorderPresetSettings,
} from '../../types/border-calculator';

/** A preset as saved before the two newest settings fields existed. */
type LegacyStoredPreset = Omit<BorderPreset, 'settings'> & {
  settings: Omit<
    BorderPresetSettings,
    'showBladeReadings' | 'hasManuallyFlippedPaper'
  >;
};

type StoredEntry =
  | Record<string, PersistedValue>
  | BorderPreset
  | LegacyStoredPreset;

const STORAGE_KEY = 'borderPresets';

const validPreset: BorderPreset = {
  id: 'user-1',
  name: 'Portrait Setup',
  settings: {
    aspectRatio: '3:2',
    paperSize: '8x10',
    customAspectWidth: 0,
    customAspectHeight: 0,
    customPaperWidth: 0,
    customPaperHeight: 0,
    minBorder: 0.5,
    enableOffset: false,
    ignoreMinBorder: false,
    horizontalOffset: 0,
    verticalOffset: 0,
    showBlades: false,
    showBladeReadings: false,
    isLandscape: true,
    isRatioFlipped: false,
    hasManuallyFlippedPaper: false,
  },
};

describe('useBorderPresets hydration (issue #239)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  const seed = (payload: StoredEntry | readonly StoredEntry[]) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  };

  it('hydrates a valid stored preset list unchanged', () => {
    seed([validPreset]);

    const { result } = renderHook(() => useBorderPresets());

    expect(result.current.presets).toEqual([validPreset]);
  });

  it('ignores a payload that is not an array', () => {
    seed({ evil: true });

    const { result } = renderHook(() => useBorderPresets());

    expect(result.current.presets).toEqual([]);
  });

  it('ignores tampered JSON', () => {
    const warnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    window.localStorage.setItem(STORAGE_KEY, 'not-valid-json{');

    const { result } = renderHook(() => useBorderPresets());

    expect(result.current.presets).toEqual([]);
    warnSpy.mockRestore();
  });

  it('drops a preset without a settings object', () => {
    seed([{ id: 'user-2', name: 'No settings' }, validPreset]);

    const { result } = renderHook(() => useBorderPresets());

    expect(result.current.presets).toEqual([validPreset]);
  });

  it('keeps a preset saved before the newest settings fields existed', () => {
    // `borderPresets` storage predates both of these fields, so a preset from
    // that era omits them and must survive with the form's defaults.
    const {
      showBladeReadings: _showBladeReadings,
      hasManuallyFlippedPaper: _hasManuallyFlippedPaper,
      ...legacySettings
    } = validPreset.settings;
    seed([{ id: 'user-legacy', name: 'From 2025', settings: legacySettings }]);

    const { result } = renderHook(() => useBorderPresets());

    expect(result.current.presets).toEqual([
      {
        id: 'user-legacy',
        name: 'From 2025',
        settings: {
          ...validPreset.settings,
          showBladeReadings: BORDER_CALCULATOR_DEFAULTS.showBladeReadings,
          hasManuallyFlippedPaper: false,
        },
      },
    ]);
  });

  it('drops a preset whose settings are out of bounds', () => {
    const tampered = {
      ...validPreset,
      id: 'user-3',
      settings: { ...validPreset.settings, minBorder: -5 },
    };
    seed([tampered, validPreset]);

    const { result } = renderHook(() => useBorderPresets());

    expect(result.current.presets).toEqual([validPreset]);
  });

  it('drops a preset whose settings have wrong types', () => {
    const tampered = {
      ...validPreset,
      id: 'user-4',
      settings: { ...validPreset.settings, showBlades: 'yes' },
    };
    seed([tampered]);

    const { result } = renderHook(() => useBorderPresets());

    expect(result.current.presets).toEqual([]);
  });

  it('round-trips presets added through the hook', () => {
    const { result } = renderHook(() => useBorderPresets());

    act(() => {
      result.current.addPreset(validPreset);
    });

    const { result: rehydrated } = renderHook(() => useBorderPresets());
    expect(rehydrated.current.presets).toEqual([validPreset]);
  });
});
