import type { MeterPriority } from '@dorkroom/logic';
import { Pressable, Text, View } from 'react-native';

const MONO = { fontFamily: 'Menlo' } as const;
const SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.85)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 4,
} as const;

const OPTIONS: { label: string; value: MeterPriority }[] = [
  { label: 'Aperture', value: 'aperture' },
  { label: 'Shutter', value: 'shutter' },
];

/** Chooses which setting the wheel drives; the meter solves the other. */
export function PriorityToggle({
  value,
  onChange,
}: {
  value: MeterPriority;
  onChange: (value: MeterPriority) => void;
}) {
  return (
    <View className="flex-row items-center" style={{ gap: 20 }}>
      {OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            hitSlop={10}
          >
            <Text
              style={[MONO, SHADOW]}
              className={
                active
                  ? 'text-base font-bold uppercase tracking-widest text-rose-400'
                  : 'text-base uppercase tracking-widest text-white/50'
              }
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
