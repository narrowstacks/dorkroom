import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef } from 'react';
// PanResponder is intentional here: the scrubber deliberately avoids a react-native-gesture-handler dependency, commits the value live on each stop crossing (one re-render per stop, gated by the haptic tick — the smooth glide rides an Animated.Value the overlay wheel binds to, not React state). Migrating to Gesture.Pan() would be an invasive, behavior-changing rewrite of the gesture/animation pipeline for no functional gain. The type-only Animated import is erased at runtime, so there's no UI-thread animation that reanimated would improve.
/* eslint-disable react-doctor/rn-prefer-reanimated, react-doctor/rn-no-panresponder -- intentional PanResponder + JS Animated pipeline; see note above */
import {
  type Animated,
  PanResponder,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
/* eslint-enable react-doctor/rn-prefer-reanimated, react-doctor/rn-no-panresponder */
import { readoutText as MONO } from '@/theme/tokens';
import { scrubLandingIndex } from './scrub-math';

const SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.85)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 4,
} as const;
const HOLD_TO_SCRUB_MS = 240;
const DRAG_TO_SCRUB_PX = 8;

export interface ScrubOption {
  label: string;
  value: number;
  /** A non-value action (e.g. "Custom") — styled distinctly in the ruler;
   * committing it runs the field's onChange with its sentinel value. */
  action?: boolean;
}

/** A draggable exposure setting: everything {@link MeterReadout} needs to both
 * render a stat and scrub it. `value` is the committed/snapped value the drag
 * starts from; committing during a drag is what locks priority. */
export interface ScrubField {
  caption: string;
  options: ScrubOption[];
  value: number;
  displayLabel: string;
  onChange: (value: number) => void;
  /** Whether dragging up (brighter) moves to a higher option index. ISO is
   * higher-index-brighter; aperture/shutter are lower-index-brighter. */
  brighterIsHigherIndex: boolean;
  locked: boolean;
  calculated: boolean;
  stopError?: number;
  accessibilityLabel: string;
  /** Option value to accent in the scrub wheel (e.g. the roll's rated ISO). */
  highlightValue?: number;
  /** When true, dragging is swallowed and `onBlocked` fires instead of scrubbing. */
  disabled?: boolean;
  onBlocked?: () => void;
}

interface MeterReadoutProps {
  ev: number | null;
  aperture: ScrubField;
  shutter: ScrubField;
  iso: ScrubField;
  outOfRange: boolean;
  /** Live combined drag offset (px, dx − dy) the active scrubber writes to and
   * the overlay ruler reads, so it glides on the native side without re-renders. */
  dragY: Animated.Value;
  /** Fires when a drag begins on a setting (with the starting option index) and
   * ends, so the screen can show/hide the floating wheel above the readout. */
  onScrubStart: (
    target: 'aperture' | 'shutter' | 'iso',
    baseIndex: number
  ) => void;
  onScrubEnd: () => void;
  onTapHint: () => void;
}

/** Formats the snap error in stops: "+0.4" over, "−0.3" under, "✓" if exact. */
function formatStopError(stops: number): { text: string; tone: string } {
  const rounded = Math.round(stops * 10) / 10;
  if (Math.abs(rounded) < 0.05) return { text: '✓', tone: 'text-white/45' };
  const sign = rounded > 0 ? '+' : '−';
  return {
    text: `${sign}${Math.abs(rounded).toFixed(1)}`,
    tone: rounded > 0 ? 'text-amber-400' : 'text-sky-400',
  };
}

/**
 * The static visuals of one exposure setting: caption (+ lock when it's the
 * priority setting), the value (yellow when calculated), a ↕ drag hint, and the
 * snap-error chip. Wrapped by {@link ValueScrubber} for the interactive ones.
 */
