import { useQuickActionRouting } from 'expo-quick-actions/router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { usePinnedTabs } from '@/hooks/use-pinned-tabs';
import { getTool } from '@/lib/tools';

const ROUTE_NAME: Record<string, string> = {
  border: 'index',
  exposure: 'exposure',
  reciprocity: 'reciprocity',
  resize: 'resize',
  meter: 'meter',
  mat: 'mat',
  lens: 'lenses',
  'camera-exposure': 'camera-exposure',
  settings: 'settings',
};

const TAB_ICON: Record<string, number> = {
  border: require('../../assets/tab-icons/border.png'),
  exposure: require('../../assets/tab-icons/exposure.png'),
  reciprocity: require('../../assets/tab-icons/reciprocity.png'),
  resize: require('../../assets/tab-icons/resize.png'),
  meter: require('../../assets/tab-icons/meter.png'),
  mat: require('../../assets/tab-icons/mat.png'),
  lens: require('../../assets/tab-icons/lens.png'),
  'camera-exposure': require('../../assets/tab-icons/camera-exposure.png'),
  settings: require('../../assets/tab-icons/settings.png'),
};
// Film Log is a multi-screen section that always lives in the tab bar (it can't
// use the /more/[tool] access path other single-screen tools do, and a native
// tab is only reachable while its trigger is shown — so it's permanent, not
// user-pinnable).
const FILM_LOG_ICON: number = require('../../assets/tab-icons/film-log.png');
const MORE_ICON: number = require('../../assets/tab-icons/more.png');

export default function TabsLayout() {
  useQuickActionRouting();
  const { pinned } = usePinnedTabs();

  return (
    <NativeTabs>
      {pinned.map((id) => {
        const tool = getTool(id);
        if (!tool) return null;
        return (
          <NativeTabs.Trigger key={id} name={ROUTE_NAME[id]}>
            <NativeTabs.Trigger.Icon src={TAB_ICON[id]} />
            <NativeTabs.Trigger.Label>{tool.label}</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
        );
      })}
      <NativeTabs.Trigger name="film-log">
        <NativeTabs.Trigger.Icon src={FILM_LOG_ICON} />
        <NativeTabs.Trigger.Label>Film Log</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="more">
        <NativeTabs.Trigger.Icon src={MORE_ICON} />
        <NativeTabs.Trigger.Label>More</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
