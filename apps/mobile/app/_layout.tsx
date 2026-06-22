import '../global.css';
import { installLocalStorage } from '@/polyfills/install-local-storage';

installLocalStorage();

import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { useQuickActionRouting } from 'expo-quick-actions/router';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Appearance } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { queryClient } from '@/providers/query-client';

// The app is dark-themed only (screens hard-code dark backgrounds and light
// text). Force dark so native surfaces — notably expo-glass-effect's GlassView —
// render dark glass regardless of the device's system appearance.
Appearance.setColorScheme('dark');

export default function RootLayout() {
  // Route home-screen quick action taps to the action's `params.href`.
  useQuickActionRouting();

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={DarkTheme}>
          <Stack screenOptions={{ headerShown: false }} />
          {/* oxlint-disable-next-line react/style-prop-object -- expo-status-bar's `style` is a preset string ('auto' | 'light' | 'dark'), not a React style object */}
          <StatusBar style="light" />
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
