import * as Haptics from 'expo-haptics';
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
  cancelAnimation,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import {
  type ActRulerEvent,
  createRulerState,
  type RulerConfig,
  rulerReduce,
  type RulerState,
  type SyncRulerEvent,
} from '@/components/scrub/ruler-machine';
import {
  effectiveDx,
  SCRUB_PX_PER_STEP,
  SCRUB_SLOP,
  stepsFromTranslation,
} from '@/components/scrub/scrub-value';

/** What the ticks depend on; changes only on a new origin or window, never
 * per drag frame, and an echo of the row's own write cannot change it. */
interface RulerView {
  originSeq: number;
  origin: number;
  windowLo: number;
  windowHi: number;
}

const viewOf = (s: RulerState): RulerView => ({
  originSeq: s.originSeq,
  origin: s.origin,
  windowLo: s.windowLo,
  windowHi: s.windowHi,
});

const sameView = (v: RulerView, s: RulerState): boolean =>
  v.originSeq === s.originSeq &&
  v.origin === s.origin &&
  v.windowLo === s.windowLo &&
  v.windowHi === s.windowHi;

/** A one-value store, so the machine can publish a new view without the row
 * mirroring it into state. */
interface ViewStore {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => RulerView;
  publish: (state: RulerState) => void;
}

function createViewStore(initial: RulerState): ViewStore {
  let view = viewOf(initial);
  const listeners = new Set<() => void>();
  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => view,
    publish: (state) => {
      if (sameView(view, state)) return;
      view = viewOf(state);
      for (const listener of listeners) listener();
    },
  };
}

const SETTLE_MS = 120;

const panGesture = () => Gesture.Pan();
const tapGesture = () => Gesture.Tap();
const exclusiveGesture = (...gestures: Parameters<typeof Gesture.Exclusive>) =>
  Gesture.Exclusive(...gestures);

interface UseScrubMachineInput {
  /** The hook's raw string for this field. */
  value: string;
  config: RulerConfig;
  onChangeText: (text: string) => void;
  editing: boolean;
  onTap: () => void;
}

/**
 * Runs a `ScrubRow`'s ruler: the reducer, the UI-thread pan, and the shared
 * translate. The pan moves one shared translate every frame and tells JS only
 * when the whole-step count changes (once per 10px), and JS then writes the
 * text. Outside changes (`sync`) and user events (`act`) are separate paths,
 * so only the latter can write.
 */
