import { useQuickActionRouting } from 'expo-quick-actions/router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
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
            <Icon src={TAB_ICON[id]} />
            <Label>{tool.label}</Label>
          </NativeTabs.Trigger>
        );
      })}
      <NativeTabs.Trigger name="more">
        <Icon src={MORE_ICON} />
        <Label>More</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
