import { type ReactNode, useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  type ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedKeyboard,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  initialWindowMetrics,
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { CommitButton } from '@/components/commit-button';
import {
  DetentContent,
  DetentHeader,
  GrabStrip,
  SHEET_SIDE_PADDING,
} from '@/components/detent-sheet/detent-sheet-chrome';
import {
  CONTENT_BOTTOM_PAD,
  GRAB_STRIP_HEIGHT,
  PLAIN_STRIP_HEIGHT,
  scrollViewportHeight,
  sheetHeights,
} from '@/components/detent-sheet/detent-sheet-layout';
import { useDetentGestures } from '@/components/detent-sheet/use-detent-gestures';
import { useDetentPhase } from '@/components/detent-sheet/use-detent-phase';
import { useDetentStyles } from '@/components/detent-sheet/use-detent-styles';
import { useSheetLatch } from '@/components/detent-sheet/use-sheet-latch';
import {
  SafelightOverlay,
  SafelightRoot,
} from '@/components/safelight/safelight-overlay';
import { useSafelight } from '@/components/safelight/safelight-provider';
import { useKeepFieldVisible } from '@/components/stage/use-keep-field-visible';

const RESIZE_MS = 140;
/** The scrim and the panel's slide share this duration, like `BottomSheet`. */
const ENTER_MS = 260;
const FOOTER_PAD_TOP = 8;

interface DetentSheetBaseProps {
  visible: boolean;
  /** Centred in the header, whatever the two actions' widths. */
  title: string;
  /** The header's leading action. */
  cancelLabel?: string;
  /**
   * Called once when the commit action is pressed. Return false when nothing
   * was committed (a refusal): the sheet then stays open and usable. Otherwise
   * the sheet is spent: it ignores every later close and commit.
   */
  onCommit: () => boolean | undefined;
  commitDisabled?: boolean;
  /**
   * Cancel, a tap on the scrim, a drag down, or the hardware close. It must
   * close the sheet: the sheet ignores every later close and commit.
   */
  onClose: () => void;
  /** Fires after the sheet has fully dismissed (iOS). */
  onDismiss?: () => void;
  /** The medium detent's content. */
  children: ReactNode;
  /** Extra content revealed at the large detent. Without it the sheet has one detent. */
  expanded?: ReactNode;
  /** Extra pinned content above the footer's commit button (not a commit). */
  footer?: ReactNode;
  /** When this number changes the sheet snaps to the large detent. */
  expandSignal?: number;
  /** Told each time the sheet comes to rest at a detent. */
  onSettled?: (expanded: boolean) => void;
}

/**
 * Where the commit lives: the header's trailing action, the footer's button, or
 * both. Both share one guarded action and disabled state, so only one commit
 * can ever fire. A sheet with a footer button may leave the header without one
 * (the log-frame sheet does): the title stays centred.
 */
type DetentSheetCommit =
  | {
      /** The header's trailing action, in the phase's hue. */
      commitLabel: string;
      /** The footer's commit button. */
      footerCommitLabel?: string;
    }
  | { commitLabel?: undefined; footerCommitLabel: string };

type DetentSheetProps = DetentSheetBaseProps & DetentSheetCommit;

/**
 * A bottom sheet with two detents, on a transparent RN `Modal`: medium shows
 * `children`, large also shows `expanded`. One shared value (the panel's
 * height) is moved by a UI-thread pan on the grab strip and the header, and by
 * a spring, so a drag costs no JS per frame. JS is told when a drag starts (to
 * unclip the expanded block) and when it is released.
 * Pulled down past medium, or flung down from it, the sheet dismisses. With no
 * `expanded` it has one detent: no grabber, drag down still dismisses.
 *
 * The body is mounted only while `visible`, so every opening starts from fresh
 * state. At medium the scroll view's content is clipped to the medium block,
 * so the expanded block cannot be scrolled to or touched (it is also hidden
 * from VoiceOver). The scrim is light at medium so the page behind stays
 * readable, and darkens toward large. The panel rides above the keyboard and
 * never passes the top safe area while it does. Pure maths is in
 * `detent-sheet-layout.ts`.
 *
 * Exactly one of close and commit can fire per opening. Use it when a form
 * should leave the page behind it visible (the Meter's viewfinder). A plain
 * list or one-shot form takes `BottomSheet`; a panel that lives in a screen's
 * layout is `DetentPanel`.
 */
export function DetentSheet(props: DetentSheetProps) {
  const { visible, onClose, onDismiss } = props;
  // The body's guarded close, so the hardware close obeys the same latch.
  const bodyClose = useRef<(() => void) | null>(null);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={() => (bodyClose.current ?? onClose)()}
      onDismiss={onDismiss}
    >
      {visible ? (
        // A Modal has no safe-area context of its own: the screen's provider
        // (a tab's, which includes the tab bar) would leak in. This one reads the
        // window's insets, follows resizes, and starts from the launch metrics so
        // the first frame is already right.
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <DetentSheetBody {...props} closeRef={bodyClose} />
        </SafeAreaProvider>
      ) : null}
    </Modal>
  );
}

