import '../global.css';
import { installLocalStorage } from '@/polyfills/install-local-storage';

installLocalStorage();

import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Appearance } from 'react-native';
import { queryClient } from '@/providers/query-client';

// The app is dark-themed only (screens hard-code dark backgrounds and light
// text). Force dark so native surfaces — notably expo-glass-effect's GlassView —
// render dark glass regardless of the device's system appearance.
Appearance.setColorScheme('dark');

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={DarkTheme}>
        <Stack screenOptions={{ headerShown: false }} />
        <StatusBar style="light" />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
