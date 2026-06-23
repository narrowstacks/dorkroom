import { useQuickActionRouting } from 'expo-quick-actions/router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import type { SFSymbol } from 'sf-symbols-typescript';
import { usePinnedTabs } from '@/hooks/use-pinned-tabs';
import { getTool } from '@/lib/tools';

// Maps a tool id to its (tabs) route name. 'border' is the index route.
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
            <Icon sf={tool.sfSymbol as SFSymbol} />
            <Label>{tool.label}</Label>
          </NativeTabs.Trigger>
        );
      })}
      <NativeTabs.Trigger name="more">
        <Icon sf="ellipsis" />
        <Label>More</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
