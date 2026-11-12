import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { GradientBackground } from '@/components/gradient-background';
import { useHeaderClearance } from '@/hooks/use-header-clearance';

interface ScreenProps {
  children: ReactNode;
  /**
   * Pinned above the scroll view: it never scrolls and stays put when the
   * keyboard rises. Used by the answer-first calculators for their readout.
   */
  header?: ReactNode;
}

/** Side padding of the scrolling content. */
export const SCREEN_PADDING = 16;

/** Breathing room under a navigation bar, and under the status bar at a tab root. */
const BELOW_NAV_BAR = 12;
const BELOW_STATUS_BAR = 8;

function PinnedHeader({ children }: { children: ReactNode }) {
  const top = useHeaderClearance(BELOW_NAV_BAR, BELOW_STATUS_BAR);
  return (
    <View
      style={{
        paddingTop: top,
        paddingHorizontal: SCREEN_PADDING,
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
        contentContainerStyle={{ padding: SCREEN_PADDING, gap: 16 }}
      >
        {children}
      </ScrollView>
    </View>
  );
}
