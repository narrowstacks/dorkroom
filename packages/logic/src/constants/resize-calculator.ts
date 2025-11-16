export const DEFAULT_ORIGINAL_WIDTH = '4';
export const DEFAULT_ORIGINAL_LENGTH = '6';
export const DEFAULT_NEW_WIDTH = '6';
export const DEFAULT_NEW_LENGTH = '9';
export const DEFAULT_ORIGINAL_TIME = '10';
export const DEFAULT_ORIGINAL_HEIGHT = '12';
export const DEFAULT_NEW_HEIGHT = '36';
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