export function useScrubMachine({
  value,
  config,
  onChangeText,
  editing,
  onTap,
}: UseScrubMachineInput) {
  const [initial] = useState(() => createRulerState(value, config));
  const [store] = useState(() => createViewStore(initial));
  const view = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const machine = useRef<RulerState>(initial);
  const latest = useRef({ config, onChangeText, value });
  useLayoutEffect(() => {
    latest.current = { config, onChangeText, value };
  });

  // UI-thread state. `offset` is the live line, `restOffset` where it rests,
  // `minOffset`..`maxOffset` how far a drag may take it.
  const offset = useSharedValue(initial.translate);
  const restOffset = useSharedValue(initial.translate);
  const minOffset = useSharedValue(initial.minTranslate);
  const maxOffset = useSharedValue(initial.maxTranslate);
  const dragStart = useSharedValue(0);
  const lastSteps = useSharedValue(0);
  const lastDx = useSharedValue(0);
  // Effective finger travel, and how much of it a restarted drag has
  // already spent (the reducer's dx counts from there).
  const travel = useSharedValue(0);
  const dxBase = useSharedValue(0);
  // The sign of the movement that activated the pan, 0 until known.
  const dragDir = useSharedValue(0);
  const dragLive = useSharedValue(false);
  const dragId = useSharedValue(0);
  // The drag the machine has a session for; callbacks from any other are stale.
  const sessionId = useRef(0);
  const frame = useRef(0);
  useLayoutEffect(() => () => cancelAnimationFrame(frame.current), []);

  const publish = useCallback(
    (prev: RulerState, next: RulerState) => {
      machine.current = next;
      if (next.minTranslate !== prev.minTranslate) {
        minOffset.value = next.minTranslate;
      }
      if (next.maxTranslate !== prev.maxTranslate) {
        maxOffset.value = next.maxTranslate;
      }
      store.publish(next);
    },
    [minOffset, maxOffset, store]
  );

  // Sends the line to a rest position: eased, or snapped.
  const rest = useCallback(
    (translate: number, ease: boolean) => {
      restOffset.value = translate;
      offset.value = ease
        ? withTiming(translate, { duration: SETTLE_MS })
        : translate;
    },
    [offset, restOffset]
  );

  // A change from outside the row (typing, a preset, a ladder tap, a prefill,
  // a new step or bounds, a measured width). Never writes.
  const sync = useCallback(
    (event: SyncRulerEvent, using: RulerConfig) => {
      const prev = machine.current;
      const next = rulerReduce(prev, event, using);
      publish(prev, next);
      if (prev.session && next.session && next.translate !== prev.translate) {
        // The drag restarted from a new value: the line follows, and the
        // finger's travel now counts from there.
        dragStart.value = next.translate;
        dxBase.value = travel.value;
        lastSteps.value = 0;
        lastDx.value = 0;
        restOffset.value = next.translate;
        offset.value = next.translate;
        return;
      }
      if (prev.session && !next.session) {
        // The finger is still down: ignore it until the next pan starts, and
        // put the line at rest so it is never stranded where the drag left it.
        sessionId.current = 0;
        dragLive.value = false;
        rest(next.translate, true);
        return;
      }
      if (
        next.originSeq === prev.originSeq &&
        next.translate === prev.translate
      ) {
        return;
      }
      const position = -next.translate / SCRUB_PX_PER_STEP;
      const inWindow =
        next.originSeq === prev.originSeq &&
        position >= prev.windowLo &&
        position <= prev.windowHi;
      rest(next.translate, inWindow);
    },
    [
      publish,
      rest,
      dragLive,
      dragStart,
      dxBase,
      travel,
      lastSteps,
      lastDx,
      restOffset,
      offset,
    ]
  );

  // A user event. May write the text and tick the haptic.
  const act = useCallback(
    (event: ActRulerEvent): RulerState => {
      const { config: current, onChangeText: write } = latest.current;
      const prev = machine.current;
      const next = rulerReduce(prev, event, current);
      publish(prev, next);
      if (next.write !== null) {
        write(next.write);
        Haptics.selectionAsync();
      }
      return next;
    },
    [publish]
  );

  // Fed in a layout effect so the machine is current before paint.
  useLayoutEffect(() => {
    sync({ type: 'external', text: value }, config);
    sync({ type: 'config' }, config);
    sync({ type: 'layout' }, config);
  }, [value, config, sync]);

  const onDragStart = useCallback(
    (id: number) => {
      sessionId.current = id;
      act({ type: 'start' });
      // The session starts from the machine's rest, which can differ from
      // what the UI thread captured if something landed in between. The next
      // update recomputes the line from this, so there is no separate snap.
      dragStart.value = machine.current.translate;
    },
    [act, dragStart]
  );
  const onDragMove = useCallback(
    (id: number, dx: number) => {
      if (id !== sessionId.current) return;
      act({ type: 'move', dx });
    },
    [act]
  );
  const onDragEnd = useCallback(
    (id: number, dx: number) => {
      if (id !== sessionId.current) return;
      sessionId.current = 0;
      // The final move and the end share one dx on one thread, so the rest
      // position and the written text always agree.
      act({ type: 'move', dx });
      const { translate } = act({ type: 'end' });
      if (dragId.value !== id) {
        // A newer pan already began on the UI thread: it owns the line, so
        // only record where this one rests.
        restOffset.value = translate;
        return;
      }
      rest(translate, true);
      // An outside change swallowed during the drag (a preset tapped with a
      // second finger can look like an echo) is corrected here, one frame
      // later so the row's own echo has had its render.
      frame.current = requestAnimationFrame(() => {
        const { value: latestValue, config: current } = latest.current;
        if (latestValue !== machine.current.text) {
          sync({ type: 'external', text: latestValue }, current);
        }
      });
    },
    [act, rest, dragId, restOffset, sync]
  );

  const gesture = useMemo(() => {
    const pan = panGesture()
      .enabled(!editing)
      // Sideways only: a mostly vertical move stays a scroll of the screen.
      .activeOffsetX([-SCRUB_SLOP, SCRUB_SLOP])
      .failOffsetY([-12, 12])
      .onStart((event) => {
        'worklet';
        dragDir.value = Math.sign(event.velocityX);
        cancelAnimation(offset);
        dragStart.value = restOffset.value;
        lastSteps.value = 0;
        lastDx.value = 0;
        travel.value = 0;
        dxBase.value = 0;
        dragId.value += 1;
        dragLive.value = true;
        scheduleOnRN(onDragStart, dragId.value);
      })
      .onUpdate((event) => {
        'worklet';
        if (!dragLive.value) return;
        // The strip follows from recognition with no dead zone; the finger
        // back where it went down still restores the value.
        // The translation starts at 0 at recognition (iOS). Take the
        // direction from the first movement if the velocity gave none.
        if (dragDir.value === 0) dragDir.value = Math.sign(event.translationX);
        travel.value = effectiveDx(event.translationX, dragDir.value);
        const dx = travel.value - dxBase.value;
        lastDx.value = dx;
        offset.value = Math.min(
          maxOffset.value,
          Math.max(minOffset.value, dragStart.value + dx)
        );
        const steps = stepsFromTranslation(dx);
        if (steps !== lastSteps.value) {
          lastSteps.value = steps;
          scheduleOnRN(onDragMove, dragId.value, dx);
        }
      })
      .onFinalize(() => {
        'worklet';
        if (!dragLive.value) return;
        dragLive.value = false;
        // A provisional rest, in case the next pan starts before JS has
        // handled this end.
        restOffset.value = offset.value;
        scheduleOnRN(onDragEnd, dragId.value, lastDx.value);
      });
    // A recognised pan can never also be a tap.
    const tap = tapGesture()
      .runOnJS(true)
      .enabled(!editing)
      .maxDistance(SCRUB_SLOP)
      .onEnd((_event, success) => {
        if (success) onTap();
      });
    return exclusiveGesture(pan, tap);
  }, [
    editing,
    offset,
    restOffset,
    minOffset,
    maxOffset,
    dragStart,
    lastSteps,
    lastDx,
    travel,
    dxBase,
    dragDir,
    dragLive,
    dragId,
    onTap,
    onDragStart,
    onDragMove,
    onDragEnd,
  ]);

  const nudge = (direction: 1 | -1) => {
    rest(act({ type: 'nudge', direction }).translate, true);
  };

  return { view, offset, gesture, nudge };
}
