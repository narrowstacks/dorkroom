import type { ReactNode } from 'react';
import { ScrollView, type ScrollViewProps, View } from 'react-native';
import { useBackdropStyle } from '@/components/gradient-background';
import { useHeaderClearance } from '@/hooks/use-header-clearance';
import { useKeyboardInsetsGate } from '@/hooks/use-keyboard-insets-gate';
import { bottomRoomProps } from './screen-insets';

interface ScreenProps {
  children: ReactNode;
  /**
   * Pinned above the scroll view: it never scrolls and stays put when the
   * keyboard rises. Used by the answer-first calculators for their readout.
   */
  header?: ReactNode;
  /** Passed to the scroll view; Home reads its offset from it. */
  onScroll?: ScrollViewProps['onScroll'];
  /**
   * Room at the bottom of the scroll view for something pinned over it
   * (Home's favorites row), as a bottom `contentInset` and indicator inset on
   * top of the automatic ones. React Native's keyboard handler takes the
   * larger of the keyboard and this, and restores this on hide, so it must
   * not change while the keyboard is up (a prop change overwrites the
   * keyboard's inset). Unset or 0: no inset props at all.
   */
  contentBottomInset?: number;
}

/** Side padding of the scrolling content. */
export const SCREEN_PADDING = 16;

/** Space between the scrolling content's children. */
const CONTENT_GAP = 16;

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

export function Screen({
  children,
  header,
  onScroll,
  contentBottomInset = 0,
}: ScreenProps) {
  const backdrop = useBackdropStyle();
  const adjustsForKeyboard = useKeyboardInsetsGate();
  const scroll = (
    <ScrollView
      // The backdrop is the scroll view's own background (it does not scroll)
      // when the scroll view is the root, below.
      style={header ? undefined : backdrop}
      contentInsetAdjustmentBehavior="automatic"
      // Inset for the keyboard so a focused text field scrolls into view
      // instead of being covered (e.g. Notes on the shot/roll forms). Only on
      // the screen in view, and not for a keyboard it inherited: React
      // Native's handler runs in every mounted scroll view, in other tabs and
      // under the stack too, and re-applies the offset through a `scrollTo`
      // that clamps at `-contentInset.top`, which is 0 here (the header's
      // inset is UIKit's adjusted inset, which it does not count; with Prefer
      // Cross-Fade Transitions it sets 0 outright). So a keyboard anywhere
      // moved every other Screen to offset 0, its first rows under the header.
      automaticallyAdjustKeyboardInsets={adjustsForKeyboard}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: SCREEN_PADDING, gap: CONTENT_GAP }}
      {...bottomRoomProps(contentBottomInset)}
      onScroll={onScroll}
    >
      {children}
    </ScrollView>
  );
  // With no pinned header the scroll view IS the screen's root view, so it
  // heads the first-subview chain UIKit and react-native-screens search for
  // the scroll view a large title collapses with. Nothing may come before it
  // there (a backdrop view did); a plain wrapper View with it first was not
  // picked up either on the Simulator, so there is none.
  if (!header) return scroll;
  return (
    <View className="flex-1" style={backdrop}>
      <PinnedHeader>{header}</PinnedHeader>
      {scroll}
    </View>
  );
}
