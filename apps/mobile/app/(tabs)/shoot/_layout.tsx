import { Stack } from 'expo-router';
import { backTitleAfter } from '@/components/hub/back-title';
import { PhaseStack } from '@/components/hub/phase-stack';
import { BACK_SWIPE_ZONE } from '@/components/stage/stage-layout';

// A deep link builds the stack with the hub underneath the tool.
export const unstable_settings = { initialRouteName: 'index' };

// Film Log's screens sit flat in this stack rather than in a nested one, so a
// push from the hub always has the hub to go back to and there is one header.
export default function ShootLayout() {
  return (
    <PhaseStack phase="shoot">
      <Stack.Screen name="film-log/index" options={{ title: 'Film Log' }} />
      <Stack.Screen name="film-log/roll-form" options={{ title: 'Roll' }} />
      <Stack.Screen name="film-log/roll/[rollId]" options={{ title: 'Roll' }} />
      <Stack.Screen
        name="film-log/roll-map"
        options={({ route, navigation }) => ({
          title: 'Map',
          headerLargeTitle: false,
          // A sideways drag pans the map: Back starts only in the left edge
          // zone, as on the fixed-layout tools.
          gestureResponseDistance: { end: BACK_SWIPE_ZONE },
          headerBackTitle: backTitleAfter(
            navigation.getState(),
            route.key,
            'film-log/roll/[rollId]',
            'Roll'
          ),
        })}
      />
      <Stack.Screen
        name="film-log/shot"
        options={({ route, navigation }) => ({
          title: 'Shot',
          // A roll's title is its name, which may not fit a Back label.
          headerBackTitle: backTitleAfter(
            navigation.getState(),
            route.key,
            'film-log/roll/[rollId]',
            'Roll'
          ),
        })}
      />
      <Stack.Screen
        name="film-log/gear"
        options={{ title: 'Cameras & lenses' }}
      />
    </PhaseStack>
  );
}
