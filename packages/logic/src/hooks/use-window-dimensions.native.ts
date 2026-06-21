import { useWindowDimensions as useRNWindowDimensions } from 'react-native';

/**
 * React Native implementation of useWindowDimensions, mirroring the web hook's
 * return shape. Metro resolves this `.native.ts` file on iOS/Android; the web
 * build uses `use-window-dimensions.ts`.
 *
 * @returns Object containing current window width and height
 */
export function useWindowDimensions(): { width: number; height: number } {
  const { width, height } = useRNWindowDimensions();
  return { width, height };
}
