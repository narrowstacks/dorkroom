import { Pressable, Text, View } from 'react-native';

interface ToggleRowProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

/** A labelled on/off switch row. */
export function ToggleRow({ label, value, onChange }: ToggleRowProps) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      className="flex-row items-center justify-between rounded-xl bg-white/10 px-4 py-3"
    >
      <Text className="text-base text-white">{label}</Text>
      <View
        className={`h-6 w-11 justify-center rounded-full ${value ? 'bg-rose-600' : 'bg-white/20'}`}
      >
        <View
          className={`mx-0.5 h-5 w-5 rounded-full bg-white ${value ? 'self-end' : 'self-start'}`}
        />
      </View>
    </Pressable>
  );
}
