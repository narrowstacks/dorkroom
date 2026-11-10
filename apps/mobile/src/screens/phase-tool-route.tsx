import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { getToolScreen } from '@/lib/tool-screens';
import { getScreenToolForPhase, type Phase } from '@/lib/tools';

/**
 * The body of a phase's `[tool].tsx`: the tool's screen, or the not-found
 * state for an id that is unknown, a section, or another phase's tool.
 */
export function PhaseToolRoute({ phase }: { phase: Phase }) {
  const { tool } = useLocalSearchParams<{ tool: string }>();
  const meta = getScreenToolForPhase(phase, tool);
  const ScreenComponent = meta ? getToolScreen(meta.id) : undefined;
  if (!ScreenComponent) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-white/60">Unknown tool.</Text>
      </View>
    );
  }
  // Each tool is its own screen in the stack (the layout makes the route
  // singular by tool id), so one instance is never reused for another tool.
  // The header (title, large or standard) is set by the layout from the params.
  return <ScreenComponent />;
}
