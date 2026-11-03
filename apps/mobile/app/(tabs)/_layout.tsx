import { useQuickActionRouting } from 'expo-quick-actions/router';
import { usePathname } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useEffect } from 'react';
import { usePinnedTabs } from '@/hooks/use-pinned-tabs';
import { toolIdForPath } from '@/lib/deep-link';
import { recordToolUse } from '@/lib/recent-store';
import { getTabIcon } from '@/lib/tab-icons';
import { getTool } from '@/lib/tools';

// Home is the initial route and, like Film Log, always in the tab bar.
const HOME_ICON: number = require('../../assets/tab-icons/home.png');
// Film Log is a multi-screen section that always lives in the tab bar (it can't
// use the /more/[tool] access path other single-screen tools do, and a native
// tab is only reachable while its trigger is shown — so it's permanent, not
// user-pinnable).
const FILM_LOG_ICON: number = require('../../assets/tab-icons/film-log.png');
// Development Recipes is also a permanent multi-screen section (see src/lib/tools.ts).
const RECIPES_ICON: number = require('../../assets/tab-icons/recipes.png');
const MORE_ICON: number = require('../../assets/tab-icons/more.png');

export default function TabsLayout() {
  useQuickActionRouting();
  const { pinned } = usePinnedTabs();
  const pathname = usePathname();

  // Home resumes from the tools last opened; this is where "opened" is seen,
  // whichever way the tool was reached (tab, More, Home, deep link).
  useEffect(() => {
    const toolId = toolIdForPath(pathname);
    if (toolId !== undefined) recordToolUse(toolId);
  }, [pathname]);

  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon src={HOME_ICON} />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      {pinned.map((id) => {
        const tool = getTool(id);
        // Route name and icon both come from the tool manifest (`TOOLS` plus
        // `TAB_ICONS`); film-log and recipes have neither and render below.
        const routeName = tool?.tabRoute;
        const icon = getTabIcon(id);
        if (!tool || routeName === undefined || icon === undefined) return null;
        return (
          <NativeTabs.Trigger key={id} name={routeName}>
            <NativeTabs.Trigger.Icon src={icon} />
            <NativeTabs.Trigger.Label>{tool.label}</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
        );
      })}
      <NativeTabs.Trigger name="film-log">
        <NativeTabs.Trigger.Icon src={FILM_LOG_ICON} />
        <NativeTabs.Trigger.Label>Film Log</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="development">
        <NativeTabs.Trigger.Icon src={RECIPES_ICON} />
        <NativeTabs.Trigger.Label>Recipes</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="more">
        <NativeTabs.Trigger.Icon src={MORE_ICON} />
        <NativeTabs.Trigger.Label>More</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
