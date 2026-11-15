import type { ReactElement } from 'react';
import { ScrollViewMarker } from 'react-native-screens/experimental';

/**
 * Tells the native tab bar which scroll view to watch, so the bar can minimize
 * as it scrolls (`tabBarMinimizeBehavior`). The `minimizeBehavior` prop alone
 * does nothing for a list inside a native stack inside a tab (seen on the
 * Simulator, also with `onScrollDown` hard-coded): the marker registers its one
 * child, a `FlatList` or `ScrollView`, as the tab's content scroll view. Wrap
 * only the list screens whose path asks for minimizing.
 */
export function TabBarScrollView({ children }: { children: ReactElement }) {
  return <ScrollViewMarker style={{ flex: 1 }}>{children}</ScrollViewMarker>;
}
