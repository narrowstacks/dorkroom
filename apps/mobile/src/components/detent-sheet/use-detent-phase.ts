import * as Haptics from 'expo-haptics';
import {
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Keyboard, type ScrollView } from 'react-native';
import { type SharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import {
  EXPANDED_GAP,
  shouldExpandOnSignal,
  unmovedAction,
} from '@/components/detent-sheet/detent-sheet-layout';
import { DETENT_SPRING } from '@/components/detent-sheet/use-detent-gestures';
import type { useKeepFieldVisible } from '@/components/stage/use-keep-field-visible';

/**
 * Where the sheet is: at medium (content clipped to the medium block), rising
 * under a drag, at large, or on its way back to medium (the content stays
 * unclipped until the spring has finished, so the scroll can reach the top).
 */
export type Phase = 'medium' | 'rising' | 'large' | 'collapsing';

interface DetentPhaseInput {
  expandSignal: number | undefined;
  canResize: boolean;
  hasExpanded: boolean;
  childrenHeight: number;
  /** A close or commit was accepted: nothing moves any more. */
  closing: boolean;
  isLatched: () => boolean;
  /** Told each time the sheet comes to rest, or was asked to move and could not. */
  onSettled?: (expanded: boolean) => void;
  scrollRef: RefObject<ScrollView | null>;
  keep: ReturnType<typeof useKeepFieldVisible>;
  height: SharedValue<number>;
  mediumHeight: SharedValue<number>;
  largeHeight: SharedValue<number>;
  targetLarge: SharedValue<boolean>;
  /** True while a detent spring (or a retarget of it) is under way. */
  moving: SharedValue<boolean>;
  closingSV: SharedValue<boolean>;
}

/**
 * The sheet's phase and what follows from it: the spring toward the detent a
 * phase names (unless a release already started it), the haptic, the collapse
 * side effects (only when leaving large), the expand signal, and `arrived`,
 * which every spring ends in.
 */
export function useDetentPhase({
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
  mediumHeight,
  largeHeight,
  targetLarge,
  moving,
  closingSV,
}: DetentPhaseInput) {
  const [phase, setPhase] = useState<Phase>('medium');
  const previousPhase = useRef<Phase>('medium');
  const settledProp = useRef(onSettled);
  useLayoutEffect(() => {
    settledProp.current = onSettled;
  });

  // A new expand signal moves a sheet that can resize to large. Adjusted while
  // rendering, from the previous signal kept in state, as React advises. When
  // it cannot move (one detent, or already large) the caller is still told
  // where the sheet rests, so a request waiting on the move is not left waiting.
  const [seenSignal, setSeenSignal] = useState(expandSignal);
  const [unmoved, setUnmoved] = useState<{
    expanded: boolean;
    scrollTo: number | null;
  } | null>(null);
  if (seenSignal !== expandSignal) {
    setSeenSignal(expandSignal);
    const atLarge = phase === 'large';
    if (!closing) {
      if (shouldExpandOnSignal({ canResize, expanded: atLarge })) {
        setPhase('large');
      } else {
        // With no room to grow the expanded block is simply more to scroll to.
        const scrollsToIt = hasExpanded && !canResize;
        setUnmoved({
          expanded: atLarge || scrollsToIt,
          scrollTo: scrollsToIt ? childrenHeight + EXPANDED_GAP : null,
        });
      }
    }
  }

  const arrived = useCallback((next: boolean) => {
    if (!next) setPhase((p) => (p === 'large' ? p : 'medium'));
    settledProp.current?.(next);
  }, []);
  const unclip = useCallback(
    () => setPhase((p) => (p === 'medium' ? 'rising' : p)),
    []
  );
  const settle = useCallback(
    (next: boolean) => setPhase(next ? 'large' : 'collapsing'),
    []
  );
  const toggle = useCallback(() => {
    if (isLatched() || largeHeight.value <= mediumHeight.value) return;
    setPhase((p) => (p === 'large' ? 'collapsing' : 'large'));
  }, [isLatched, largeHeight, mediumHeight]);

  // The phase drives the spring, unless a release already started it (it set
  // `targetLarge`). Moving between detents is felt; leaving large drops the
  // keyboard and returns the scroll to the top, but a nudge from medium that
  // settles back at medium does neither.
  useEffect(() => {
    const wasLarge = previousPhase.current === 'large';
    previousPhase.current = phase;
    if (phase === 'medium' || phase === 'rising') return;
    const toLarge = phase === 'large';
    if (toLarge !== wasLarge) Haptics.selectionAsync();
    if (!toLarge && wasLarge) {
      // A focused field is about to be clipped away: drop the keyboard with it.
      Keyboard.dismiss();
      // Back to the top as the sheet shrinks, so the medium block is what shows.
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      keep.resetScroll();
    }
    if (targetLarge.value === toLarge || closingSV.value) return;
    targetLarge.value = toLarge;
    moving.value = true;
    height.value = withSpring(
      toLarge ? largeHeight.value : mediumHeight.value,
      DETENT_SPRING,
      (finished) => {
        'worklet';
        if (finished) {
          moving.value = false;
          scheduleOnRN(arrived, toLarge);
        }
      }
    );
  }, [
    phase,
    scrollRef,
    keep,
    targetLarge,
    moving,
    closingSV,
    height,
    largeHeight,
    mediumHeight,
    arrived,
  ]);

  // A signal that could not move the sheet: scroll to the expanded block when
  // that is the way to reach it, and report where the sheet rests unless a
  // spring is running (it reports its own arrival) or the sheet is closing.
  useEffect(() => {
    if (!unmoved) return;
    if (unmoved.scrollTo !== null) {
      scrollRef.current?.scrollTo({ y: unmoved.scrollTo, animated: true });
    }
    const action = unmovedAction({
      closing: closingSV.value,
      moving: moving.value,
    });
    if (action === 'report') arrived(unmoved.expanded);
  }, [unmoved, scrollRef, closingSV, moving, arrived]);

  return { phase, arrived, unclip, settle, toggle };
}
