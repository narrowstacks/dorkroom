import { useMemo } from 'react';
import {
  cancelAnimation,
  type SharedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import {
  beganAtLargeWithKeyboard,
  draggedHeight,
  dragStartHeight,
  keyboardCeiling,
  releaseOutcome,
} from '@/components/detent-sheet/detent-sheet-layout';
import {
  exclusiveGesture,
  panGesture,
  tapGesture,
} from '@/components/stage/gestures';

export const DETENT_SPRING = { damping: 30, stiffness: 320, mass: 1 } as const;
const DISMISS_MS = 160;
/** `owner` while no drag holds the sheet. */
const NO_OWNER = -1;
const STRIP_SLOT = 0;
const HEADER_SLOT = 1;

interface DetentGesturesInput {
  /** The one shared height every drag and spring moves. */
  height: SharedValue<number>;
  startHeight: SharedValue<number>;
  mediumHeight: SharedValue<number>;
  largeHeight: SharedValue<number>;
  dragging: SharedValue<boolean>;
  /** Which detent the sheet is heading for (true is large). */
  targetLarge: SharedValue<boolean>;
  /** True while a detent spring (or a retarget of it) is under way. */
  moving: SharedValue<boolean>;
  /** True from the moment a dismissal or a commit is accepted. */
  closing: SharedValue<boolean>;
  keyboardHeight: SharedValue<number>;
  windowHeight: number;
  topInset: number;
  /** A drag began: the expanded block must show as it rises. */
  onUnclip: () => void;
  /** A release settled on a detent. */
  onSettle: (next: boolean) => void;
  /** The spring reached its detent. */
  onArrived: (next: boolean) => void;
  /** A release dismissed the sheet: latch it before the slide-out runs. */
  onDismissStart: () => void;
  /** The slide-out finished: tell the owner to close. */
  onDismissDone: () => void;
  onToggle: () => void;
}

/**
 * The sheet's gestures. The strip and the header each have a pan, and a tap on
 * the strip toggles. One `owner` value lets a single pan drive the height at a
 * time: a second finger on the other region sees it taken and does nothing, and
 * only the owner's end clears `dragging`. Pans never start once `closing` is set.
 */
export function useDetentGestures(input: DetentGesturesInput) {
  const {
    height,
    startHeight,
    mediumHeight,
    largeHeight,
    dragging,
    targetLarge,
    moving,
    closing,
    keyboardHeight,
    windowHeight,
    topInset,
    onUnclip,
    onSettle,
    onArrived,
    onDismissStart,
    onDismissDone,
    onToggle,
  } = input;
  const owner = useSharedValue(NO_OWNER);
  const guardDismiss = useSharedValue(false);

  return useMemo(() => {
    const pan = (slot: number) =>
      panGesture()
        .maxPointers(1)
        .activeOffsetY([-8, 8])
        .failOffsetX([-30, 30])
        .onStart(() => {
          'worklet';
          if (closing.value || owner.value !== NO_OWNER) return;
          owner.value = slot;
          cancelAnimation(height);
          moving.value = false;
          dragging.value = true;
          // From the held height, before it is clamped to what is drawn.
          guardDismiss.value = beganAtLargeWithKeyboard({
            keyboardHeight: keyboardHeight.value,
            heldHeight: height.value,
            mediumHeight: mediumHeight.value,
          });
          // The drag counts from what is drawn: with the keyboard up the held
          // height can be taller than the capped panel (a dead zone otherwise).
          startHeight.value = dragStartHeight({
            height: height.value,
            mediumHeight: mediumHeight.value,
            ceiling: keyboardCeiling(
              windowHeight,
              topInset,
              keyboardHeight.value
            ),
          });
          height.value = startHeight.value;
          if (largeHeight.value > mediumHeight.value) scheduleOnRN(onUnclip);
        })
        .onUpdate((event) => {
          'worklet';
          if (owner.value !== slot) return;
          height.value = draggedHeight(
            startHeight.value,
            event.translationY,
            largeHeight.value
          );
        })
        .onEnd((event) => {
          'worklet';
          if (owner.value !== slot) return;
          if (closing.value) {
            // A commit or cancel took the sheet mid-drag: settle where it was
            // heading and take no outcome of this release.
            height.value = withSpring(
              targetLarge.value ? largeHeight.value : mediumHeight.value,
              DETENT_SPRING
            );
            return;
          }
          const outcome = releaseOutcome({
            height: height.value,
            startHeight: startHeight.value,
            velocityY: event.velocityY,
            mediumHeight: mediumHeight.value,
            largeHeight: largeHeight.value,
            guardDismiss: guardDismiss.value,
          });
          if (outcome === 'dismiss') {
            closing.value = true;
            scheduleOnRN(onDismissStart);
            height.value = withTiming(
              0,
              { duration: DISMISS_MS },
              (finished) => {
                'worklet';
                if (finished) scheduleOnRN(onDismissDone);
              }
            );
            return;
          }
          const next = outcome === 'large';
          targetLarge.value = next;
          moving.value = true;
          height.value = withSpring(
            next ? largeHeight.value : mediumHeight.value,
            DETENT_SPRING,
            (finished) => {
              'worklet';
              if (finished) {
                moving.value = false;
                scheduleOnRN(onArrived, next);
              }
            }
          );
          scheduleOnRN(onSettle, next);
        })
        .onFinalize(() => {
          'worklet';
          if (owner.value !== slot) return;
          owner.value = NO_OWNER;
          dragging.value = false;
        });
    return {
      strip: exclusiveGesture(
        pan(STRIP_SLOT),
        tapGesture()
          .runOnJS(true)
          .maxDistance(8)
          .onEnd((_event, success) => {
            if (success) onToggle();
          })
      ),
      stripPlain: pan(STRIP_SLOT),
      header: pan(HEADER_SLOT),
    };
  }, [
    height,
    startHeight,
    mediumHeight,
    largeHeight,
    dragging,
    targetLarge,
    moving,
    closing,
    keyboardHeight,
    windowHeight,
    topInset,
    owner,
    guardDismiss,
    onUnclip,
    onSettle,
    onArrived,
    onDismissStart,
    onDismissDone,
    onToggle,
  ]);
}
