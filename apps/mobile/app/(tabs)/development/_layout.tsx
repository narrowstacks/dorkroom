import { Stack } from 'expo-router';
import { stackHeaderOptions } from '@/theme/stack-header-options';

export default function DevelopmentLayout() {
  return (
    <Stack screenOptions={stackHeaderOptions}>
      <Stack.Screen name="index" options={{ title: 'Recipes' }} />
      <Stack.Screen name="recipe/[id]" options={{ title: 'Recipe' }} />
      <Stack.Screen name="timer" options={{ title: 'Process Timer' }} />
    </Stack>
  );
}