function DetentSheetBody({
  title,
  cancelLabel = 'Cancel',
  commitLabel,
  onCommit,
  commitDisabled,
  onClose,
  children,
  expanded,
  footer,
  footerCommitLabel,
  expandSignal,
  onSettled,
  closeRef: registerClose,
}: DetentSheetProps & { closeRef: { current: (() => void) | null } }) {
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { on: safelight } = useSafelight();
  const keyboard = useAnimatedKeyboard();

  const hasExpanded = expanded !== undefined && expanded !== null;
  const [childrenHeight, setChildrenHeight] = useState(0);
  const [expandedHeight, setExpandedHeight] = useState(0);
  const [footerMeasured, setFooterMeasured] = useState(0);
  const hasFooter = Boolean(footer) || footerCommitLabel !== undefined;
  const footerHeight = hasFooter ? footerMeasured : 0;
  const measured = childrenHeight > 0;

  const stripHeight = hasExpanded ? GRAB_STRIP_HEIGHT : PLAIN_STRIP_HEIGHT;
  const heights = sheetHeights({
    windowHeight,
    topInset: insets.top,
    stripHeight,
    childrenHeight,
    expandedHeight,
    hasExpanded,
    footerHeight,
    insetBottom: insets.bottom,
  });
  const canResize = hasExpanded && heights.large > heights.medium;

  const height = useSharedValue(0);
  const startHeight = useSharedValue(0);
  const mediumSV = useSharedValue(0);
  const largeSV = useSharedValue(0);
  const dragging = useSharedValue(false);
  const targetLarge = useSharedValue(false);
  const moving = useSharedValue(false);
  const closingSV = useSharedValue(false);
  const enter = useSharedValue(0);
  // True once the heights and the resting height are written: until then the
  // panel is laid out off screen (see `useDetentStyles`).
  const ready = useSharedValue(false);
  const placed = useRef(false);
  const { closing, isLatched, latchDrag, close, commit, dismissDone } =
    useSheetLatch({ onClose, onCommit, closingSV, registerClose });

  const scrollRef = useRef<ScrollView>(null);
  const contentRef = useRef<View>(null);
  const keep = useKeepFieldVisible(scrollRef, contentRef, (keyboardHeight) =>
    scrollViewportHeight({
      restHeight: targetLarge.value ? heights.large : heights.medium,
      windowHeight,
      topInset: insets.top,
      keyboardHeight,
      insetBottom: insets.bottom,
      fixedTop: heights.fixedTop,
    })
  );

  const { phase, arrived, unclip, settle, toggle } = useDetentPhase({
    expandSignal,
    canResize,
    hasExpanded,
    childrenHeight,
    closing,
    isLatched,
    onSettled,
    scrollRef,
    keep,
    height,
    mediumHeight: mediumSV,
    largeHeight: largeSV,
    targetLarge,
    moving,
    closingSV,
  });

  // A change in the detents themselves (first measure, a field that adds a
  // row, Dynamic Type) moves the panel to where it rests, unless a finger is
  // dragging it or it is on its way out.
  useEffect(() => {
    mediumSV.value = heights.medium;
    largeSV.value = heights.large;
    if (!measured || dragging.value || closingSV.value) return;
    const toLarge = targetLarge.value;
    const rest = toLarge ? heights.large : heights.medium;
    // A spring under way is replaced by this move, so this move must complete
    // into the arrival the spring would have reported.
    const wasMoving = moving.value;
    cancelAnimation(height);
    height.value = placed.current
      ? withTiming(rest, { duration: RESIZE_MS }, (finished) => {
          'worklet';
          if (finished && wasMoving) {
            moving.value = false;
            scheduleOnRN(arrived, toLarge);
          }
        })
      : rest;
    placed.current = true;
    ready.value = true;
  }, [
    measured,
    heights.medium,
    heights.large,
    mediumSV,
    largeSV,
    dragging,
    closingSV,
    targetLarge,
    moving,
    arrived,
    height,
    ready,
  ]);

  // The scrim and the slide start together, once the panel knows its size.
  useEffect(() => {
    if (!measured) return;
    enter.value = withTiming(1, { duration: ENTER_MS });
  }, [measured, enter]);

  const gestures = useDetentGestures({
    height,
    startHeight,
    mediumHeight: mediumSV,
    largeHeight: largeSV,
    dragging,
    targetLarge,
    moving,
    closing: closingSV,
    keyboardHeight: keyboard.height,
    windowHeight,
    topInset: insets.top,
    onUnclip: unclip,
    onSettle: settle,
    onArrived: arrived,
    onDismissStart: latchDrag,
    onDismissDone: dismissDone,
    onToggle: toggle,
  });
  const { panelStyle, scrimStyle } = useDetentStyles({
    height,
    mediumHeight: mediumSV,
    largeHeight: largeSV,
    ready,
    enter,
    keyboardHeight: keyboard.height,
    windowHeight,
    topInset: insets.top,
    insetBottom: insets.bottom,
  });

  const isExpanded = phase === 'large';
  // With no room to grow, the expanded block is simply more to scroll to.
  const revealed = isExpanded || (hasExpanded && measured && !canResize);
  const clipTo =
    hasExpanded && !revealed && phase === 'medium' && measured
      ? childrenHeight
      : null;
  const mediumScrolls =
    childrenHeight + CONTENT_BOTTOM_PAD > heights.medium - heights.chrome;

  return (
    <SafelightRoot overlay={false}>
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: '#000000' },
          scrimStyle,
        ]}
      />
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={close}
        disabled={closing}
        accessibilityRole="button"
        accessibilityLabel={`Dismiss ${title}`}
      />
      <Animated.View
        accessibilityViewIsModal
        onAccessibilityEscape={close}
        // Spent once a close or commit is accepted: nothing in it can be pressed.
        pointerEvents={closing ? 'none' : 'auto'}
        className="rounded-t-3xl bg-[#161618]"
        style={[
          { position: 'absolute', left: 0, right: 0, bottom: 0 },
          safelight ? { overflow: 'hidden', isolation: 'isolate' } : null,
          panelStyle,
        ]}
      >
        <GrabStrip
          gesture={canResize ? gestures.strip : gestures.stripPlain}
          stripHeight={stripHeight}
          resizable={
            canResize ? { expanded: isExpanded, onToggle: toggle } : undefined
          }
        />
        <DetentHeader
          gesture={gestures.header}
          title={title}
          cancelLabel={cancelLabel}
          commitLabel={commitLabel}
          commitDisabled={commitDisabled}
          onCancel={close}
          onCommit={commit}
        />
        <DetentContent
          scrollRef={scrollRef}
          contentRef={contentRef}
          keep={keep}
          scrolls={isExpanded || mediumScrolls}
          clipTo={clipTo}
          revealed={revealed}
          expanded={expanded}
          onChildrenHeight={setChildrenHeight}
          onExpandedHeight={setExpandedHeight}
        >
          {children}
        </DetentContent>
        {hasFooter ? (
          <View
            className="gap-2"
            style={{
              paddingHorizontal: SHEET_SIDE_PADDING,
              paddingTop: FOOTER_PAD_TOP,
            }}
            onLayout={(e) =>
              setFooterMeasured(Math.ceil(e.nativeEvent.layout.height))
            }
          >
            {footer}
            {footerCommitLabel !== undefined ? (
              <CommitButton
                label={footerCommitLabel}
                onPress={commit}
                disabled={commitDisabled}
              />
            ) : null}
          </View>
        ) : null}
        {/* The sheet window is transparent, so the overlay lives on the panel. */}
        <SafelightOverlay />
      </Animated.View>
    </SafelightRoot>
  );
}
