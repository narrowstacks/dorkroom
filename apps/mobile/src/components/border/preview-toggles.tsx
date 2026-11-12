import { Pressable, Text, View } from 'react-native';

interface ToggleButtonProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

function ToggleButton({ label, active, onPress }: ToggleButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={`flex-1 items-center min-h-11 justify-center rounded-xl ${active ? 'border-hw border-edge-strong bg-surface-strong' : 'border-hw border-line bg-surface'}`}
    >
      <Text className={active ? 'font-semibold text-white' : 'text-ink-70'}>
        {label}
      </Text>
    </Pressable>
  );
}

interface PreviewTogglesProps {
  showBlades: boolean;
  showBladeReadings: boolean;
  onBlades: (value: boolean) => void;
  onReadings: (value: boolean) => void;
}

/** Hide or show the blades and their readings on the drawing. */
export function PreviewToggles({
  showBlades,
  showBladeReadings,
  onBlades,
  onReadings,
}: PreviewTogglesProps) {
  return (
    <View className="flex-row gap-3">
      <ToggleButton
        label={showBlades ? 'Hide blades' : 'Show blades'}
        active={showBlades}
        onPress={() => onBlades(!showBlades)}
      />
      <ToggleButton
        label={showBladeReadings ? 'Hide readings' : 'Show readings'}
        active={showBladeReadings}
        onPress={() => onReadings(!showBladeReadings)}
      />
    </View>
  );
}
