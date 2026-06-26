import { Grip, Minus, Plus } from 'lucide-react-native';
import { useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import ReorderableList, {
  type ReorderableListReorderEvent,
  reorderItems,
  useReorderableDrag,
} from 'react-native-reorderable-list';
import { GradientBackground } from '@/components/gradient-background';
import { ToolIcon } from '@/components/tool-icon';
import { usePinnedTabs } from '@/hooks/use-pinned-tabs';
import { MAX_PINNED } from '@/lib/tab-bar-settings';
import { getTool, TOOLS } from '@/lib/tools';

function PinnedRow({
  id,
  onRemove,
}: {
  id: string;
  onRemove: (id: string) => void;
}) {
  const drag = useReorderableDrag();
  const tool = getTool(id);
  if (!tool) return null;
  return (
    <Pressable
      onLongPress={drag}
      className="flex-row items-center justify-between px-4 py-3 active:opacity-60"
    >
      <View className="flex-row items-center gap-3">
        <Grip size={18} color="rgba(255,255,255,0.4)" />
        <ToolIcon name={tool.icon} />
        <Text className="text-base text-white">{tool.label}</Text>
      </View>
      <Pressable hitSlop={12} onPress={() => onRemove(id)}>
        <Minus size={20} color="rgba(255,255,255,0.6)" />
      </Pressable>
    </Pressable>
  );
}

export default function EditTabs() {
  const { pinned, setPinned } = usePinnedTabs();
  const available = TOOLS.filter(
    (t) => !pinned.includes(t.id) && t.pinnable !== false
  );
  const canAdd = pinned.length < MAX_PINNED;

  const onReorder = useCallback(
    ({ from, to }: ReorderableListReorderEvent) => {
      setPinned(reorderItems(pinned, from, to));
    },
    [pinned, setPinned]
  );

  const removePin = useCallback(
    (id: string) => setPinned(pinned.filter((p) => p !== id)),
    [pinned, setPinned]
  );
  const addPin = useCallback(
    (id: string) => {
      if (!canAdd) return;
      // eslint-disable-next-line react-doctor/rerender-functional-setstate -- setPinned is a MMKV-backed setter, not React.Dispatch; it does not accept a callback updater
      setPinned([...pinned, id]);
    },
    [canAdd, pinned, setPinned]
  );

  const Footer = (
    <View className="gap-1 pt-6">
      <Text className="px-4 pb-1 text-xs uppercase tracking-wide text-white/40">
        More tools
      </Text>
      {available.map((tool) => (
        <Pressable
          key={tool.id}
          onPress={() => addPin(tool.id)}
          disabled={!canAdd}
          className="flex-row items-center justify-between px-4 py-3 active:opacity-60"
          style={{ opacity: canAdd ? 1 : 0.4 }}
        >
          <View className="flex-row items-center gap-3">
            <ToolIcon name={tool.icon} />
            <Text className="text-base text-white">{tool.label}</Text>
          </View>
          <Plus size={20} color="rgba(255,255,255,0.6)" />
        </Pressable>
      ))}
    </View>
  );

  return (
    <View className="flex-1">
      <GradientBackground />
      <ReorderableList
        data={pinned}
        onReorder={onReorder}
        keyExtractor={(id) => id}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <Text className="px-4 pb-1 text-xs uppercase tracking-wide text-white/40">
            In tab bar ({pinned.length}/{MAX_PINNED})
          </Text>
        }
        ListFooterComponent={Footer}
        renderItem={({ item }) => <PinnedRow id={item} onRemove={removePin} />}
      />
    </View>
  );
}
