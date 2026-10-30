import { EV_PRESETS } from '@dorkroom/logic';
import * as Haptics from 'expo-haptics';
import { Pressable, Text, View } from 'react-native';

interface EvPresetGridProps {
  onSelect: (ev: number) => void;
}

/** Two-column grid of lighting-condition presets (label + EV). */
export function EvPresetGrid({ onSelect }: EvPresetGridProps) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {EV_PRESETS.map((preset) => (
        <Pressable
          key={preset.ev}
          onPress={() => {
            Haptics.selectionAsync();
            onSelect(preset.ev);
          }}
          accessibilityRole="button"
          accessibilityLabel={`${preset.label}, EV ${preset.ev}`}
          accessibilityHint={preset.description}
          className="min-h-11 grow basis-[45%] rounded-xl bg-white/10 px-3 py-2 active:opacity-60"
        >
          <Text className="text-sm font-medium text-white">{preset.label}</Text>
          <Text className="text-xs text-white/50">EV {preset.ev}</Text>
        </Pressable>
      ))}
    </View>
  );
}
