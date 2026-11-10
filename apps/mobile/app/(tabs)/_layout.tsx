import { useQuickActionRouting } from 'expo-quick-actions/router';
import { usePathname } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useEffect } from 'react';
import { useSafelight } from '@/components/safelight/safelight-provider';
import { useLinkHandoff } from '@/hooks/use-link-handoff';
import { toolIdForPath } from '@/lib/deep-link';
import { routeQuickAction } from '@/lib/quick-action';
import { recordToolUse } from '@/lib/recent-store';
import { PHASES } from '@/lib/tools';
import { ACCENT, PHASE_ACCENT } from '@/theme/accents';
import { SAFELIGHT } from '@/theme/safelight';

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
  useLinkHandoff();
  const { on } = useSafelight();

  // Home resumes from the tools last opened; this is where "opened" is seen,
  // whichever way the tool was reached (hub, Home, deep link, quick action).
  useEffect(() => {
    const toolId = toolIdForPath(pathname);
    if (toolId !== undefined) recordToolUse(toolId);
  }, [pathname]);

  return (
    <NativeTabs
      // Safelight mode: a black bar with red labels and icons. The multiply
      // overlay tints the glass regardless; this keeps it as dark as it goes.
      {...(on
        ? {
            backgroundColor: SAFELIGHT.background,
            blurEffect: 'none' as const,
            tintColor: SAFELIGHT.text,
            iconColor: {
              default: SAFELIGHT.textTertiary,
              selected: SAFELIGHT.text,
            },
            labelStyle: {
              default: { color: SAFELIGHT.textTertiary },
              selected: { color: SAFELIGHT.text },
            },
          }
        : {})}
    >
      {/* The selected tab takes its phase's hue. */}
      {PHASES.map((phase) => {
        const hue = on ? SAFELIGHT.text : ACCENT[PHASE_ACCENT[phase.id]];
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
          selectedColor={on ? SAFELIGHT.text : NEUTRAL_SELECTED}
        />
        <NativeTabs.Trigger.Label
          selectedStyle={{ color: on ? SAFELIGHT.text : NEUTRAL_SELECTED }}
        >
          Search
        </NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
