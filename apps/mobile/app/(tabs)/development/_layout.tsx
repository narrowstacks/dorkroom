import { Stack } from 'expo-router';

export default function DevelopmentLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, headerLargeTitle: true }}>
      <Stack.Screen name="index" options={{ title: 'Recipes' }} />
      <Stack.Screen name="recipe/[id]" options={{ title: 'Recipe' }} />
      <Stack.Screen name="timer" options={{ title: 'Process Timer' }} />
    </Stack>
  );
}
