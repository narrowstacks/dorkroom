import '../global.css';
import { installLocalStorage } from '@/polyfills/install-local-storage';

installLocalStorage();

import { configureDorkroomApi } from '@/lib/api-config';

// Point the shared @dorkroom/api client at the public API (with the bundled
// key) before any query runs.
configureDorkroomApi();

import { PersistenceStorageProvider } from '@dorkroom/logic';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';
import { Appearance } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TimerRunEffects } from '@/components/development/timer/timer-run-effects';
import { PhotoPickerGateHost } from '@/components/safelight/photo-picker-gate-host';
import { SafelightRoot } from '@/components/safelight/safelight-overlay';
import {
  SafelightProvider,
  useSafelight,
} from '@/components/safelight/safelight-provider';
import { SpotlightEffects } from '@/components/spotlight-effects';
import { clearLegacyPins } from '@/lib/legacy-pins';
import { calculatorStorage } from '@/lib/mmkv-storage';
import { queryClient } from '@/providers/query-client';
import {
  QUERY_CACHE_MAX_AGE,
  queryPersister,
} from '@/providers/query-persister';
import { statusBarOptions } from '@/theme/stack-chrome';

// The app is dark-themed only (screens hard-code dark backgrounds and light
// text). Force dark so native surfaces — notably expo-glass-effect's GlassView —
// render dark glass regardless of the device's system appearance.
Appearance.setColorScheme('dark');

function RootStack() {
  const { on } = useSafelight();
  // The home indicator and the status bar hide under safelight: they are system
  // surfaces the multiply overlay cannot tint. The status bar is a screen
  // option (UIViewControllerBasedStatusBarAppearance is true), set here for the
  // `(tabs)` screen, which is the one iOS asks.
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        autoHideHomeIndicator: on,
        ...statusBarOptions(on),
      }}
    />
  );
}

export default function RootLayout() {
  // Pinned tabs are gone; drop the setting they left behind (once is enough).
  useEffect(() => {
    clearLegacyPins();
  }, []);

  return (
    <SafelightProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafelightRoot>
          <SafeAreaProvider>
            <PersistQueryClientProvider
              client={queryClient}
              persistOptions={{
                persister: queryPersister,
                maxAge: QUERY_CACHE_MAX_AGE,
              }}
            >
              {/* Persisted calculators (mat, lens, camera exposure, border) read
              and write MMKV through this, not the window.localStorage alias. */}
              <PersistenceStorageProvider value={calculatorStorage}>
                <ThemeProvider value={DarkTheme}>
                  <RootStack />
                  <TimerRunEffects />
                  {/* Keeps rolls and recent recipes in the on-device Spotlight index. */}
                  <SpotlightEffects />
                  {/* Asks before the system photo picker opens under safelight mode. */}
                  <PhotoPickerGateHost />
                </ThemeProvider>
              </PersistenceStorageProvider>
            </PersistQueryClientProvider>
          </SafeAreaProvider>
        </SafelightRoot>
      </GestureHandlerRootView>
    </SafelightProvider>
  );
}
