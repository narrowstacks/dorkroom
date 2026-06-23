import { Stack } from 'expo-router';

export default function MoreLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, headerLargeTitle: true }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="edit"
        options={{ title: 'Edit Tabs', presentation: 'modal' }}
      />
    </Stack>
  );
}
