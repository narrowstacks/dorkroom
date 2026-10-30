import { useQuickActionRouting } from 'expo-quick-actions/router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { usePinnedTabs } from '@/hooks/use-pinned-tabs';
import { getToolScreen } from '@/lib/tool-screens';
import { getTool } from '@/lib/tools';

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

  return (
    <NativeTabs>
      {pinned.map((id) => {
        const tool = getTool(id);
        // Route name and icon both come from the tool manifest (`TOOLS` plus
        // `TOOL_SCREENS`); film-log and recipes have neither and render below.
        const routeName = tool?.tabRoute;
        const icon = getToolScreen(id)?.tabIcon;
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
