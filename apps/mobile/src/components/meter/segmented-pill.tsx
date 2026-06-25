import { Pressable, Text, View } from 'react-native';

const MONO = { fontFamily: 'Menlo' } as const;
const SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.85)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 4,
} as const;

export interface SegmentedOption<T extends string> {
  label: string;
  value: T;
}

/** A compact option toggle drawn over the camera feed; horizontal or vertical. */
export function SegmentedPill<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  orientation = 'horizontal',
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
  orientation?: 'horizontal' | 'vertical';
}) {
  const vertical = orientation === 'vertical';
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      className={`items-stretch bg-black/35 p-1 ${
        vertical ? 'flex-col rounded-2xl' : 'flex-row rounded-full'
      }`}
      style={{ gap: 2 }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            className={`px-3 ${vertical ? 'rounded-xl py-2' : 'rounded-full py-1'} ${
              active ? 'bg-yellow-400' : ''
            }`}
          >
            <Text
              style={[MONO, SHADOW]}
              className={`text-center text-sm uppercase tracking-widest ${
                active ? 'font-bold text-black' : 'text-white/60'
              }`}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
