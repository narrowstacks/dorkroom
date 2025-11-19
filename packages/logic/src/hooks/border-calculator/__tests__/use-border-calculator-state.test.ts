import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBorderCalculatorState } from '../use-border-calculator-state';
import { BORDER_CALCULATOR_STORAGE_KEY } from '../../../constants/storage-keys';
import type { BorderCalculatorState } from '../../../types/border-calculator';

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

    it('should initialize warning states to null', () => {
      const { result } = renderHook(() => useBorderCalculatorState());

      expect(result.current.state.offsetWarning).toBeNull();
      expect(result.current.state.bladeWarning).toBeNull();
      expect(result.current.state.minBorderWarning).toBeNull();
      expect(result.current.state.paperSizeWarning).toBeNull();
    });

    it('should initialize image-related fields', () => {
      const { result } = renderHook(() => useBorderCalculatorState());

      expect(result.current.state.selectedImageUri).toBeNull();
      expect(result.current.state.imageDimensions).toEqual({
        width: 0,
        height: 0,
      });
      expect(result.current.state.isCropping).toBe(false);
      expect(result.current.state.cropOffset).toEqual({ x: 0, y: 0 });
      expect(result.current.state.cropScale).toBe(1);
    });

    it('should provide dispatch function', () => {
      const { result } = renderHook(() => useBorderCalculatorState());

      expect(result.current.dispatch).toBeDefined();
      expect(typeof result.current.dispatch).toBe('function');
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

    it('should handle all preset paper sizes', () => {
      const { result } = renderHook(() => useBorderCalculatorState());
      const paperSizes: Array<
        '5x7' | '4x6' | '8x10' | '11x14' | '16x20' | '20x24'
      > = ['5x7', '4x6', '8x10', '11x14', '16x20', '20x24'];

      paperSizes.forEach((size) => {
        act(() => {
          result.current.dispatch({
            type: 'SET_PAPER_SIZE',
            value: size,
          });
        });

        expect(result.current.state.paperSize).toBe(size);
        expect(result.current.state.isLandscape).toBe(true);
      });
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

    it('should handle all preset aspect ratios', () => {
      const { result } = renderHook(() => useBorderCalculatorState());
      const aspectRatios: Array<
        | '3:2'
        | 'even-borders'
        | '65:24'
        | '4:3'
        | '1:1'
        | '7:6'
        | '5:4'
        | '7:5'
        | '16:9'
        | '1.37:1'
        | '1.85:1'
        | '2:1'
        | '2.39:1'
        | '2.76:1'
      > = [
        '3:2',
        'even-borders',
        '65:24',
        '4:3',
        '1:1',
        '7:6',
        '5:4',
        '7:5',
        '16:9',
        '1.37:1',
        '1.85:1',
        '2:1',
        '2.39:1',
        '2.76:1',
      ];

      aspectRatios.forEach((ratio) => {
        act(() => {
          result.current.dispatch({
            type: 'SET_ASPECT_RATIO',
            value: ratio,
          });
        });

        expect(result.current.state.aspectRatio).toBe(ratio);
      });
    });

    it('should handle custom aspect ratio', () => {
      const { result } = renderHook(() => useBorderCalculatorState());

      act(() => {
        result.current.dispatch({
          type: 'SET_ASPECT_RATIO',
          value: 'custom',
        });
      });

      expect(result.current.state.aspectRatio).toBe('custom');
    });
  });

  describe('SET_IMAGE_FIELD Action', () => {
    it('should update selectedImageUri field', () => {
      const { result } = renderHook(() => useBorderCalculatorState());

      act(() => {
        result.current.dispatch({
          type: 'SET_IMAGE_FIELD',
          key: 'selectedImageUri',
          value: 'file:///path/to/image.jpg',
        });
      });

      expect(result.current.state.selectedImageUri).toBe(
        'file:///path/to/image.jpg'
      );
    });

    it('should update isCropping field', () => {
      const { result } = renderHook(() => useBorderCalculatorState());

      act(() => {
        result.current.dispatch({
          type: 'SET_IMAGE_FIELD',
          key: 'isCropping',
          value: true,
        });
      });

      expect(result.current.state.isCropping).toBe(true);
    });

    it('should update cropScale field', () => {
      const { result } = renderHook(() => useBorderCalculatorState());

      act(() => {
        result.current.dispatch({
          type: 'SET_IMAGE_FIELD',
          key: 'cropScale',
          value: 1.5,
        });
      });

      expect(result.current.state.cropScale).toBe(1.5);
    });

    it('should clear selectedImageUri with null', () => {
      const { result } = renderHook(() => useBorderCalculatorState());

      // Set image first
      act(() => {
        result.current.dispatch({
          type: 'SET_IMAGE_FIELD',
          key: 'selectedImageUri',
          value: 'file:///path/to/image.jpg',
        });
      });

      // Clear it
      act(() => {
        result.current.dispatch({
          type: 'SET_IMAGE_FIELD',
          key: 'selectedImageUri',
          value: null,
        });
      });

      expect(result.current.state.selectedImageUri).toBeNull();
    });
  });

  describe('SET_IMAGE_DIMENSIONS Action', () => {
    it('should update image dimensions', () => {
      const { result } = renderHook(() => useBorderCalculatorState());

      act(() => {
        result.current.dispatch({
          type: 'SET_IMAGE_DIMENSIONS',
          value: { width: 1920, height: 1080 },
        });
      });

      expect(result.current.state.imageDimensions).toEqual({
        width: 1920,
        height: 1080,
      });
    });

    it('should handle different dimension values', () => {
      const { result } = renderHook(() => useBorderCalculatorState());

      const dimensions = [
        { width: 4032, height: 3024 },
        { width: 6000, height: 4000 },
        { width: 800, height: 600 },
      ];

      dimensions.forEach((dim) => {
        act(() => {
          result.current.dispatch({
            type: 'SET_IMAGE_DIMENSIONS',
            value: dim,
          });
        });

        expect(result.current.state.imageDimensions).toEqual(dim);
      });
    });
  });

  describe('SET_CROP_OFFSET Action', () => {
    it('should update crop offset', () => {
      const { result } = renderHook(() => useBorderCalculatorState());

      act(() => {
        result.current.dispatch({
          type: 'SET_CROP_OFFSET',
          value: { x: 100, y: 50 },
        });
      });

      expect(result.current.state.cropOffset).toEqual({ x: 100, y: 50 });
    });

    it('should handle negative offset values', () => {
      const { result } = renderHook(() => useBorderCalculatorState());

      act(() => {
        result.current.dispatch({
          type: 'SET_CROP_OFFSET',
          value: { x: -25, y: -10 },
        });
      });

      expect(result.current.state.cropOffset).toEqual({ x: -25, y: -10 });
    });
  });

  describe('SET_IMAGE_CROP_DATA Action', () => {
    it('should update multiple image crop fields at once', () => {
      const { result } = renderHook(() => useBorderCalculatorState());

      act(() => {
        result.current.dispatch({
          type: 'SET_IMAGE_CROP_DATA',
          payload: {
            selectedImageUri: 'file:///image.jpg',
            imageDimensions: { width: 2000, height: 1500 },
            isCropping: true,
            cropOffset: { x: 50, y: 75 },
            cropScale: 1.25,
          },
        });
      });

      expect(result.current.state.selectedImageUri).toBe('file:///image.jpg');
      expect(result.current.state.imageDimensions).toEqual({
        width: 2000,
        height: 1500,
      });
      expect(result.current.state.isCropping).toBe(true);
      expect(result.current.state.cropOffset).toEqual({ x: 50, y: 75 });
      expect(result.current.state.cropScale).toBe(1.25);
    });

    it('should partially update crop data fields', () => {
      const { result } = renderHook(() => useBorderCalculatorState());

      act(() => {
        result.current.dispatch({
          type: 'SET_IMAGE_CROP_DATA',
          payload: {
            cropScale: 2.0,
            isCropping: true,
          },
        });
      });

      expect(result.current.state.cropScale).toBe(2.0);
      expect(result.current.state.isCropping).toBe(true);
      // Other fields should remain at defaults
      expect(result.current.state.selectedImageUri).toBeNull();
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

    it('should reset image-related fields to initial state', () => {
      const { result } = renderHook(() => useBorderCalculatorState());

      // Set image data
      act(() => {
        result.current.dispatch({
          type: 'SET_IMAGE_CROP_DATA',
          payload: {
            selectedImageUri: 'file:///image.jpg',
            imageDimensions: { width: 1000, height: 800 },
            isCropping: true,
            cropScale: 1.5,
          },
        });
      });

      // Reset
      act(() => {
        result.current.dispatch({ type: 'RESET' });
      });

      expect(result.current.state.selectedImageUri).toBeNull();
      expect(result.current.state.imageDimensions).toEqual({
        width: 0,
        height: 0,
      });
      expect(result.current.state.isCropping).toBe(false);
      expect(result.current.state.cropScale).toBe(1);
    });
  });

  describe('INTERNAL_UPDATE Action', () => {
    it('should update warning fields via INTERNAL_UPDATE', () => {
      const { result } = renderHook(() => useBorderCalculatorState());

      act(() => {
        result.current.dispatch({
          type: 'INTERNAL_UPDATE',
          payload: {
            offsetWarning: 'Image extends beyond paper edges',
            bladeWarning: 'Blade positions too close to edge',
          },
        });
      });

      expect(result.current.state.offsetWarning).toBe(
        'Image extends beyond paper edges'
      );
      expect(result.current.state.bladeWarning).toBe(
        'Blade positions too close to edge'
      );
    });

    it('should update lastValidMinBorder field', () => {
      const { result } = renderHook(() => useBorderCalculatorState());

      act(() => {
        result.current.dispatch({
          type: 'INTERNAL_UPDATE',
          payload: {
            lastValidMinBorder: 1.25,
          },
        });
      });

      expect(result.current.state.lastValidMinBorder).toBe(1.25);
    });

    it('should partially update internal fields', () => {
      const { result } = renderHook(() => useBorderCalculatorState());

      act(() => {
        result.current.dispatch({
          type: 'INTERNAL_UPDATE',
          payload: {
            minBorderWarning: 'Border too small',
          },
        });
      });

      expect(result.current.state.minBorderWarning).toBe('Border too small');
      // Other warning fields should remain null
      expect(result.current.state.offsetWarning).toBeNull();
      expect(result.current.state.bladeWarning).toBeNull();
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
    });

    it('should perform partial batch update', () => {
      const { result } = renderHook(() => useBorderCalculatorState());

      act(() => {
        result.current.dispatch({
          type: 'BATCH_UPDATE',
          payload: {
            minBorder: 1.5,
            showBlades: false,
          },
        });
      });

      expect(result.current.state.minBorder).toBe(1.5);
      expect(result.current.state.showBlades).toBe(false);
      // Other fields remain at defaults
      expect(result.current.state.aspectRatio).toBe('3:2');
      expect(result.current.state.paperSize).toBe('8x10');
    });

    it('should maintain immutability with batch update', () => {
      const { result } = renderHook(() => useBorderCalculatorState());
      const originalState = result.current.state;

      act(() => {
        result.current.dispatch({
          type: 'BATCH_UPDATE',
          payload: {
            minBorder: 3.0,
            horizontalOffset: 1.0,
          },
        });
      });

      expect(originalState.minBorder).toBe(0.5);
      expect(originalState.horizontalOffset).toBe(0);
      expect(result.current.state).not.toBe(originalState);
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

    it('should restore state from localStorage on mount', () => {
      // Pre-populate localStorage
      const savedState: Partial<BorderCalculatorState> = {
        aspectRatio: '16:9',
        paperSize: '11x14',
        minBorder: 1.75,
        horizontalOffset: 0.25,
        isLandscape: false,
      };

      localStorageMock.setItem(
        BORDER_CALCULATOR_STORAGE_KEY,
        JSON.stringify(savedState)
      );

      const { result } = renderHook(() => useBorderCalculatorState());

      // Should restore from localStorage
      expect(result.current.state.aspectRatio).toBe('16:9');
      expect(result.current.state.paperSize).toBe('11x14');
      expect(result.current.state.minBorder).toBe(1.75);
      expect(result.current.state.horizontalOffset).toBe(0.25);
      expect(result.current.state.isLandscape).toBe(false);
    });

    it('should handle corrupted localStorage data gracefully', () => {
      // Set invalid JSON
      localStorageMock.setItem(
        BORDER_CALCULATOR_STORAGE_KEY,
        'not-valid-json{'
      );

      // Should not throw, should use defaults
      const { result } = renderHook(() => useBorderCalculatorState());

      expect(result.current.state.aspectRatio).toBe('3:2');
      expect(result.current.state.paperSize).toBe('8x10');
    });

    it('should handle missing localStorage gracefully', () => {
      // No data in localStorage
      const { result } = renderHook(() => useBorderCalculatorState());

      // Should use defaults
      expect(result.current.state.aspectRatio).toBe('3:2');
      expect(result.current.state.minBorder).toBe(0.5);
    });

    it('should debounce multiple rapid updates to localStorage', async () => {
      const { result } = renderHook(() => useBorderCalculatorState());

      // Make multiple rapid changes
      act(() => {
        result.current.dispatch({
          type: 'SET_FIELD',
          key: 'minBorder',
          value: 1.0,
        });
        result.current.dispatch({
          type: 'SET_FIELD',
          key: 'minBorder',
          value: 1.5,
        });
        result.current.dispatch({
          type: 'SET_FIELD',
          key: 'minBorder',
          value: 2.0,
        });
      });

      // Wait for debounce
      await waitFor(
        () => {
          expect(localStorageMock.setItem).toHaveBeenCalled();
        },
        { timeout: 1000 }
      );

      // Should only save once after debounce period
      // The exact count may vary, but it should be significantly less than 3
      expect(localStorageMock.setItem.mock.calls.length).toBeLessThanOrEqual(2);

      // Final saved value should be the last one
      const lastSave =
        localStorageMock.setItem.mock.calls[
          localStorageMock.setItem.mock.calls.length - 1
        ][1];
      const parsed = JSON.parse(lastSave);
      expect(parsed.minBorder).toBe(2.0);
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

    it('should not persist non-persistable fields like warnings', async () => {
      const { result } = renderHook(() => useBorderCalculatorState());

      act(() => {
        result.current.dispatch({
          type: 'INTERNAL_UPDATE',
          payload: {
            offsetWarning: 'Warning message',
            bladeWarning: 'Blade warning',
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

      // Warning fields should not be in persisted data
      expect(parsed.offsetWarning).toBeUndefined();
      expect(parsed.bladeWarning).toBeUndefined();
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

    it('should create new objects for nested updates', () => {
      const { result } = renderHook(() => useBorderCalculatorState());
      const state1 = result.current.state;

      act(() => {
        result.current.dispatch({
          type: 'SET_IMAGE_DIMENSIONS',
          value: { width: 1000, height: 800 },
        });
      });

      const state2 = result.current.state;

      expect(state1.imageDimensions).not.toBe(state2.imageDimensions);
      expect(state1.imageDimensions).toEqual({ width: 0, height: 0 });
      expect(state2.imageDimensions).toEqual({ width: 1000, height: 800 });
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
          return result.current.state.aspectRatio === '16:9';
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

    it('should handle preset application scenario', async () => {
      const { result } = renderHook(() => useBorderCalculatorState());

      // Apply a preset configuration
      act(() => {
        result.current.dispatch({
          type: 'BATCH_UPDATE',
          payload: {
            aspectRatio: '4:3',
            paperSize: '11x14',
            minBorder: 1.5,
            isLandscape: true,
            enableOffset: false,
            horizontalOffset: 0,
            verticalOffset: 0,
          },
        });
      });

      expect(result.current.state.aspectRatio).toBe('4:3');
      expect(result.current.state.paperSize).toBe('11x14');
      expect(result.current.state.minBorder).toBe(1.5);

      // Wait for persistence
      await waitFor(
        () => {
          expect(localStorageMock.setItem).toHaveBeenCalled();
        },
        { timeout: 1000 }
      );
    });
  });
});
