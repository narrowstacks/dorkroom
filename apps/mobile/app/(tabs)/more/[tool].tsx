import { Stack, useLocalSearchParams } from 'expo-router';
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
  return (
    <>
      <Stack.Screen
        options={{
          title: meta.label,
          headerLargeTitle: !meta.fixedLayout,
        }}
      />
      <ScreenComponent />
    </>
  );
}