function StatBody({
  caption,
  value,
  calculated = false,
  locked = false,
  draggable = false,
  disabled = false,
  stopError,
  style,
}: {
  caption: string;
  value: string;
  calculated?: boolean;
  locked?: boolean;
  draggable?: boolean;
  /** Non-scrubbable (e.g. ISO locked to roll EI) — hides the drag hint. */
  disabled?: boolean;
  stopError?: number;
  style?: ViewStyle;
}) {
  const error = stopError === undefined ? null : formatStopError(stopError);
  // ISO pinned to the roll's EI is the one "hard" lock (non-scrubbable here);
  // flag it so the cell reads as locked — a light-red tint + a lock badge.
  const hardLocked = locked && disabled;
  return (
    <View style={[styles.statCell, style, hardLocked && styles.statCellLocked]}>
      <Text
        style={[MONO, SHADOW, styles.caption]}
        className="uppercase text-white/55"
      >
        {caption}
      </Text>
      <View style={styles.valueLine}>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.72}
          style={[MONO, SHADOW, styles.value]}
          className={
            calculated ? 'font-bold text-yellow-300' : 'font-normal text-white'
          }
        >
          {value}
        </Text>
      </View>
      <Text
        style={[MONO, SHADOW, styles.errorText, !error && styles.hiddenText]}
        className={error?.tone ?? 'text-white/45'}
      >
        {error?.text ?? '+0.0'}
      </Text>
      {/* Bottom-right affordance, clear of the big digits. The lock shows only
          when the value is truly locked and can't be scrubbed here — ISO pinned
          to the roll's EI (unlock via the EI pill). Aperture/shutter are
          "locked" only as the priority axis, which the header already names, and
          stay scrubbable, so they get the ↔ hint instead. */}
      {hardLocked ? (
        <View style={styles.affordanceCenter}>
          <SymbolView
            name="lock.fill"
            size={15}
            tintColor="rgba(255,255,255,0.9)"
          />
        </View>
      ) : null}
      {draggable && !disabled ? (
        <Text
          style={[MONO, SHADOW, styles.dragHint, styles.affordance]}
          className="text-white/45"
        >
          ↔
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Touch-and-hold a setting, then drag to scrub — right *or* up is brighter, so a
 * vertical swipe drives the horizontal ruler too (the axes are combined as
 * dx − dy). The offset is written to `dragY`, which the overlay ruler binds to so
 * it glides continuously between stops rather than snapping; a haptic ticks each
 * time a new stop crosses the center window. The value commits live on each stop
 * crossing and the list loops (no clamp). Because the commit calls
 * {@link ScrubField.onChange}, scrubbing a calculated setting locks it (flips
 * priority) the moment it crosses a stop. Built on the built-in
 * PanResponder + Animated, so no gesture-handler/reanimated dependency is needed.
 */
function ValueScrubber({
  field,
  dragY,
  onScrubStart,
  onScrubEnd,
  onTapHint,
  style,
}: {
  field: ScrubField;
  dragY: Animated.Value;
  onScrubStart: (baseIndex: number) => void;
  onScrubEnd: () => void;
  onTapHint: () => void;
  style?: ViewStyle;
}) {
  const startIndex = useRef(0);
  const lastIndex = useRef(0);
  const scrubbing = useRef(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHoldTimer = () => {
    if (!holdTimer.current) return;
    clearTimeout(holdTimer.current);
    holdTimer.current = null;
  };

  // Gesture logic lives in a ref refreshed every render: it always sees the
  // latest props, and — since the PanResponder below is created once and
  // survives Fast Refresh — this is also what lets edits to the stepping math
  // actually take effect on reload instead of sticking to the first version.
  const controller = useRef({
    prepare() {},
    begin() {},
    move(_g: { dx: number; dy: number }) {},
    end() {},
    cancel() {},
    adjust(_brighter: boolean) {},
  });
  useEffect(() => {
    // eslint-disable-next-line react-doctor/no-event-handler -- not derived state: refreshes the gesture-controller ref each render so the once-created PanResponder (below) always invokes the latest closures and edits land under Fast Refresh; the real events are the PanResponder handlers, this isn't logic that belongs inside them.
    const { options, brighterIsHigherIndex, onChange } = field;
    const len = options.length;
    const dir = brighterIsHigherIndex ? 1 : -1;
    const indexOfValue = () =>
      Math.max(
        0,
        options.findIndex((o) => o.value === field.value)
      );
    // Combine axes so a vertical swipe scrubs the horizontal ruler too: right and
    // up both move toward brighter, so the effective offset is dx − dy.
    const offsetOf = (g: { dx: number; dy: number }) => g.dx - g.dy;
    controller.current = {
      prepare: () => {
        scrubbing.current = false;
        startIndex.current = indexOfValue();
        lastIndex.current = startIndex.current;
        dragY.setValue(0);
      },
      begin: () => {
        if (scrubbing.current) return;
        scrubbing.current = true;
        onScrubStart(startIndex.current);
      },
      move: (g) => {
        if (!scrubbing.current) return;
        const offset = offsetOf(g);
        dragY.setValue(offset);
        const idx = scrubLandingIndex(startIndex.current, offset, len, dir);
        if (idx === lastIndex.current) return;
        lastIndex.current = idx;
        void Haptics.selectionAsync();
        // Commit live on every stop crossing (not just on release) so the field
        // and every dependent readout — the solved aperture/EV — react in real
        // time as the finger moves. The native glide still rides `dragY`; this
        // only re-renders the readout once per stop, gated by the haptic tick.
        // A tap never crosses a stop, so it still can't flip priority. Action
        // options (e.g. ISO "Custom", which opens a sheet) are NOT fired here —
        // that would trigger mid-drag; they commit on release instead.
        const landed = ((idx % len) + len) % len;
        if (!options[landed].action) {
          onChange(options[landed].value);
        }
      },
      end: () => {
        if (!scrubbing.current) return;
        // Value options were already committed live during the drag. An action
        // option (e.g. "Custom") was skipped mid-drag, so fire it now — on
        // release — so its sheet opens only once the finger lifts.
        const landed = ((lastIndex.current % len) + len) % len;
        if (options[landed].action) {
          onChange(options[landed].value);
        }
        scrubbing.current = false;
        onScrubEnd();
      },
      cancel: () => {
        if (!scrubbing.current) return;
        scrubbing.current = false;
        dragY.setValue(0);
        onScrubEnd();
      },
      adjust: (brighter) => {
        const cur = indexOfValue();
        const next = (((cur + (brighter ? dir : -dir)) % len) + len) % len;
        void Haptics.selectionAsync();
        onChange(options[next].value);
      },
    };
  });

  useEffect(
    () => () => {
      clearHoldTimer();
    },
    []
  );

  // A disabled setting (e.g. ISO while locked to the roll's EI) swallows the
  // gesture and prompts instead of scrubbing. Kept in refs the once-created
  // PanResponder reads, so the check happens in the gesture handler itself.
  const disabledRef = useRef(field.disabled);
  disabledRef.current = field.disabled;
  const onBlockedRef = useRef(field.onBlocked);
  onBlockedRef.current = field.onBlocked;
  const onTapHintRef = useRef(onTapHint);
  onTapHintRef.current = onTapHint;

  const panRef = useRef<ReturnType<typeof PanResponder.create>>(null);
  panRef.current ??= PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => {
      if (disabledRef.current) {
        onBlockedRef.current?.();
        return;
      }
      controller.current.prepare();
      clearHoldTimer();
      holdTimer.current = setTimeout(() => {
        holdTimer.current = null;
        controller.current.begin();
      }, HOLD_TO_SCRUB_MS);
    },
    onPanResponderMove: (_e, g) => {
      if (disabledRef.current) return;
      const moved = Math.hypot(g.dx, g.dy);
      if (!scrubbing.current && moved >= DRAG_TO_SCRUB_PX) {
        clearHoldTimer();
        controller.current.begin();
      }
      controller.current.move(g);
    },
    onPanResponderRelease: () => {
      if (disabledRef.current) return;
      clearHoldTimer();
      if (scrubbing.current) {
        controller.current.end();
      } else {
        dragY.setValue(0);
        onTapHintRef.current();
      }
    },
    onPanResponderTerminate: () => {
      if (disabledRef.current) return;
      clearHoldTimer();
      controller.current.cancel();
    },
  });
  const pan = panRef.current;

  return (
    <View
      {...pan.panHandlers}
      hitSlop={8}
      style={[styles.scrubberSlot, style]}
      accessibilityRole="adjustable"
      accessibilityLabel={field.accessibilityLabel}
      accessibilityValue={{ text: field.displayLabel }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        if (disabledRef.current) {
          onBlockedRef.current?.();
          return;
        }
        controller.current.adjust(e.nativeEvent.actionName === 'increment');
      }}
    >
      <StatBody
        caption={field.caption}
        value={field.displayLabel}
        calculated={field.calculated}
        locked={field.locked}
        draggable
        disabled={field.disabled}
        stopError={field.stopError}
      />
    </View>
  );
}

/**
 * The metered result strip and the meter's control surface: scene EV (display
 * only) plus drag-to-scrub aperture / shutter / ISO. Dragging aperture or
 * shutter locks it (sets priority); the calculated one stays yellow.
 */
export function MeterReadout({
  ev,
  aperture,
  shutter,
  iso,
  outOfRange,
  dragY,
  onScrubStart,
  onScrubEnd,
  onTapHint,
}: MeterReadoutProps) {
  const evLabel = ev === null ? '——' : ev.toFixed(1);
  // Name the active exposure priority (the axis the user fixed) so flipping it —
  // including live while scrubbing — is never silent. Exactly one of aperture /
  // shutter is the locked priority; the other is the solved (yellow) value.
  const priorityLabel = aperture.locked
    ? 'Aperture priority'
    : shutter.locked
      ? 'Shutter priority'
      : null;

  return (
    <View style={{ gap: 8 }}>
      {priorityLabel ? (
        <Text
          style={[MONO, SHADOW, styles.priorityLabel]}
          className="uppercase text-white/55"
        >
          {priorityLabel}
        </Text>
      ) : null}
      <View style={styles.row}>
        <StatBody caption="EV" value={evLabel} style={styles.evCell} />
        <ValueScrubber
          field={aperture}
          dragY={dragY}
          onScrubStart={(i) => onScrubStart('aperture', i)}
          onScrubEnd={onScrubEnd}
          onTapHint={onTapHint}
        />
        <ValueScrubber
          field={shutter}
          dragY={dragY}
          onScrubStart={(i) => onScrubStart('shutter', i)}
          onScrubEnd={onScrubEnd}
          onTapHint={onTapHint}
          style={styles.shutterSlot}
        />
        <ValueScrubber
          field={iso}
          dragY={dragY}
          onScrubStart={(i) => onScrubStart('iso', i)}
          onScrubEnd={onScrubEnd}
          onTapHint={onTapHint}
        />
      </View>
      {outOfRange ? (
        <Text
          style={[MONO, SHADOW]}
          className="text-center text-xs text-amber-400"
        >
          out of range (1/8000s–30s)
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  priorityLabel: {
    alignSelf: 'center',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.6,
  },
  statCell: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minHeight: 78,
    paddingHorizontal: 4,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255,255,255,0.055)',
  },
  statCellLocked: {
    backgroundColor: 'rgba(244,63,94,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(244,63,94,0.45)',
  },
  scrubberSlot: {
    flex: 1,
    minWidth: 0,
  },
  evCell: {
    flex: 0.78,
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  shutterSlot: { flex: 1.34 },
  caption: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.8,
  },
  value: {
    alignSelf: 'center',
    // Small gutter so the longest strings (f/64, 1/4000) never touch the cell
    // border; the ↔ drag hint lives in the caption row now, clear of the digits.
    maxWidth: '92%',
    fontSize: 28,
    lineHeight: 32,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  valueLine: {
    position: 'relative',
    alignSelf: 'stretch',
    minHeight: 34,
    justifyContent: 'center',
  },
  dragHint: {
    fontSize: 12,
    lineHeight: 14,
  },
  affordance: {
    position: 'absolute',
    right: 6,
    bottom: 4,
  },
  affordanceCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 4,
    alignItems: 'center',
  },
  errorText: {
    alignSelf: 'center',
    fontSize: 13,
    lineHeight: 15,
    fontVariant: ['tabular-nums'],
  },
  hiddenText: { opacity: 0 },
});
