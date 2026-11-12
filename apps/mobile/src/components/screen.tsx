import { HeaderHeightContext } from 'expo-router/react-navigation';
import { type ReactNode, useContext } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientBackground } from '@/components/gradient-background';

interface ScreenProps {
  children: ReactNode;
  /**
   * Pinned above the scroll view: it never scrolls and stays put when the
   * keyboard rises. Used by the answer-first calculators for their readout.
   */
  header?: ReactNode;
}

/** Breathing room under a navigation bar, and under the status bar at a tab root. */
const BELOW_NAV_BAR = 12;
const BELOW_STATUS_BAR = 8;

/**
 * Space the pinned header must clear. Pushed in the More stack the transparent
 * native header overlays the content, so it is that header's height; as a tab
 * root there is no navigation header, so it is the top safe-area inset. The
 * context (not the throwing hook) is read because it is absent or 0 at a tab
 * root.
 */
function usePinnedHeaderTop(): number {
  const headerHeight = useContext(HeaderHeightContext);
  const insets = useSafeAreaInsets();
  return headerHeight !== undefined && headerHeight > 0
    ? headerHeight + BELOW_NAV_BAR
    : insets.top + BELOW_STATUS_BAR;
}

function PinnedHeader({ children }: { children: ReactNode }) {
  const top = usePinnedHeaderTop();
  return (
    <View
      style={{
        paddingTop: top,
        paddingHorizontal: 16,
        paddingBottom: 8,
      }}
    >
      {children}
    </View>
  );
}

export function Screen({ children, header }: ScreenProps) {
  return (
    <View className="flex-1">
      <GradientBackground />
      {header ? <PinnedHeader>{header}</PinnedHeader> : null}
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        // Inset for the keyboard so a focused text field scrolls into view
        // instead of being covered (e.g. Notes on the shot/roll forms).
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 16 }}
      >
        {children}
      </ScrollView>
    </View>
  );
}
