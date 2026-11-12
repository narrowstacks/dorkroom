import { HeaderHeightContext } from 'expo-router/react-navigation';
import { useContext } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Space a screen must leave at its top. Pushed in a phase stack the transparent
 * native header overlays the content, so it is that header's height plus
 * `belowHeader`; as a tab root there is no navigation header, so it is the top
 * safe-area inset plus `belowStatusBar`. The context (not the throwing hook)
 * is read because it is absent or 0 without a header.
 */
export function useHeaderClearance(
  belowHeader: number,
  belowStatusBar: number = belowHeader
): number {
  const headerHeight = useContext(HeaderHeightContext);
  const insets = useSafeAreaInsets();
  return headerHeight !== undefined && headerHeight > 0
    ? headerHeight + belowHeader
    : insets.top + belowStatusBar;
}
