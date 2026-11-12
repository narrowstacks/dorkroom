import * as Haptics from 'expo-haptics';
import {
  type ComponentProps,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Keyboard, ScrollView, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  useAnimatedKeyboard,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { GlassCard } from '@/components/glass-card';
import { useSafelight } from '@/components/safelight/safelight-provider';
import { SAFELIGHT } from '@/theme/safelight';
import { useModeColor } from '@/theme/use-phase-accent';
import { exclusiveGesture, panGesture, tapGesture } from './gestures';
import {
  clampPanelHeight,
  drawingKeep,
  expandedPanelHeight,
  panelAvailable,
  panelBottom,
  panelCeiling,
  panelFrame,
  panelRoom,
  snapsToExpanded,
  STRIP_HEIGHT,
} from './stage-layout';
import { useKeepFieldVisible } from './use-keep-field-visible';

const SPRING = { damping: 30, stiffness: 320, mass: 1 } as const;
const RESIZE_MS = 140;
/** Below the collapsed controls, and the gap before the expanded ones. */
export const COLLAPSED_PAD = 12;
const EXPANDED_GAP = 16;
const CONTENT_PAD = 16;

interface DetentPanelProps {
  /** The most-used controls: always shown, and all there is when collapsed. */
  collapsed: ReactNode;
  /** The rest. Hidden from VoiceOver and touch while collapsed. */
  expanded: ReactNode;
  windowWidth: number;
  windowHeight: number;
  /** Bottom of the header and any pinned readout: the panel never rises above it. */
  topLimit: number;
  /** The panel's resting distance from the screen's bottom edge. */
  bottomOffset: number;
  /**
   * The collapsed panel's height, strip included. The screen derives it from
   * the block this panel reports (capped to leave the drawing room) because the
   * stage is laid out from it.
   */
  collapsedHeight: number;
  /** The drawing's floor while expanded, when the screen overrides the default. */
  minDrawing?: number;
  /** Told the collapsed block's own height, before the strip and padding. */
  onBodyHeight: (height: number) => void;
}

interface GrabStripProps {
  gesture: ComponentProps<typeof GestureDetector>['gesture'];
  expanded: boolean;
  color: string;
  onToggle: () => void;
}

/** The panel's 40pt grab strip: a button that toggles, and the drag handle. */
function GrabStrip({ gesture, expanded, color, onToggle }: GrabStripProps) {
  return (
    <GestureDetector gesture={gesture}>
      <View
        accessible
        accessibilityRole="button"
        accessibilityLabel="Controls"
        accessibilityState={{ expanded }}
        accessibilityHint={
          expanded
            ? 'Collapses the panel to its main controls'
            : 'Expands the panel to show every control'
        }
        onAccessibilityTap={onToggle}
        style={{
          height: STRIP_HEIGHT,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: 40,
            height: 5,
            borderRadius: 3,
            backgroundColor: color,
          }}
        />
      </View>
    </GestureDetector>
  );
}

/**
 * An in-screen control panel with two detents, anchored above the tab bar. One
 * shared value (its height) is moved by a UI-thread pan on the grab strip and by
 * a spring, so a drag costs no JS per frame. Collapsed it shows the first
 * block; expanded it grows over the lower part of the stage (the stage never
 * moves) up to the cap that leaves the drawing in view, and scrolls its content.
 * It rides above the keyboard when a field in it is focused. The strip is a
 * button: tap to toggle, drag or fling to move.
 *
 * Collapsed, the scroll view's content is clipped to the collapsed block, so
 * nothing of the expanded block can be scrolled to or touched; it goes back to
 * the top as the panel closes. A collapsed block taller than the panel (Resize's
 * scrub rows) still scrolls inside it.
 */
export function DetentPanel({
  collapsed,
  expanded,
  windowWidth,
  windowHeight,
  topLimit,
  bottomOffset,
  collapsedHeight,
  minDrawing,
  onBodyHeight,
}: DetentPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  // True once the panel has closed all the way: only then is the content
  // clipped, so the scroll can finish going back to the top first.
  const [clipped, setClipped] = useState(true);
  const [bodyHeight, setBodyHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const { on: safelight } = useSafelight();
  const keyboard = useAnimatedKeyboard();
  const grabColor = useModeColor('rgba(255,255,255,0.35)', SAFELIGHT.outline);
  const frame = panelFrame(windowWidth);

  const available = panelAvailable(windowHeight, topLimit, bottomOffset);
  const keep = drawingKeep(available, minDrawing);
  const expandedHeight = expandedPanelHeight({
    contentHeight: STRIP_HEIGHT + contentHeight + CONTENT_PAD,
    collapsedHeight,
    available,
    minDrawing,
  });

  const height = useSharedValue(0);
  const startHeight = useSharedValue(0);
  const collapsedSV = useSharedValue(0);
  const expandedSV = useSharedValue(0);
  const dragging = useSharedValue(false);
  const placed = useRef(false);
  const expandedRef = useRef(false);
  useLayoutEffect(() => {
    expandedRef.current = isExpanded;
  });

  // A change in the detents themselves (first measure, a toggle that adds a
  // row, Dynamic Type) moves the panel to where it rests, unless a finger is
  // dragging it: the release springs to the numbers kept here.
  useEffect(() => {
    collapsedSV.value = collapsedHeight;
    expandedSV.value = expandedHeight;
    if (collapsedHeight === 0 || dragging.value) return;
    const rest = expandedRef.current ? expandedHeight : collapsedHeight;
    cancelAnimation(height);
    height.value = placed.current
      ? withTiming(rest, { duration: RESIZE_MS })
      : rest;
    placed.current = true;
  }, [
    collapsedHeight,
    expandedHeight,
    collapsedSV,
    expandedSV,
    dragging,
    height,
  ]);

  const scrollRef = useRef<ScrollView>(null);
  const contentRef = useRef<View>(null);
  const keep_ = useKeepFieldVisible(scrollRef, contentRef, (keyboardHeight) => {
    const rest = expandedRef.current ? expandedHeight : collapsedHeight;
    const bottom = panelBottom(keyboardHeight, bottomOffset);
    const room = panelRoom(windowHeight, topLimit, bottom, keep);
    const ceiling = panelCeiling(windowHeight, topLimit, bottom);
    return (
      Math.min(ceiling, Math.max(collapsedHeight, Math.min(rest, room))) -
      STRIP_HEIGHT
    );
  });

  const finishCollapse = useCallback(() => {
    if (!expandedRef.current) setClipped(true);
  }, []);

  const unclip = useCallback(() => setClipped(false), []);

  const settle = useCallback(
    (next: boolean) => {
      if (next !== expandedRef.current) Haptics.selectionAsync();
      expandedRef.current = next;
      setIsExpanded(next);
      if (next) {
        setClipped(false);
      } else {
        // A focused field is about to be clipped away: drop the keyboard with it.
        Keyboard.dismiss();
        // Back to the top as the panel closes, so the collapsed block is what shows.
        scrollRef.current?.scrollTo({ y: 0, animated: true });
        keep_.resetScroll();
      }
    },
    [keep_]
  );

  const springTo = useCallback(
    (next: boolean) => {
      height.value = withSpring(
        next ? expandedSV.value : collapsedSV.value,
        SPRING,
        (finished) => {
          'worklet';
          if (finished && !next) scheduleOnRN(finishCollapse);
        }
      );
    },
    [height, expandedSV, collapsedSV, finishCollapse]
  );

  const toggle = useCallback(() => {
    const next = !expandedRef.current;
    settle(next);
    springTo(next);
  }, [settle, springTo]);

  const strip = useMemo(
    () =>
      exclusiveGesture(
        panGesture()
          .activeOffsetY([-8, 8])
          .failOffsetX([-30, 30])
          .onStart(() => {
            'worklet';
            cancelAnimation(height);
            dragging.value = true;
            startHeight.value = height.value;
            // Show the expanded controls as they rise, not when the drag ends.
            scheduleOnRN(unclip);
          })
          .onUpdate((event) => {
            'worklet';
            height.value = clampPanelHeight(
              startHeight.value - event.translationY,
              collapsedSV.value,
              expandedSV.value
            );
          })
          .onEnd((event) => {
            'worklet';
            const next = snapsToExpanded({
              height: height.value,
              velocityY: event.velocityY,
              collapsedHeight: collapsedSV.value,
              expandedHeight: expandedSV.value,
            });
            height.value = withSpring(
              next ? expandedSV.value : collapsedSV.value,
              SPRING,
              (finished) => {
                'worklet';
                if (finished && !next) scheduleOnRN(finishCollapse);
              }
            );
            scheduleOnRN(settle, next);
          })
          .onFinalize(() => {
            'worklet';
            dragging.value = false;
          }),
        tapGesture()
          .runOnJS(true)
          .maxDistance(8)
          .onEnd((_event, success) => {
            if (success) toggle();
          })
      ),
    [
      height,
      dragging,
      startHeight,
      collapsedSV,
      expandedSV,
      finishCollapse,
      unclip,
      settle,
      toggle,
    ]
  );

  const animated = useAnimatedStyle(() => {
    const bottom = panelBottom(keyboard.height.value, bottomOffset);
    const room = panelRoom(windowHeight, topLimit, bottom, keep);
    // Until the collapsed block has been measured the panel is laid out tall
    // and off screen: a view with no room is not mounted, so it would never
    // report. (Not faded out: glass does not come back from an opacity of 0.)
    if (collapsedSV.value === 0) {
      return {
        bottom,
        height: windowHeight,
        transform: [{ translateY: windowHeight }],
      };
    }
    return {
      bottom,
      // Never below the collapsed block, never so tall that it covers the drawing.
      height: Math.min(
        panelCeiling(windowHeight, topLimit, bottom),
        Math.max(collapsedSV.value, Math.min(height.value, room))
      ),
      transform: [{ translateY: 0 }],
    };
  });

  // The collapsed block's scroll viewport is what the collapsed panel shows.
  const collapsedScrolls =
    bodyHeight + COLLAPSED_PAD > collapsedHeight - STRIP_HEIGHT;
  const showClipped = clipped && !isExpanded && bodyHeight > 0;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        {
          position: 'absolute',
          left: frame.left,
          width: frame.width,
          overflow: 'hidden',
          borderRadius: 28,
          // Under the glass, so what the panel overlaps never shows through.
          backgroundColor: safelight
            ? SAFELIGHT.background
            : 'rgba(7,7,8,0.72)',
        },
        animated,
      ]}
    >
      <GlassCard flush className="flex-1" style={{ flex: 1, borderRadius: 28 }}>
        <GrabStrip
          gesture={strip}
          expanded={isExpanded}
          color={grabColor}
          onToggle={toggle}
        />
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          scrollEnabled={isExpanded || collapsedScrolls}
          bounces={isExpanded || collapsedScrolls}
          showsVerticalScrollIndicator={isExpanded || collapsedScrolls}
          keyboardShouldPersistTaps="handled"
          onMomentumScrollEnd={(e) =>
            keep_.onScrollSettled(e.nativeEvent.contentOffset.y)
          }
          onScrollEndDrag={(e) =>
            keep_.onScrollSettled(e.nativeEvent.contentOffset.y)
          }
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: showClipped ? COLLAPSED_PAD : CONTENT_PAD,
            ...(showClipped
              ? { height: bodyHeight + COLLAPSED_PAD, overflow: 'hidden' }
              : null),
          }}
        >
          <View
            ref={contentRef}
            style={{ flexShrink: 0 }}
            onTouchEnd={keep_.onContentTouchEnd}
            onLayout={(e) =>
              setContentHeight(Math.ceil(e.nativeEvent.layout.height))
            }
          >
            <View
              style={{ flexShrink: 0 }}
              onLayout={(e) => {
                const measured = Math.ceil(e.nativeEvent.layout.height);
                setBodyHeight(measured);
                onBodyHeight(measured);
              }}
            >
              {collapsed}
            </View>
            <View
              style={{ marginTop: EXPANDED_GAP }}
              pointerEvents={isExpanded ? 'auto' : 'none'}
              accessibilityElementsHidden={!isExpanded}
              importantForAccessibility={
                isExpanded ? 'auto' : 'no-hide-descendants'
              }
            >
              {expanded}
            </View>
          </View>
        </ScrollView>
      </GlassCard>
    </Animated.View>
  );
}
