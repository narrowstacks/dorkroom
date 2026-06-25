import { useRef } from 'react';
// eslint-disable-next-line react-doctor/rn-prefer-reanimated -- JS-thread Animated is intentional: the drag is a JS-thread PanResponder (no gesture-handler) and reanimated's worklet babel plugin isn't wired up; the ruler commits on release so there are no React re-renders during the drag, keeping the glide smooth.
import { Animated, Text, View } from 'react-native';
import { BlurPanel } from './blur-panel';
import type { ScrubField } from './meter-readout';
import { SCRUB_COL_WIDTH, SCRUB_GAP } from './scrub-math';

/** Creates the stable drag-offset value shared between the active scrubber
 * (writer) and the ruler (reader). Lives here so the screen needn't import
 * Animated directly. Carries the live combined drag offset in px (right/up +). */
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

const LANE_HEIGHT = 40;
const WINDOW_WIDTH = SCRUB_COL_WIDTH - 6;
const WINDOW_HEIGHT = LANE_HEIGHT - 6;

/**
 * The transient horizontal tick ruler shown above the readout while a setting is
 * dragged. Values glide left/right past a fixed center window — `dragY` (the live
 * combined drag offset in px) drives a single `translateX`, so the motion is a
 * smooth 60fps glide with no per-row work. Dragging right or up is brighter; the
 * list loops infinitely with a small gap at the seam. The centered value is
 * committed on release by the scrubber.
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
  const { options, brighterIsHigherIndex, highlightValue } = field;
  const len = options.length;
  const dir = brighterIsHigherIndex ? 1 : -1;
  const period = len * SCRUB_COL_WIDTH + SCRUB_GAP;

  // scroll(px): how far the list has advanced; the value at scroll/COL sits under
  // the center window. Wrap with modulo over one cycle (incl. the gap) and render
  // 3 copies so the seam is never visible.
  const scroll = Animated.add(
    baseIndex * SCRUB_COL_WIDTH,
    Animated.multiply(dragY, dir)
  );
  const translateX = Animated.subtract(
    -period - SCRUB_COL_WIDTH / 2,
    Animated.modulo(scroll, period)
  );

  return (
    <BlurPanel
      style={{
        alignSelf: 'stretch',
        paddingVertical: 8,
        justifyContent: 'center',
      }}
    >
      <View style={{ height: LANE_HEIGHT, overflow: 'hidden' }}>
        {/* Fixed center selection window. */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: '50%',
            top: (LANE_HEIGHT - WINDOW_HEIGHT) / 2,
            height: WINDOW_HEIGHT,
            width: WINDOW_WIDTH,
            transform: [{ translateX: -WINDOW_WIDTH / 2 }],
          }}
          className="rounded-md border border-yellow-400/70 bg-yellow-400/15"
        />
        <Animated.View
          style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            bottom: 0,
            flexDirection: 'row',
            alignItems: 'center',
            transform: [{ translateX }],
          }}
        >
          {[0, 1, 2].map((copy) => (
            <View
              key={copy}
              style={{ flexDirection: 'row', alignItems: 'center' }}
            >
              {options.map((option) => (
                <View
                  key={option.value}
                  style={{ width: SCRUB_COL_WIDTH, height: LANE_HEIGHT }}
                  className="items-center justify-center"
                >
                  {/* Tick mark, floated to the top so the value stays centered. */}
                  {option.action ? null : (
                    <View
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        top: 3,
                        width: 1,
                        height: 6,
                      }}
                      className="bg-white/30"
                    />
                  )}
                  <Text
                    style={[MONO, SHADOW]}
                    className={
                      option.action
                        ? 'text-sm font-semibold text-yellow-400'
                        : option.value === highlightValue
                          ? 'text-base font-semibold text-amber-300'
                          : 'text-base text-white'
                    }
                  >
                    {option.label}
                  </Text>
                </View>
              ))}
              {/* Inter-cycle gap. */}
              <View style={{ width: SCRUB_GAP }} />
            </View>
          ))}
        </Animated.View>
      </View>
    </BlurPanel>
  );
}
