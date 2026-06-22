import { useQuickActionRouting } from 'expo-quick-actions/router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';

export default function TabsLayout() {
  // Route home-screen quick action taps to the action's `params.href`. The
  // library requires this in a sub-layout (not the root layout) so the target
  // navigator is mounted before the cold-launch action navigates.
  useQuickActionRouting();

  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf="square.dashed" />
        <Label>Border</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="exposure">
        <Icon sf="plusminus" />
        <Label>Exposure</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="reciprocity">
        <Icon sf="timer" />
        <Label>Reciprocity</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="resize">
        <Icon sf="aspectratio" />
        <Label>Resize</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="meter">
        <Icon sf="camera.aperture" />
        <Label>Meter</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
