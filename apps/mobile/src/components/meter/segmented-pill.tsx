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

/** A compact two-or-more option pill toggle, drawn over the camera feed. */
export function SegmentedPill<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
}) {
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      className="flex-row items-center rounded-full bg-black/35 p-1"
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
