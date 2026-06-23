import { ScrollView, Text, View } from 'react-native';
import { GradientBackground } from '@/components/gradient-background';
import { ToolListRow } from '@/components/tool-list-row';
import { usePinnedTabs } from '@/hooks/use-pinned-tabs';
import { MAX_PINNED } from '@/lib/tab-bar-settings';
import { getTool, TOOLS } from '@/lib/tools';

export default function EditTabs() {
  const { pinned, setPinned } = usePinnedTabs();

  const removePin = (id: string) => setPinned(pinned.filter((p) => p !== id));
  const addPin = (id: string) => {
    if (pinned.includes(id) || pinned.length >= MAX_PINNED) return;
    setPinned([...pinned, id]);
  };
  const move = (id: string, dir: -1 | 1) => {
    const i = pinned.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= pinned.length) return;
    const next = [...pinned];
    [next[i], next[j]] = [next[j], next[i]];
    setPinned(next);
  };

  const available = TOOLS.filter((t) => !pinned.includes(t.id));

  return (
    <View className="flex-1">
      <GradientBackground />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 16 }}
      >
        <Text className="px-1 pb-1 text-xs uppercase tracking-wide text-white/40">
          In tab bar ({pinned.length}/{MAX_PINNED})
        </Text>
        {pinned.map((id, idx) => {
          const tool = getTool(id);
          if (!tool) return null;
          return (
            <View key={id} className="flex-row items-center justify-between">
              <ToolListRow
                label={tool.label}
                onPress={() => removePin(id)}
                accessory="Remove"
              />
              <View className="flex-row gap-2 pr-4">
                <Text
                  onPress={() => move(id, -1)}
                  className={idx === 0 ? 'text-white/20' : 'text-white'}
                >
                  ↑
                </Text>
                <Text
                  onPress={() => move(id, 1)}
                  className={
                    idx === pinned.length - 1 ? 'text-white/20' : 'text-white'
                  }
                >
                  ↓
                </Text>
              </View>
            </View>
          );
        })}

        <Text className="px-1 pb-1 pt-6 text-xs uppercase tracking-wide text-white/40">
          More tools
        </Text>
        {available.map((tool) => (
          <ToolListRow
            key={tool.id}
            label={tool.label}
            onPress={() => addPin(tool.id)}
            accessory={pinned.length >= MAX_PINNED ? '' : 'Add'}
          />
        ))}
      </ScrollView>
    </View>
  );
}
