import { useQuickActionRouting } from 'expo-quick-actions/router';
import { usePathname } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useEffect } from 'react';
import { toolIdForPath } from '@/lib/deep-link';
import { routeQuickAction } from '@/lib/quick-action';
import { recordToolUse } from '@/lib/recent-store';
import { PHASES } from '@/lib/tools';
import { ACCENT, PHASE_ACCENT } from '@/theme/accents';

// SF Symbols, so the tab bar needs no image assets.
const PHASE_SYMBOL = {
  shoot: 'camera',
  develop: 'flask',
  print: 'photo.on.rectangle',
} as const;

// Home is the app's initial route (see the Search trigger below). The Shoot,
// Develop and Print triggers come first in the bar, so without this the
// navigator's own default would be the first of them.
export const unstable_settings = { initialRouteName: 'index' };

// The Search tab belongs to no phase, so its selected state is white rather
// than the system tint, which would read as a fourth hue.
const NEUTRAL_SELECTED = '#ffffff';

export default function TabsLayout() {
  useQuickActionRouting(routeQuickAction);
  const pathname = usePathname();

  // Home resumes from the tools last opened; this is where "opened" is seen,
  // whichever way the tool was reached (hub, Home, deep link, quick action).
  useEffect(() => {
    const toolId = toolIdForPath(pathname);
    if (toolId !== undefined) recordToolUse(toolId);
  }, [pathname]);

  return (
    <NativeTabs>
      {/* The selected tab takes its phase's hue. */}
      {PHASES.map((phase) => {
        const hue = ACCENT[PHASE_ACCENT[phase.id]];
        return (
          <NativeTabs.Trigger key={phase.id} name={phase.id}>
            <NativeTabs.Trigger.Icon
              sf={PHASE_SYMBOL[phase.id]}
              selectedColor={hue}
            />
            <NativeTabs.Trigger.Label selectedStyle={{ color: hue }}>
              {phase.label}
            </NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
        );
      })}
      {/* Home is the search tab and the launch route: "/" opens it. */}
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon
          sf="magnifyingglass"
          selectedColor={NEUTRAL_SELECTED}
        />
        <NativeTabs.Trigger.Label selectedStyle={{ color: NEUTRAL_SELECTED }}>
          Search
        </NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
