// Inch and second defaults. Numbers, matching ResizeCalculatorState; the
// string-state hook (iOS) wraps them in String().
export const DEFAULT_ORIGINAL_WIDTH = 6;
export const DEFAULT_ORIGINAL_LENGTH = 4;
export const DEFAULT_NEW_WIDTH = 9;
export const DEFAULT_NEW_LENGTH = 6;
export const DEFAULT_ORIGINAL_TIME = 10;
export const DEFAULT_ORIGINAL_HEIGHT = 12;
export const DEFAULT_NEW_HEIGHT = 36;
export const RESIZE_STORAGE_KEY = 'resizeCalculatorState_v1';

export interface ResizeCalculatorState {
  isEnlargerHeightMode: boolean;
  originalWidth: number;
  originalLength: number;
  newWidth: number;
  newLength: number;
  originalTime: number;
  originalHeight: number;
  newHeight: number;
}

/** Initial (and reset) form state for the resize calculator. */
export const RESIZE_FORM_DEFAULTS: ResizeCalculatorState = {
  isEnlargerHeightMode: false,
  originalWidth: DEFAULT_ORIGINAL_WIDTH,
  originalLength: DEFAULT_ORIGINAL_LENGTH,
  newWidth: DEFAULT_NEW_WIDTH,
  newLength: DEFAULT_NEW_LENGTH,
  originalTime: DEFAULT_ORIGINAL_TIME,
  originalHeight: DEFAULT_ORIGINAL_HEIGHT,
  newHeight: DEFAULT_NEW_HEIGHT,
};
