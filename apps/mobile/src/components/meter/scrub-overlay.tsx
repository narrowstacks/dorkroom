import { LinearGradient } from 'expo-linear-gradient';
import { useRef } from 'react';
// eslint-disable-next-line react-doctor/rn-prefer-reanimated -- JS-thread Animated is intentional: the drag is a JS-thread PanResponder (no gesture-handler) and reanimated's worklet babel plugin isn't wired up; the wheel commits on release so there are no React re-renders during the drag, keeping the glide smooth.
import { Animated, Text, View } from 'react-native';
import { BlurPanel } from './blur-panel';
import type { ScrubField } from './meter-readout';

/** Creates the stable drag-offset value shared between the active scrubber
 * (writer) and the overlay wheel (reader). Lives here so the screen needn't
 * import Animated directly. */
export function useDragOffset() {
  const ref = useRef<Animated.Value>(null);
  ref.current ??= new Animated.Value(0);
  return ref.current;
}

const MONO = { fontFamily: 'Menlo' } as const;
const SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.85)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 4,
} as const;

/** Row height (px) — also the finger distance that advances one stop, so the
 * wheel tracks the drag 1:1. Shared with the scrubber's step math. */
export const SCRUB_ROW_HEIGHT = 36;
const VISIBLE_ROWS = 5;
const WHEEL_WIDTH = 132;
// Matches the dark blur panel so edge rows fade out instead of hard-truncating.
const FADE_COLOR = 'rgba(11,11,12,0.95)';

/**
 * The transient wheel shown above the readout while a setting is dragged. The
 * column of stops glides continuously with the finger — `dragY` (the live drag
 * offset in px) drives `translateY`, so motion is smooth rather than snapping —
 * and three stacked copies + `Animated.modulo` make it wrap infinitely. Up is
 * brighter. The centered value is committed on release by the scrubber.
 */
export function ScrubOverlay({
  field,
  baseIndex,
  dragY,
}: {
  field: ScrubField;
  baseIndex: number;
  dragY: Animated.Value;
}) {
  const { options, brighterIsHigherIndex, caption } = field;
  const len = options.length;
  const dir = brighterIsHigherIndex ? 1 : -1;
  const period = len * SCRUB_ROW_HEIGHT;
  const wheelHeight = SCRUB_ROW_HEIGHT * VISIBLE_ROWS;
  const bandTop = (wheelHeight - SCRUB_ROW_HEIGHT) / 2;

  // scroll(px): how far the conceptual list has moved; the value at index
  // scroll/ROW sits at the center band. Wrap with modulo over one list-height
  // and render the list 3× so the seam is never visible.
  const scroll = Animated.subtract(
    baseIndex * SCRUB_ROW_HEIGHT,
    Animated.multiply(dragY, dir)
  );
  const translateY = Animated.subtract(
    bandTop - period,
    Animated.modulo(scroll, period)
  );

  return (
    <BlurPanel
      style={{ alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 18 }}
    >
      <Text
        style={[MONO, SHADOW]}
        className="pb-1 text-center text-xs uppercase tracking-widest text-white/55"
      >
        {caption}
      </Text>
      <View
        style={{ height: wheelHeight, width: WHEEL_WIDTH, overflow: 'hidden' }}
      >
        {/* Fixed center selection band. */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: bandTop,
            height: SCRUB_ROW_HEIGHT,
            left: 0,
            right: 0,
          }}
          className="rounded-md border border-rose-500/70 bg-rose-500/15"
        />
        <Animated.View style={{ transform: [{ translateY }] }}>
          {[0, 1, 2].map((copy) =>
            options.map((option) => (
              <View
                key={`${copy}-${option.value}`}
                style={{ height: SCRUB_ROW_HEIGHT }}
                className="items-center justify-center"
              >
                <Text style={[MONO, SHADOW]} className="text-lg text-white">
                  {option.label}
                </Text>
              </View>
            ))
          )}
        </Animated.View>
        {/* Fade the top/bottom rows into the panel, iOS-picker style. */}
        <LinearGradient
          pointerEvents="none"
          colors={[FADE_COLOR, 'transparent']}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: SCRUB_ROW_HEIGHT,
          }}
        />
        <LinearGradient
          pointerEvents="none"
          colors={['transparent', FADE_COLOR]}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: SCRUB_ROW_HEIGHT,
          }}
        />
      </View>
    </BlurPanel>
  );
}
