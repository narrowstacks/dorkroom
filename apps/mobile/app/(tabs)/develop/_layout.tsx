import { Stack } from 'expo-router';
import { backTitleAfter } from '@/components/hub/back-title';
import { PhaseStack } from '@/components/hub/phase-stack';

// A deep link builds the stack with the hub underneath the tool.
export const unstable_settings = { initialRouteName: 'index' };

// Recipes, a recipe and the Process Timer sit flat in this stack (see the Shoot
// layout), so the timer opened from the hub has the hub to go back to.
export default function DevelopLayout() {
  return (
    <PhaseStack phase="develop">
      <Stack.Screen name="recipes/index" options={{ title: 'Recipes' }} />
      <Stack.Screen name="recipes/recipe/[id]" options={{ title: 'Recipe' }} />
      <Stack.Screen
        name="recipes/timer"
        options={({ route, navigation }) => ({
          title: 'Process Timer',
          // A recipe's title is its film name, often too long for a Back label.
          headerBackTitle: backTitleAfter(
            navigation.getState(),
            route.key,
            'recipes/recipe/[id]',
            'Recipe'
          ),
        })}
      />
    </PhaseStack>
  );
}
