import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BORDER_CALCULATOR_STORAGE_KEY } from '../../../constants/storage-keys';
import { PersistenceStorageProvider } from '../../../hooks/use-persisted-calculator';
import { persistedBorderCalculatorFieldSchemas } from '../../../schemas/border-calculator-persistence';
import { createMemoryStorage } from '../../../services/key-value-storage';
import type { BorderCalculatorState } from '../../../types/border-calculator';
import type { PersistedValue } from '../../../utils/persisted-calculator';
import { useBorderCalculatorState } from '../use-border-calculator-state';

/**
 * Comprehensive test suite for the useBorderCalculatorState hook.
 * Tests the advanced stateful hook with localStorage persistence, focusing on:
 * - Reducer action dispatching and state transitions
 * - localStorage persistence and restoration
 * - State immutability and proper updates
 * - Debounced persistence behavior
 * - All reducer action types
 */
describe('useBorderCalculatorState', () => {
  // Mock localStorage
  const localStorageMock = (() => {
    let store: Record<string, string> = {};

    return {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        store = {};
      }),
      get length() {
        return Object.keys(store).length;
      },
      key: vi.fn((index: number) => Object.keys(store)[index] || null),
    };
  })();

  beforeEach(() => {
    // Set up localStorage mock
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('Initialization and Default State', () => {
    it('should initialize with default state values', () => {
      const { result } = renderHook(() => useBorderCalculatorState());

      expect(result.current.state.aspectRatio).toBe('3:2');
      expect(result.current.state.paperSize).toBe('8x10');
      expect(result.current.state.minBorder).toBe(0.5);
      expect(result.current.state.enableOffset).toBe(false);
      expect(result.current.state.horizontalOffset).toBe(0);
      expect(result.current.state.verticalOffset).toBe(0);
      expect(result.current.state.showBlades).toBe(true);
      expect(result.current.state.isLandscape).toBe(true);
      expect(result.current.state.isRatioFlipped).toBe(false);
      expect(result.current.state.hasManuallyFlippedPaper).toBe(false);
    });

    it('should initialize custom dimension defaults', () => {
      const { result } = renderHook(() => useBorderCalculatorState());

      expect(result.current.state.customAspectWidth).toBe(2);
      expect(result.current.state.customAspectHeight).toBe(3);
      expect(result.current.state.customPaperWidth).toBe(10);
      expect(result.current.state.customPaperHeight).toBe(13);
    });
  });

  describe('SET_PAPER_SIZE Action', () => {
    it('clamps minBorder to the smaller sheet (16x20 at 5 -> 5x7 gives 2.375)', () => {
      const { result } = renderHook(() => useBorderCalculatorState());

      act(() => {
        result.current.dispatch({ type: 'SET_PAPER_SIZE', value: '16x20' });
        result.current.dispatch({
          type: 'BATCH_UPDATE',
          payload: { minBorder: 5, lastValidMinBorder: 5 },
        });
      });
      expect(result.current.state.minBorder).toBe(5);

      act(() => {
        result.current.dispatch({ type: 'SET_PAPER_SIZE', value: '5x7' });
      });

      expect(result.current.state.minBorder).toBe(2.375);
      expect(result.current.state.lastValidMinBorder).toBe(2.375);
    });

    it('leaves a minBorder that already fits, and does not clamp custom', () => {
      const { result } = renderHook(() => useBorderCalculatorState());

      act(() => {
        result.current.dispatch({ type: 'SET_PAPER_SIZE', value: '5x7' });
      });
      expect(result.current.state.minBorder).toBe(0.5);

      act(() => {
        result.current.dispatch({
          type: 'BATCH_UPDATE',
          payload: { minBorder: 5, lastValidMinBorder: 5 },
        });
        result.current.dispatch({ type: 'SET_PAPER_SIZE', value: 'custom' });
      });
      expect(result.current.state.minBorder).toBe(5);
    });
  });

  describe('SET_FIELD Action', () => {
    it('should update a single field via SET_FIELD', () => {
      const { result } = renderHook(() => useBorderCalculatorState());

      act(() => {
        result.current.dispatch({
          type: 'SET_FIELD',
          key: 'minBorder',
          value: 1.5,
        });
      });

      expect(result.current.state.minBorder).toBe(1.5);
    });

    it('should update multiple fields independently', () => {
      const { result } = renderHook(() => useBorderCalculatorState());

      act(() => {
        result.current.dispatch({
          type: 'SET_FIELD',
          key: 'minBorder',
          value: 2.0,
        });
      });

      act(() => {
        result.current.dispatch({
          type: 'SET_FIELD',
          key: 'horizontalOffset',
          value: 0.75,
        });
      });

      expect(result.current.state.minBorder).toBe(2.0);
      expect(result.current.state.horizontalOffset).toBe(0.75);
    });

    it('should update boolean fields correctly', () => {
      const { result } = renderHook(() => useBorderCalculatorState());

      act(() => {
        result.current.dispatch({
          type: 'SET_FIELD',
          key: 'enableOffset',
          value: true,
        });
      });

      expect(result.current.state.enableOffset).toBe(true);

      act(() => {
        result.current.dispatch({
          type: 'SET_FIELD',
          key: 'showBlades',
          value: false,
        });
      });

      expect(result.current.state.showBlades).toBe(false);
    });

    it('should maintain immutability when updating fields', () => {
      const { result } = renderHook(() => useBorderCalculatorState());
      const originalState = result.current.state;

      act(() => {
        result.current.dispatch({
          type: 'SET_FIELD',
          key: 'minBorder',
          value: 3.0,
        });
      });

      // Original state should not be mutated
      expect(originalState.minBorder).toBe(0.5);
      expect(result.current.state.minBorder).toBe(3.0);
      expect(result.current.state).not.toBe(originalState);
    });
  });

  describe('SET_PAPER_SIZE Action', () => {
    it('should update paper size and reset orientation flags', () => {
      const { result } = renderHook(() => useBorderCalculatorState());

      // First set some orientation flags
      act(() => {
        result.current.dispatch({
          type: 'SET_FIELD',
          key: 'isRatioFlipped',
          value: true,
        });
        result.current.dispatch({
          type: 'SET_FIELD',
          key: 'hasManuallyFlippedPaper',
          value: true,
        });
      });

      // Then set paper size
      act(() => {
        result.current.dispatch({
          type: 'SET_PAPER_SIZE',
          value: '11x14',
        });
      });

      expect(result.current.state.paperSize).toBe('11x14');
      expect(result.current.state.isLandscape).toBe(true); // reset to true for non-custom
      expect(result.current.state.isRatioFlipped).toBe(false); // reset
      expect(result.current.state.hasManuallyFlippedPaper).toBe(false); // reset
    });

    it('should set isLandscape to false for custom paper size', () => {
      const { result } = renderHook(() => useBorderCalculatorState());

      act(() => {
        result.current.dispatch({
          type: 'SET_PAPER_SIZE',
          value: 'custom',
        });
      });

      expect(result.current.state.paperSize).toBe('custom');
      expect(result.current.state.isLandscape).toBe(false);
    });
  });

  describe('SET_ASPECT_RATIO Action', () => {
    it('should update aspect ratio and reset isRatioFlipped', () => {
      const { result } = renderHook(() => useBorderCalculatorState());

      // First flip the ratio
      act(() => {
        result.current.dispatch({
          type: 'SET_FIELD',
          key: 'isRatioFlipped',
          value: true,
        });
      });

      // Then change aspect ratio
      act(() => {
        result.current.dispatch({
          type: 'SET_ASPECT_RATIO',
          value: '4:3',
        });
      });

      expect(result.current.state.aspectRatio).toBe('4:3');
      expect(result.current.state.isRatioFlipped).toBe(false);
    });
  });

  describe('RESET Action', () => {
    it('should reset all state to initial values', () => {
      const { result } = renderHook(() => useBorderCalculatorState());

      // Modify multiple fields
      act(() => {
        result.current.dispatch({
          type: 'SET_FIELD',
          key: 'minBorder',
          value: 3.0,
        });
        result.current.dispatch({
          type: 'SET_PAPER_SIZE',
          value: '20x24',
        });
        result.current.dispatch({
          type: 'SET_ASPECT_RATIO',
          value: '1:1',
        });
        result.current.dispatch({
          type: 'SET_FIELD',
          key: 'enableOffset',
          value: true,
        });
        result.current.dispatch({
          type: 'SET_FIELD',
          key: 'horizontalOffset',
          value: 2.5,
        });
      });

      // Reset
      act(() => {
        result.current.dispatch({ type: 'RESET' });
      });

      // Should be back to defaults
      expect(result.current.state.aspectRatio).toBe('3:2');
      expect(result.current.state.paperSize).toBe('8x10');
      expect(result.current.state.minBorder).toBe(0.5);
      expect(result.current.state.enableOffset).toBe(false);
      expect(result.current.state.horizontalOffset).toBe(0);
    });
  });

  describe('lastValidMinBorder', () => {
    it('is an ordinary field set through SET_FIELD', () => {
      const { result } = renderHook(() => useBorderCalculatorState());

      act(() => {
        result.current.dispatch({
          type: 'SET_FIELD',
          key: 'lastValidMinBorder',
          value: 1.25,
        });
      });

      expect(result.current.state.lastValidMinBorder).toBe(1.25);
    });
  });

  describe('BATCH_UPDATE Action', () => {
    it('should update multiple fields at once', () => {
      const { result } = renderHook(() => useBorderCalculatorState());

      act(() => {
        result.current.dispatch({
          type: 'BATCH_UPDATE',
          payload: {
            aspectRatio: '4:3',
            paperSize: '11x14',
            minBorder: 2.0,
            enableOffset: true,
            horizontalOffset: 0.5,
            isLandscape: true,
          },
        });
      });

      expect(result.current.state.aspectRatio).toBe('4:3');
      expect(result.current.state.paperSize).toBe('11x14');
      expect(result.current.state.minBorder).toBe(2.0);
      expect(result.current.state.enableOffset).toBe(true);
      expect(result.current.state.horizontalOffset).toBe(0.5);
      expect(result.current.state.isLandscape).toBe(true);
      // Fields the payload does not name keep their defaults
      expect(result.current.state.showBlades).toBe(true);
      expect(result.current.state.verticalOffset).toBe(0);
    });
  });

  describe('LocalStorage Persistence', () => {
    it('should persist state to localStorage after changes with debounce', async () => {
      const { result } = renderHook(() => useBorderCalculatorState());

      act(() => {
        result.current.dispatch({
          type: 'SET_FIELD',
          key: 'minBorder',
          value: 2.0,
        });
      });

      // Wait for debounce (500ms)
      await waitFor(
        () => {
          expect(localStorageMock.setItem).toHaveBeenCalled();
        },
        { timeout: 1000 }
      );

      const savedData = localStorageMock.setItem.mock.calls[0][1];
      const parsed = JSON.parse(savedData);
      expect(parsed.minBorder).toBe(2.0);
    });

    it('purges the superseded _v1 key and keeps _v2 on hydrate', () => {
      localStorageMock.setItem('borderCalculatorState_v1', '{"old":true}');
      const v2 = JSON.stringify({ aspectRatio: '16:9' });
      localStorageMock.setItem(BORDER_CALCULATOR_STORAGE_KEY, v2);

      renderHook(() => useBorderCalculatorState());

      expect(localStorageMock.getItem('borderCalculatorState_v1')).toBeNull();
      expect(localStorageMock.getItem(BORDER_CALCULATOR_STORAGE_KEY)).toBe(v2);
    });

    it('should handle corrupted localStorage data gracefully', () => {
      // Suppress expected console.warn from invalid JSON parse
      const warnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);

      // Set invalid JSON
      localStorageMock.setItem(
        BORDER_CALCULATOR_STORAGE_KEY,
        'not-valid-json{'
      );

      // Should not throw, should use defaults
      const { result } = renderHook(() => useBorderCalculatorState());

      expect(result.current.state.aspectRatio).toBe('3:2');
      expect(result.current.state.paperSize).toBe('8x10');

      warnSpy.mockRestore();
    });

    describe('debounced writes', () => {
      beforeEach(() => {
        vi.useFakeTimers();
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it('writes once, 500ms after the last of several rapid updates', () => {
        const { result } = renderHook(() => useBorderCalculatorState());

        // The hook also writes once shortly after mount; let that settle.
        act(() => {
          vi.advanceTimersByTime(500);
        });
        localStorageMock.setItem.mockClear();

        for (const value of [1.0, 1.5, 2.0]) {
          act(() => {
            result.current.dispatch({
              type: 'SET_FIELD',
              key: 'minBorder',
              value,
            });
          });
          act(() => {
            vi.advanceTimersByTime(200);
          });
        }

        // 200ms after the last update (and 600ms after the first): no write yet
        expect(localStorageMock.setItem).not.toHaveBeenCalled();

        act(() => {
          vi.advanceTimersByTime(299);
        });
        expect(localStorageMock.setItem).not.toHaveBeenCalled();

        act(() => {
          vi.advanceTimersByTime(1);
        });
        expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
        expect(
          JSON.parse(localStorageMock.setItem.mock.calls[0][1]).minBorder
        ).toBe(2.0);
      });
    });

    it('should persist all persistable fields', async () => {
      const { result } = renderHook(() => useBorderCalculatorState());

      act(() => {
        result.current.dispatch({
          type: 'BATCH_UPDATE',
          payload: {
            aspectRatio: '1:1',
            paperSize: '20x24',
            customAspectWidth: 5,
            customAspectHeight: 7,
            customPaperWidth: 15,
            customPaperHeight: 18,
            minBorder: 3.0,
            enableOffset: true,
            horizontalOffset: 1.5,
            verticalOffset: -0.5,
            showBlades: false,
            showBladeReadings: false,
            isLandscape: false,
            isRatioFlipped: true,
            hasManuallyFlippedPaper: true,
          },
        });
      });

      await waitFor(
        () => {
          expect(localStorageMock.setItem).toHaveBeenCalled();
        },
        { timeout: 1000 }
      );

      const savedData = localStorageMock.setItem.mock.calls[0][1];
      const parsed = JSON.parse(savedData);

      // Check all persistable fields
      expect(parsed.aspectRatio).toBe('1:1');
      expect(parsed.paperSize).toBe('20x24');
      expect(parsed.customAspectWidth).toBe(5);
      expect(parsed.customAspectHeight).toBe(7);
      expect(parsed.customPaperWidth).toBe(15);
      expect(parsed.customPaperHeight).toBe(18);
      expect(parsed.minBorder).toBe(3.0);
      expect(parsed.enableOffset).toBe(true);
      expect(parsed.horizontalOffset).toBe(1.5);
      expect(parsed.verticalOffset).toBe(-0.5);
      expect(parsed.showBlades).toBe(false);
      expect(parsed.isLandscape).toBe(false);
      expect(parsed.isRatioFlipped).toBe(true);
    });

    it('persists exactly the persisted field set, nothing derived', async () => {
      renderHook(() => useBorderCalculatorState());

      await waitFor(
        () => {
          expect(localStorageMock.setItem).toHaveBeenCalled();
        },
        { timeout: 1000 }
      );

      const savedData = localStorageMock.setItem.mock.calls[0][1];
      const parsed = JSON.parse(savedData);

      expect(Object.keys(parsed).sort()).toEqual(
        Object.keys(persistedBorderCalculatorFieldSchemas).sort()
      );
    });
  });

  describe('Hydration Validation (issue #239)', () => {
    const seed = (payload: Record<string, PersistedValue>) => {
      localStorageMock.setItem(
        BORDER_CALCULATOR_STORAGE_KEY,
        JSON.stringify(payload)
      );
    };

    const expectDefaults = (state: BorderCalculatorState) => {
      expect(state.minBorder).toBe(0.5);
      expect(state.horizontalOffset).toBe(0);
      expect(state.customAspectWidth).toBe(2);
      expect(state.lastValidCustomAspectWidth).toBe(2);
      expect(state.aspectRatio).toBe('3:2');
    };

    it('rejects a snapshot with an out-of-bounds minBorder', () => {
      seed({ minBorder: -1, aspectRatio: '16:9' });

      const { result } = renderHook(() => useBorderCalculatorState());

      // The whole snapshot is discarded, not just the bad field
      expectDefaults(result.current.state);
    });

    it('rejects a snapshot with an out-of-range offset', () => {
      seed({ horizontalOffset: 99, aspectRatio: '16:9' });

      const { result } = renderHook(() => useBorderCalculatorState());

      expectDefaults(result.current.state);
    });

    it('rejects a snapshot with a negative lastValidCustomAspectWidth', () => {
      seed({ lastValidCustomAspectWidth: -5, aspectRatio: '16:9' });

      const { result } = renderHook(() => useBorderCalculatorState());

      expectDefaults(result.current.state);
    });

    it('hydrates a snapshot that still carries fields the reducer dropped (#448)', () => {
      // Builds before #448 never persisted these, but a snapshot carrying
      // them must not be rejected whole: the schema strips unknown keys.
      seed({
        aspectRatio: '16:9',
        minBorder: 1.25,
        offsetWarning: 'Offset adjusted',
        cropScale: 1.5,
        selectedImageUri: 'file:///image.jpg',
      });

      const { result } = renderHook(() => useBorderCalculatorState());

      expect(result.current.state.aspectRatio).toBe('16:9');
      expect(result.current.state.minBorder).toBe(1.25);
      expect(result.current.state).not.toHaveProperty('offsetWarning');
      expect(result.current.state).not.toHaveProperty('cropScale');
      expect(result.current.state).not.toHaveProperty('selectedImageUri');
    });

    it('hydrates the zeroed lastValid dimensions the built-in preset writes', () => {
      // Applying DEFAULT_BORDER_PRESETS copies its zeroed custom dimensions
      // into the lastValid mirrors, so 0 has to survive a round trip.
      seed({
        lastValidCustomAspectWidth: 0,
        lastValidCustomAspectHeight: 0,
        lastValidCustomPaperWidth: 0,
        lastValidCustomPaperHeight: 0,
      });

      const { result } = renderHook(() => useBorderCalculatorState());

      expect(result.current.state.lastValidCustomAspectWidth).toBe(0);
      expect(result.current.state.lastValidCustomPaperHeight).toBe(0);
    });

    it('rejects a snapshot with an absurdly large dimension', () => {
      seed({ customPaperWidth: 100000 });

      const { result } = renderHook(() => useBorderCalculatorState());

      expectDefaults(result.current.state);
    });

    it('rejects a snapshot with wrong field types', () => {
      seed({ minBorder: '0.5', showBlades: 1 });

      const { result } = renderHook(() => useBorderCalculatorState());

      expectDefaults(result.current.state);
    });

    it('rejects a snapshot with an unknown enum value', () => {
      seed({ paperSize: '99x99' });

      const { result } = renderHook(() => useBorderCalculatorState());

      expectDefaults(result.current.state);
    });

    it('hydrates a valid full snapshot unchanged', () => {
      seed({
        aspectRatio: '16:9',
        paperSize: 'custom',
        customAspectWidth: 4,
        customAspectHeight: 3,
        customPaperWidth: 12,
        customPaperHeight: 16,
        minBorder: 1.25,
        enableOffset: true,
        ignoreMinBorder: false,
        horizontalOffset: -1.5,
        verticalOffset: 2,
        showBlades: true,
        showBladeReadings: true,
        isLandscape: false,
        isRatioFlipped: true,
        hasManuallyFlippedPaper: true,
        lastValidCustomAspectWidth: 4,
        lastValidCustomAspectHeight: 3,
        lastValidCustomPaperWidth: 12,
        lastValidCustomPaperHeight: 16,
        lastValidMinBorder: 1.25,
      });

      const { result } = renderHook(() => useBorderCalculatorState());

      expect(result.current.state.aspectRatio).toBe('16:9');
      expect(result.current.state.paperSize).toBe('custom');
      expect(result.current.state.minBorder).toBe(1.25);
      expect(result.current.state.horizontalOffset).toBe(-1.5);
      expect(result.current.state.lastValidCustomPaperHeight).toBe(16);
      expect(result.current.state.lastValidMinBorder).toBe(1.25);
    });

    it('still hydrates a partial snapshot with only valid keys', () => {
      seed({ minBorder: 2, verticalOffset: 3 });

      const { result } = renderHook(() => useBorderCalculatorState());

      expect(result.current.state.minBorder).toBe(2);
      expect(result.current.state.verticalOffset).toBe(3);
      expect(result.current.state.aspectRatio).toBe('3:2');
    });
  });

  describe('State Immutability', () => {
    it('should not mutate state when dispatching actions', () => {
      const { result } = renderHook(() => useBorderCalculatorState());
      const state1 = result.current.state;

      act(() => {
        result.current.dispatch({
          type: 'SET_FIELD',
          key: 'minBorder',
          value: 5.0,
        });
      });

      const state2 = result.current.state;

      // States should be different objects
      expect(state1).not.toBe(state2);
      // Original state should be unchanged
      expect(state1.minBorder).toBe(0.5);
      // New state should have update
      expect(state2.minBorder).toBe(5.0);
    });
  });

  describe('Real-World Usage Scenarios', () => {
    it('should handle complete workflow: load -> modify -> persist', async () => {
      // Initial saved state
      const initialState = {
        aspectRatio: '16:9' as const,
        paperSize: '11x14' as const,
        minBorder: 1.0,
      };
      localStorageMock.setItem(
        BORDER_CALCULATOR_STORAGE_KEY,
        JSON.stringify(initialState)
      );

      const { result } = renderHook(() => useBorderCalculatorState());

      // Wait for initial load from localStorage
      await waitFor(
        () => {
          expect(result.current.state.aspectRatio).toBe('16:9');
        },
        { timeout: 200 }
      );

      expect(result.current.state.paperSize).toBe('11x14');
      expect(result.current.state.minBorder).toBe(1.0);

      // Clear previous calls
      localStorageMock.setItem.mockClear();

      // Modify state
      act(() => {
        result.current.dispatch({
          type: 'SET_ASPECT_RATIO',
          value: '4:3',
        });
      });

      act(() => {
        result.current.dispatch({
          type: 'SET_FIELD',
          key: 'minBorder',
          value: 2.0,
        });
      });

      // State should update immediately
      expect(result.current.state.aspectRatio).toBe('4:3');
      expect(result.current.state.minBorder).toBe(2.0);

      // Wait for persistence (debounced 500ms)
      await waitFor(
        () => {
          expect(localStorageMock.setItem).toHaveBeenCalled();
        },
        { timeout: 1000 }
      );

      expect(localStorageMock.setItem.mock.calls.length).toBeGreaterThan(0);

      // Verify persisted data contains the updates
      const savedCalls = localStorageMock.setItem.mock.calls;
      expect(savedCalls.length).toBeGreaterThan(0);

      const lastSave = JSON.parse(savedCalls[savedCalls.length - 1][1]);
      expect(lastSave.aspectRatio).toBe('4:3');
      expect(lastSave.minBorder).toBe(2.0);
    });
  });

  describe('storage provider', () => {
    it('hydrates from and persists to the provided storage, not localStorage', async () => {
      const storage = createMemoryStorage({
        [BORDER_CALCULATOR_STORAGE_KEY]: JSON.stringify({
          aspectRatio: '16:9',
        }),
      });
      const wrapper = ({ children }: { children: ReactNode }) =>
        createElement(PersistenceStorageProvider, { value: storage }, children);

      const { result } = renderHook(() => useBorderCalculatorState(), {
        wrapper,
      });
      expect(result.current.state.aspectRatio).toBe('16:9');

      act(() => {
        result.current.dispatch({
          type: 'SET_FIELD',
          key: 'minBorder',
          value: 1.25,
        });
      });

      await waitFor(
        () => {
          expect(
            JSON.parse(storage.getItem(BORDER_CALCULATOR_STORAGE_KEY) ?? '{}')
              .minBorder
          ).toBe(1.25);
        },
        { timeout: 1000 }
      );
      expect(localStorageMock.getItem).not.toHaveBeenCalled();
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });
});
