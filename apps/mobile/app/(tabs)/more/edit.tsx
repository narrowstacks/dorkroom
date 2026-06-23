import { useCallback } from 'react';
import { SectionList, Text, View } from 'react-native';
import { GradientBackground } from '@/components/gradient-background';
import { ToolListRow } from '@/components/tool-list-row';
import { usePinnedTabs } from '@/hooks/use-pinned-tabs';
import { MAX_PINNED } from '@/lib/tab-bar-settings';
import type { Tool } from '@/lib/tools';
import { getTool, TOOLS } from '@/lib/tools';

type PinnedItem = { kind: 'pinned'; id: string; idx: number; total: number };
type AvailableItem = { kind: 'available'; tool: Tool; canAdd: boolean };
type SectionItem = PinnedItem | AvailableItem;

export default function EditTabs() {
  const { pinned, setPinned } = usePinnedTabs();

  const removePin = useCallback(
    (id: string) => setPinned(pinned.filter((p) => p !== id)),
    [pinned, setPinned]
  );
  const addPin = useCallback(
    (id: string) => {
      if (pinned.includes(id) || pinned.length >= MAX_PINNED) return;
      // eslint-disable-next-line react-doctor/rerender-functional-setstate -- setPinned is a custom hook setter (not useState); `pinned` is in useCallback deps so no stale closure risk
      setPinned([...pinned, id]);
    },
    [pinned, setPinned]
  );
  const move = useCallback(
    (id: string, dir: -1 | 1) => {
      const i = pinned.indexOf(id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= pinned.length) return;
      const next = [...pinned];
      [next[i], next[j]] = [next[j], next[i]];
      setPinned(next);
    },
    [pinned, setPinned]
  );

  const available = TOOLS.filter((t) => !pinned.includes(t.id));
  const canAdd = pinned.length < MAX_PINNED;

  const sections: { title: string; data: SectionItem[] }[] = [
    {
      title: `In tab bar (${pinned.length}/${MAX_PINNED})`,
      data: pinned.reduce<PinnedItem[]>((acc, id, idx) => {
        if (getTool(id)) {
          acc.push({ kind: 'pinned', id, idx, total: pinned.length });
        }
        return acc;
      }, []),
    },
    {
      title: 'More tools',
      data: available.map(
        (tool): AvailableItem => ({ kind: 'available', tool, canAdd })
      ),
    },
  ];

  const renderItem = useCallback(
    ({ item }: { item: SectionItem }) => {
      if (item.kind === 'pinned') {
        return (
          <View className="flex-row items-center justify-between">
            <ToolListRow
              label={getTool(item.id)?.label ?? item.id}
              onPress={() => removePin(item.id)}
              accessory="Remove"
            />
            <View className="flex-row gap-2 pr-4">
              <Text
                onPress={() => move(item.id, -1)}
                className={item.idx === 0 ? 'text-white/20' : 'text-white'}
              >
                ↑
              </Text>
              <Text
                onPress={() => move(item.id, 1)}
                className={
                  item.idx === item.total - 1 ? 'text-white/20' : 'text-white'
                }
              >
                ↓
              </Text>
            </View>
          </View>
        );
      }
      return (
        <ToolListRow
          label={item.tool.label}
          onPress={() => addPin(item.tool.id)}
          accessory={item.canAdd ? 'Add' : ''}
        />
      );
    },
    [removePin, addPin, move]
  );

  return (
    <View className="flex-1">
      <GradientBackground />
      <SectionList
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 16 }}
        sections={sections}
        keyExtractor={(item) =>
          item.kind === 'pinned' ? item.id : item.tool.id
        }
        renderSectionHeader={({ section }) => (
          <Text className="px-1 pb-1 pt-2 text-xs uppercase tracking-wide text-white/40">
            {section.title}
          </Text>
        )}
        renderItem={renderItem}
      />
    </View>
  );
}
