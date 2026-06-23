import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef } from 'react';
// PanResponder is intentional here: the scrubber deliberately avoids a react-native-gesture-handler dependency, commits the value only on release (no React re-renders during the drag), and writes the live offset to an Animated.Value the overlay wheel binds to for a smooth glide. Migrating to Gesture.Pan() would be an invasive, behavior-changing rewrite of the gesture/animation pipeline for no functional gain. The type-only Animated import is erased at runtime, so there's no UI-thread animation that reanimated would improve.
// eslint-disable-next-line react-doctor/rn-prefer-reanimated, react-doctor/rn-no-panresponder
import { type Animated, PanResponder, Text, View } from 'react-native';
import { SCRUB_ROW_HEIGHT } from './scrub-overlay';

const MONO = { fontFamily: 'Menlo' } as const;
const SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.85)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 4,
} as const;

export interface ScrubOption {
  label: string;
  value: number;
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
}

interface MeterReadoutProps {
  ev: number | null;
  aperture: ScrubField;
  shutter: ScrubField;
  iso: ScrubField;
  outOfRange: boolean;
  /** Live drag offset (px) the active scrubber writes to and the overlay wheel
   * reads, so the wheel glides on the native side without React re-renders. */
  dragY: Animated.Value;
  /** Fires when a drag begins on a setting (with the starting option index) and
   * ends, so the screen can show/hide the floating wheel above the readout. */
  onScrubStart: (
    target: 'aperture' | 'shutter' | 'iso',
    baseIndex: number
  ) => void;
  onScrubEnd: () => void;
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
  stopError,
}: {
  caption: string;
  value: string;
  calculated?: boolean;
  locked?: boolean;
  draggable?: boolean;
  stopError?: number;
}) {
  const error = stopError === undefined ? null : formatStopError(stopError);
  return (
    <View className="items-center" style={{ gap: 3 }}>
      <View className="flex-row items-center" style={{ gap: 4 }}>
        <Text
          style={[MONO, SHADOW]}
          className="text-xs uppercase tracking-widest text-white/55"
        >
          {caption}
        </Text>
        {locked ? (
          <SymbolView
            name="lock.fill"
            size={12}
            tintColor="rgba(255,255,255,0.75)"
          />
        ) : null}
      </View>
      <View className="flex-row items-baseline" style={{ gap: 3 }}>
        <Text
          style={[MONO, SHADOW]}
          className={
            calculated
              ? 'text-2xl font-bold text-yellow-300'
              : 'text-2xl font-normal text-white'
          }
        >
          {value}
        </Text>
        {draggable ? (
          <Text style={[MONO, SHADOW]} className="text-xs text-white/50">
            ↕
          </Text>
        ) : null}
        {error ? (
          <Text style={[MONO, SHADOW]} className={`text-sm ${error.tone}`}>
            {error.text}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/**
 * Touch-and-hold a setting, then drag up (brighter) or down (darker) to scrub.
 * The drag offset is written to `dragY`, which the overlay wheel binds to so it
 * glides continuously between stops rather than snapping; a haptic ticks each
 * time a new stop crosses center. The value commits on release — and the list
 * wraps, so dragging past either end is functionally infinite. Because the
 * commit calls {@link ScrubField.onChange}, scrubbing a calculated setting locks
 * it (flips priority). Built on the built-in PanResponder + Animated, so no
 * gesture-handler/reanimated dependency is needed.
 */
function ValueScrubber({
  field,
  dragY,
  onScrubStart,
  onScrubEnd,
}: {
  field: ScrubField;
  dragY: Animated.Value;
  onScrubStart: (baseIndex: number) => void;
  onScrubEnd: () => void;
}) {
  const startIndex = useRef(0);
  const lastIndex = useRef(0);

  // Gesture logic lives in a ref refreshed every render: it always sees the
  // latest props, and — since the PanResponder below is created once and
  // survives Fast Refresh — this is also what lets edits to the stepping math
  // actually take effect on reload instead of sticking to the first version.
  const controller = useRef({
    grant() {},
    move(_g: { dy: number }) {},
    end() {},
    adjust(_brighter: boolean) {},
  });
  useEffect(() => {
    const { options, brighterIsHigherIndex, onChange } = field;
    const len = options.length;
    const dir = brighterIsHigherIndex ? 1 : -1;
    const indexOfValue = () =>
      Math.max(
        0,
        options.findIndex((o) => o.value === field.value)
      );
    // Continuous centered index for a given drag offset; up (negative dy) is
    // brighter. The wheel reads dragY directly for the smooth glide; here we
    // only round it to detect stop crossings and the final landing index.
    const indexAt = (dy: number) =>
      Math.round(startIndex.current - (dy * dir) / SCRUB_ROW_HEIGHT);
    controller.current = {
      grant: () => {
        startIndex.current = indexOfValue();
        lastIndex.current = startIndex.current;
        dragY.setValue(0);
        onScrubStart(startIndex.current);
      },
      move: (g) => {
        dragY.setValue(g.dy);
        const idx = indexAt(g.dy);
        if (idx === lastIndex.current) return;
        lastIndex.current = idx;
        void Haptics.selectionAsync();
      },
      end: () => {
        // Commit the landed value (wrapped) only if it actually moved, so a tap
        // doesn't flip priority on a calculated setting.
        if (lastIndex.current !== startIndex.current) {
          const wrapped = ((lastIndex.current % len) + len) % len;
          onChange(options[wrapped].value);
        }
        onScrubEnd();
      },
      adjust: (brighter) => {
        const cur = indexOfValue();
        const wrapped = (((cur + (brighter ? dir : -dir)) % len) + len) % len;
        void Haptics.selectionAsync();
        onChange(options[wrapped].value);
      },
    };
  });

  const panRef = useRef<ReturnType<typeof PanResponder.create>>(null);
  panRef.current ??= PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => controller.current.grant(),
    onPanResponderMove: (_e, g) => controller.current.move(g),
    onPanResponderRelease: () => controller.current.end(),
    onPanResponderTerminate: () => controller.current.end(),
  });
  const pan = panRef.current;

  return (
    <View
      {...pan.panHandlers}
      hitSlop={8}
      accessibilityRole="adjustable"
      accessibilityLabel={field.accessibilityLabel}
      accessibilityValue={{ text: field.displayLabel }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) =>
        controller.current.adjust(e.nativeEvent.actionName === 'increment')
      }
    >
      <StatBody
        caption={field.caption}
        value={field.displayLabel}
        calculated={field.calculated}
        locked={field.locked}
        draggable
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
}: MeterReadoutProps) {
  const evLabel = ev === null ? '——' : ev.toFixed(1);

  return (
    <View style={{ gap: 4 }}>
      <View className="flex-row items-end justify-between">
        <StatBody caption="EV" value={evLabel} />
        <ValueScrubber
          field={aperture}
          dragY={dragY}
          onScrubStart={(i) => onScrubStart('aperture', i)}
          onScrubEnd={onScrubEnd}
        />
        <ValueScrubber
          field={shutter}
          dragY={dragY}
          onScrubStart={(i) => onScrubStart('shutter', i)}
          onScrubEnd={onScrubEnd}
        />
        <ValueScrubber
          field={iso}
          dragY={dragY}
          onScrubStart={(i) => onScrubStart('iso', i)}
          onScrubEnd={onScrubEnd}
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
