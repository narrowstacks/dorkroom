import { router, Stack } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Pressable, Text } from 'react-native';

// Pushed detail pages (more/[tool]) — chevron + "Back" label. A custom headerLeft
// replaces the native back button so it never shows the hub route name ("index").
function HeaderBackButton() {
  return (
    <Pressable
      hitSlop={12}
      onPress={() => router.back()}
      accessibilityRole="button"
      accessibilityLabel="Back"
      style={{ flexDirection: 'row', alignItems: 'center', paddingRight: 12 }}
    >
      <ChevronLeft size={24} color="#ffffff" />
      <Text style={{ color: '#ffffff', fontSize: 17, marginLeft: -2 }}>
        Back
      </Text>
    </Pressable>
  );
}

export default function MoreLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerLargeTitle: true,
        headerLeft: () => <HeaderBackButton />,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="edit"
        options={{
          title: 'Edit Tabs',
          presentation: 'modal',
          // Standard (non-large) header so the native stack lays the
          // ReorderableList out below an opaque bar. A large-title header would
          // require a scroll contentInset, which the drag overlay doesn't
          // account for (dragged rows snap under the header).
          headerLargeTitle: false,
          // Text "Done" button — a custom view gets the iOS 26 system glass as a
          // pill, which reads correctly with a text label (vs an icon, which
          // wants a circle the custom-view path can't produce here).
          headerLeft: () => (
            <Pressable
              hitSlop={12}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Close"
              // Breathing room so the system glass pill isn't tight on the text.
              style={{ paddingHorizontal: 10 }}
            >
              <Text
                style={{ color: '#ffffff', fontSize: 17, fontWeight: '600' }}
              >
                Done
              </Text>
            </Pressable>
          ),
        }}
      />
    </Stack>
  );
}
