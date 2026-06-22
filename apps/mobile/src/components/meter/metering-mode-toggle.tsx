import { Pressable, Text, View } from 'react-native';

export type MeteringMode = 'center' | 'spot';

const MONO = { fontFamily: 'Menlo' } as const;
const SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.85)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 4,
} as const;

const OPTIONS: { label: string; value: MeteringMode }[] = [
  { label: 'Center', value: 'center' },
  { label: 'Spot', value: 'spot' },
];

/**
 * Switches between center-weighted (live, whole-scene) and spot (a metered,
 * locked point) metering. Tapping the viewport also engages spot automatically.
 */
export function MeteringModeToggle({
  value,
  onChange,
}: {
  value: MeteringMode;
  onChange: (value: MeteringMode) => void;
}) {
  return (
    <View
      className="flex-row items-center rounded-full bg-black/35 p-1"
      style={{ gap: 2 }}
    >
      {OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            className={`rounded-full px-3 py-1 ${active ? 'bg-rose-600' : ''}`}
          >
            <Text
              style={[MONO, SHADOW]}
              className={
                active
                  ? 'text-sm font-bold uppercase tracking-widest text-white'
                  : 'text-sm uppercase tracking-widest text-white/60'
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
