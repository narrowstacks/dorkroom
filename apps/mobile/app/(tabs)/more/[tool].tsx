import { Stack, useLocalSearchParams } from 'expo-router';
import type { ComponentType } from 'react';
import { Text, View } from 'react-native';
import { getTool } from '@/lib/tools';
import { BorderScreen } from '@/screens/border-screen';
import { CameraExposureScreen } from '@/screens/camera-exposure-screen';
import { ExposureScreen } from '@/screens/exposure-screen';
import { LensScreen } from '@/screens/lens-screen';
import { MatScreen } from '@/screens/mat-screen';
import { MeterScreen } from '@/screens/meter-screen';
import { ReciprocityScreen } from '@/screens/reciprocity-screen';
import { ResizeScreen } from '@/screens/resize-screen';
import { SettingsScreen } from '@/screens/settings-screen';

const SCREENS: Record<string, ComponentType> = {
  border: BorderScreen,
  exposure: ExposureScreen,
  reciprocity: ReciprocityScreen,
  resize: ResizeScreen,
  meter: MeterScreen,
  mat: MatScreen,
  lens: LensScreen,
  'camera-exposure': CameraExposureScreen,
  settings: SettingsScreen,
};

export default function MoreToolDetail() {
  const { tool } = useLocalSearchParams<{ tool: string }>();
  const meta = getTool(tool);
  const ScreenComponent = tool ? SCREENS[tool] : undefined;
  if (!meta || !ScreenComponent) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-white/60">Unknown tool.</Text>
      </View>
    );
  }
  return (
    <>
      <Stack.Screen options={{ title: meta.label }} />
      <ScreenComponent />
    </>
  );
}
