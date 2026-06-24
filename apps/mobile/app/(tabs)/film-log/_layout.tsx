import { Stack } from 'expo-router';

export default function FilmLogLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, headerLargeTitle: true }}>
      <Stack.Screen name="index" options={{ title: 'Film Log' }} />
      <Stack.Screen name="roll-form" options={{ title: 'Roll' }} />
      <Stack.Screen name="roll/[rollId]" options={{ title: 'Roll' }} />
      <Stack.Screen name="shot" options={{ title: 'Shot' }} />
      <Stack.Screen name="gear" options={{ title: 'Cameras & lenses' }} />
    </Stack>
  );
}
