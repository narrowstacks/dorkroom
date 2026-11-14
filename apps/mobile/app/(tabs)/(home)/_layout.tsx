import { Stack } from 'expo-router';
import { useSafelight } from '@/components/safelight/safelight-provider';
import { chromeOptions } from '@/theme/stack-chrome';
import { STANDARD_TITLE } from '@/theme/stack-header-options';

// A deep link to Settings builds Home underneath it, so Back has somewhere to go.
export const unstable_settings = { initialRouteName: 'index' };

/**
 * The stack behind the Search tab: Home, with no native header (it has its own
 * search row), and the app's one Settings screen pushed on top of it.
 */
export default function HomeLayout() {
  const { on } = useSafelight();
  return (
    <Stack screenOptions={chromeOptions(on)}>
      {/* The title is only what Settings' Back button says. */}
      <Stack.Screen
        name="index"
        options={{ title: 'Search', headerShown: false }}
      />
      {/* An ordinary pushed screen, so a link that arrives while it is open
          pushes the tool on top with a working Back. */}
      <Stack.Screen
        name="settings"
        options={{ title: 'Settings', ...STANDARD_TITLE }}
      />
    </Stack>
  );
}
