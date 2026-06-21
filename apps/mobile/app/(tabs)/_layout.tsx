import { Label, NativeTabs } from 'expo-router/unstable-native-tabs';

export default function TabsLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Label>Border</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="exposure">
        <Label>Exposure</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="reciprocity">
        <Label>Reciprocity</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="resize">
        <Label>Resize</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
