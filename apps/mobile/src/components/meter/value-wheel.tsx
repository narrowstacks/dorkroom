import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useRef } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  Text,
  View,
} from 'react-native';

const ITEM_HEIGHT = 34;
const DEFAULT_WHEEL_WIDTH = 120;
// Matches the dark blur panel so edge rows fade out instead of hard-truncating.
const FADE_COLOR = 'rgba(11,11,12,0.95)';
const MONO = { fontFamily: 'Menlo' } as const;
const SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.85)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 4,
} as const;

interface WheelOption<T extends string | number> {
  label: string;
  value: T;
}

interface ValueWheelProps<T extends string | number> {
  options: WheelOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
  /** Odd number of rows shown; the center row is the selection. Default 5. */
  visibleCount?: number;
  /** Wheel width in px. Default 120. */
  width?: number;
}

/**
 * A vertical command-dial: drag up/down to snap the centered tick to a value,
 * with a haptic tick each time a new row crosses center. Built on a snapping
 * ScrollView (no gesture-handler dep). Remount via `key` when options change.
 */
export function ValueWheel<T extends string | number>({
  options,
  value,
  onChange,
  accessibilityLabel,
  visibleCount = 5,
  width = DEFAULT_WHEEL_WIDTH,
}: ValueWheelProps<T>) {
  const scrollRef = useRef<ScrollView>(null);
  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value)
  );
  const lastTickIndex = useRef(selectedIndex);

  const wheelHeight = ITEM_HEIGHT * visibleCount;
  const pad = (wheelHeight - ITEM_HEIGHT) / 2;

  const indexAt = useCallback(
    (offsetY: number) =>
      Math.min(
        Math.max(Math.round(offsetY / ITEM_HEIGHT), 0),
        options.length - 1
      ),
    [options.length]
  );

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = indexAt(e.nativeEvent.contentOffset.y);
      if (index !== lastTickIndex.current) {
        lastTickIndex.current = index;
        void Haptics.selectionAsync();
      }
    },
    [indexAt]
  );

  const commit = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = options[indexAt(e.nativeEvent.contentOffset.y)];
      if (next && next.value !== value) onChange(next.value);
    },
    [options, value, onChange, indexAt]
  );

  const alignToSelection = useCallback(() => {
    lastTickIndex.current = selectedIndex;
    scrollRef.current?.scrollTo({
      y: selectedIndex * ITEM_HEIGHT,
      animated: false,
    });
  }, [selectedIndex]);

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={{ height: wheelHeight, width }}
    >
      {/* Fixed center selection band + caret pointing at the live feed. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: pad,
          height: ITEM_HEIGHT,
          left: 0,
          right: 0,
        }}
        className="flex-row items-center"
      >
        <Text style={[MONO, SHADOW]} className="pr-1 text-base text-rose-500">
          ▶
        </Text>
        <View className="h-9 flex-1 rounded-md border border-rose-500/70 bg-rose-500/15" />
      </View>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onLayout={alignToSelection}
        onScroll={handleScroll}
        onMomentumScrollEnd={commit}
        onScrollEndDrag={commit}
        contentContainerStyle={{ paddingVertical: pad }}
      >
        {/* eslint-disable-next-line react-doctor/rn-no-scrollview-mapped-list -- bounded static value set (≤19 standard f-stops/shutter speeds/ISOs); snap-to-center needs all rows laid out contiguously, and virtualization would break the centering math with no perf benefit at this size */}
        {options.map((option, i) => {
          const selected = i === selectedIndex;
          return (
            <View
              key={String(option.value)}
              style={{ height: ITEM_HEIGHT }}
              className="items-center justify-center"
            >
              <Text
                style={[MONO, SHADOW]}
                className={
                  selected
                    ? 'text-xl font-bold text-white'
                    : 'text-base text-white/40'
                }
              >
                {option.label}
              </Text>
            </View>
          );
        })}
      </ScrollView>
      {/* Fade the top/bottom rows into the panel, iOS-picker style. */}
      <LinearGradient
        pointerEvents="none"
        colors={[FADE_COLOR, 'transparent']}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: ITEM_HEIGHT,
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
          height: ITEM_HEIGHT,
        }}
      />
    </View>
  );
}
