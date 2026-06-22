import { useCallback, useRef } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  Text,
  View,
} from 'react-native';

const ITEM_HEIGHT = 40;
const VISIBLE = 5; // odd, so one item sits dead-center
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE;
const PAD = (WHEEL_HEIGHT - ITEM_HEIGHT) / 2;
const MONO = { fontFamily: 'Menlo' } as const;

interface WheelOption<T extends string | number> {
  label: string;
  value: T;
}

interface ValueWheelProps<T extends string | number> {
  options: WheelOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
}

/**
 * A vertical command-dial: drag up/down to snap the centered tick to a value.
 * Built on a snapping ScrollView so it needs no gesture-handler dependency.
 * Remount it (via a `key`) when the option set changes so it re-centers.
 */
export function ValueWheel<T extends string | number>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: ValueWheelProps<T>) {
  const scrollRef = useRef<ScrollView>(null);
  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value)
  );

  const commit = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const raw = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
      const index = Math.min(Math.max(raw, 0), options.length - 1);
      const next = options[index];
      if (next && next.value !== value) onChange(next.value);
    },
    [options, value, onChange]
  );

  const alignToSelection = useCallback(() => {
    scrollRef.current?.scrollTo({
      y: selectedIndex * ITEM_HEIGHT,
      animated: false,
    });
  }, [selectedIndex]);

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={{ height: WHEEL_HEIGHT, width: 104 }}
    >
      {/* Fixed center selection band + caret pointing at the live feed. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: PAD,
          height: ITEM_HEIGHT,
          left: 0,
          right: 0,
        }}
        className="flex-row items-center"
      >
        <Text style={MONO} className="pr-1 text-base text-rose-500">
          ▶
        </Text>
        <View className="h-9 flex-1 rounded-md border border-rose-500/70 bg-rose-500/15" />
      </View>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onLayout={alignToSelection}
        onMomentumScrollEnd={commit}
        onScrollEndDrag={commit}
        contentContainerStyle={{ paddingVertical: PAD }}
      >
        {/* eslint-disable-next-line react-doctor/rn-no-scrollview-mapped-list -- bounded static value set (≤19 standard f-stops/shutter speeds); snap-to-center needs all rows laid out contiguously, and virtualization would break the centering math with no perf benefit at this size */}
        {options.map((option, i) => {
          const selected = i === selectedIndex;
          return (
            <View
              key={String(option.value)}
              style={{ height: ITEM_HEIGHT }}
              className="items-center justify-center"
            >
              <Text
                style={MONO}
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
    </View>
  );
}
