import { Stack } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import {
  getScreenToolForPhase,
  type Phase,
  PHASE_LABELS,
  usesLargeTitle,
} from '@/lib/tools';
import { PhaseProvider } from '@/theme/phase-context';
import { stackHeaderOptions } from '@/theme/stack-header-options';
import { SettingsButton } from './header-buttons';

// One native screen per tool, so a tool's header options (large or standard
// title) are never flipped on a screen that is already showing.
const toolScreenId: ComponentProps<
  typeof Stack.Screen
>['dangerouslySingular'] = (_name, params) =>
  Array.isArray(params.tool) ? params.tool[0] : params.tool;

interface PhaseStackProps {
  phase: Phase;
  /** The phase's own section screens (`Stack.Screen`s for Film Log, Recipes). */
  children?: ReactNode;
}

/**
 * The stack behind a phase tab, shared by Shoot, Develop and Print: the hub at
 * `index`, a `[tool]` route for single-screen tools, a Settings screen, and
 * whatever sections the phase adds. Every layout exports `unstable_settings.initialRouteName = 'index'`
 * so a deep link builds the hub underneath the tool.
 */
export function PhaseStack({ phase, children }: PhaseStackProps) {
  return (
    <PhaseProvider value={phase}>
      {/* Pushed screens keep the native back button: it shows the previous
          scene's title, and the hub's is the phase name, never "index". */}
      <Stack screenOptions={stackHeaderOptions}>
        <Stack.Screen
          name="index"
          options={{ title: PHASE_LABELS[phase], headerRight: SettingsButton }}
        />
        <Stack.Screen
          name="[tool]"
          dangerouslySingular={toolScreenId}
          // From the route params, so the header is right on the first frame.
          options={({ route }) => {
            const params: { tool?: string } = route.params ?? {};
            const tool = getScreenToolForPhase(phase, params.tool);
            return {
              title: tool?.label ?? 'Not found',
              headerLargeTitle: usesLargeTitle(tool),
            };
          }}
        />
        {/* An ordinary pushed screen, so a link that arrives while it is open
            pushes the tool on top with a working Back. */}
        <Stack.Screen
          name="settings"
          options={{ title: 'Settings', headerLargeTitle: false }}
        />
        {children}
      </Stack>
    </PhaseProvider>
  );
}
