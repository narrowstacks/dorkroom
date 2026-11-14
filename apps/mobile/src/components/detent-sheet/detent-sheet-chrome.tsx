import type { ComponentProps, ReactNode, RefObject } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import {
  CONTENT_BOTTOM_PAD,
  EXPANDED_GAP,
  HEADER_HEIGHT,
} from '@/components/detent-sheet/detent-sheet-layout';
import type { useKeepFieldVisible } from '@/components/stage/use-keep-field-visible';
import { CHROME_MAX_FONT_SCALE } from '@/theme/tokens';
import { usePhaseHue } from '@/theme/use-phase-accent';

type Gesture = ComponentProps<typeof GestureDetector>['gesture'];

export const SHEET_SIDE_PADDING = 20;

interface GrabStripProps {
  gesture: Gesture;
  stripHeight: number;
  /** Present only while the sheet can resize. Otherwise the strip is plain room:
   * no grabber and no button, since there is nothing for it to do. */
  resizable?: { expanded: boolean; onToggle: () => void };
}

/** The grabber: a button that toggles the detent, and a drag handle. */
export function GrabStrip({ gesture, stripHeight, resizable }: GrabStripProps) {
  if (!resizable) {
    return (
      <GestureDetector gesture={gesture}>
        <View style={{ height: stripHeight }} />
      </GestureDetector>
    );
  }
  return (
    <GestureDetector gesture={gesture}>
      <View
        accessible
        accessibilityRole="button"
        accessibilityLabel="Details"
        accessibilityState={{ expanded: resizable.expanded }}
        accessibilityHint={
          resizable.expanded
            ? 'Shows less of the sheet'
            : 'Shows every field in the sheet'
        }
        onAccessibilityTap={resizable.onToggle}
        style={{
          height: stripHeight,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          className="bg-edge-strong"
          style={{ width: 36, height: 5, borderRadius: 3 }}
        />
      </View>
    </GestureDetector>
  );
}

/**
 * The header row is a fixed 44pt, like a navigation bar, so its labels stop
 * growing at the chrome cap (as UIKit's bar items do); past it, Cancel ran
 * into the title and both were cut off at the top.
 */
const HEADER_MAX_FONT_SCALE = CHROME_MAX_FONT_SCALE;

interface DetentHeaderProps {
  gesture: Gesture;
  title: string;
  cancelLabel: string;
  /** Omitted when the footer's button is the only commit. */
  commitLabel?: string;
  commitDisabled?: boolean;
  onCancel: () => void;
  onCommit: () => void;
}

/**
 * Cancel, the title and the commit action (when the header has one), which is
 * also a drag handle. The title stays centred whatever the two labels' widths:
 * the sides share the remaining room equally, an empty side included.
 */
export function DetentHeader({
  gesture,
  title,
  cancelLabel,
  commitLabel,
  commitDisabled,
  onCancel,
  onCommit,
}: DetentHeaderProps) {
  const hue = usePhaseHue();
  return (
    <GestureDetector gesture={gesture}>
      <View
        className="flex-row items-center"
        style={{ height: HEADER_HEIGHT, paddingHorizontal: SHEET_SIDE_PADDING }}
      >
        <View className="flex-1 items-start">
          <Pressable
            className="min-h-11 min-w-11 justify-center"
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel={cancelLabel}
          >
            <Text
              className="text-base text-ink-70"
              numberOfLines={1}
              maxFontSizeMultiplier={HEADER_MAX_FONT_SCALE}
            >
              {cancelLabel}
            </Text>
          </Pressable>
        </View>
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          maxFontSizeMultiplier={HEADER_MAX_FONT_SCALE}
          className="shrink text-center text-base font-semibold text-white"
        >
          {title}
        </Text>
        <View className="flex-1 items-end">
          {commitLabel === undefined ? null : (
            <Pressable
              className={`min-h-11 min-w-11 items-end justify-center ${commitDisabled ? 'opacity-40' : ''}`}
              onPress={onCommit}
              disabled={commitDisabled}
              accessibilityRole="button"
              accessibilityLabel={commitLabel}
              accessibilityState={{ disabled: commitDisabled ?? false }}
            >
              <Text
                className="text-base font-semibold"
                style={{ color: hue }}
                numberOfLines={1}
                maxFontSizeMultiplier={HEADER_MAX_FONT_SCALE}
              >
                {commitLabel}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </GestureDetector>
  );
}

/** Static: dynamic padding on a scroll view's content container is a layout cost. */
const SCROLL_CONTENT = {
  paddingHorizontal: SHEET_SIDE_PADDING,
  paddingBottom: CONTENT_BOTTOM_PAD,
} as const;

interface DetentContentProps {
  scrollRef: RefObject<ScrollView | null>;
  contentRef: RefObject<View | null>;
  keep: ReturnType<typeof useKeepFieldVisible>;
  scrolls: boolean;
  /** At medium the content is clipped to the medium block, so the expanded
   * block cannot be scrolled to. */
  clipTo: number | null;
  /** False while the expanded block must not be touched or read. */
  revealed: boolean;
  children: ReactNode;
  expanded?: ReactNode;
  onChildrenHeight: (height: number) => void;
  onExpandedHeight: (height: number) => void;
}

/** The scroll area: the medium block, then the expanded block under it. */
export function DetentContent({
  scrollRef,
  contentRef,
  keep,
  scrolls,
  clipTo,
  revealed,
  children,
  expanded,
  onChildrenHeight,
  onExpandedHeight,
}: DetentContentProps) {
  return (
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1 }}
      scrollEnabled={scrolls}
      bounces={scrolls}
      showsVerticalScrollIndicator={scrolls}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      onMomentumScrollEnd={(e) =>
        keep.onScrollSettled(e.nativeEvent.contentOffset.y)
      }
      onScrollEndDrag={(e) =>
        keep.onScrollSettled(e.nativeEvent.contentOffset.y)
      }
      // A field growing under the keyboard (notes) is brought back into view.
      onContentSizeChange={() => keep.onContentTouchEnd()}
      contentContainerStyle={SCROLL_CONTENT}
    >
      <View
        ref={contentRef}
        style={[
          { flexShrink: 0 },
          clipTo === null ? null : { height: clipTo, overflow: 'hidden' },
        ]}
        onTouchEnd={keep.onContentTouchEnd}
      >
        <View
          style={{ flexShrink: 0 }}
          onLayout={(e) =>
            onChildrenHeight(Math.ceil(e.nativeEvent.layout.height))
          }
        >
          {children}
        </View>
        {expanded !== undefined && expanded !== null ? (
          <View
            style={{ marginTop: EXPANDED_GAP, flexShrink: 0 }}
            pointerEvents={revealed ? 'auto' : 'none'}
            accessibilityElementsHidden={!revealed}
            importantForAccessibility={
              revealed ? 'auto' : 'no-hide-descendants'
            }
            onLayout={(e) =>
              onExpandedHeight(Math.ceil(e.nativeEvent.layout.height))
            }
          >
            {expanded}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
