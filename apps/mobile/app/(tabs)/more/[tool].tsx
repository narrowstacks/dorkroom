import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { getToolScreen } from '@/lib/tool-screens';
import { getTool } from '@/lib/tools';

export default function MoreToolDetail() {
  const { tool } = useLocalSearchParams<{ tool: string }>();
  const meta = getTool(tool);
  const ScreenComponent = tool ? getToolScreen(tool) : undefined;
  if (!meta || !ScreenComponent) {
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
