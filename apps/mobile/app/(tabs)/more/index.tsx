import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Text, TextInput, View } from 'react-native';
import { GlassCard } from '@/components/glass-card';
import { GradientBackground } from '@/components/gradient-background';
import { ToolIcon } from '@/components/tool-icon';
import { ToolListRow } from '@/components/tool-list-row';
import type { Tool } from '@/lib/tools';
import { CATEGORY_LABELS, CATEGORY_ORDER, TOOLS } from '@/lib/tools';

const chevron = <ChevronRight size={18} color="rgba(255,255,255,0.4)" />;

type Group = { title: string; tools: Tool[] };

function ToolRow({ tool }: { tool: Tool }) {
  const handlePress = useCallback(
    () => router.push(tool.route as never),
    [tool.route]
  );
  const leading = useMemo(() => <ToolIcon name={tool.icon} />, [tool.icon]);
  return (
    <ToolListRow
      label={tool.label}
      leading={leading}
      accessory={chevron}
      onPress={handlePress}
    />
  );
}

function GroupCard({ group }: { group: Group }) {
  return (
    <View className="gap-2">
      <Text className="px-1 text-xs uppercase tracking-wide text-white/40">
        {group.title}
      </Text>
      <GlassCard className="px-0 py-1">
        {group.tools.map((tool) => (
          <ToolRow key={tool.id} tool={tool} />
        ))}
      </GlassCard>
    </View>
  );
}

export default function MoreIndex() {
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result: Group[] = [];
    for (const category of CATEGORY_ORDER) {
      const tools = TOOLS.filter(
        (t) => t.category === category && t.label.toLowerCase().includes(q)
      );
      if (tools.length > 0) {
        result.push({ title: CATEGORY_LABELS[category], tools });
      }
    }
    return result;
  }, [query]);

  const goToEdit = useCallback(() => router.push('/more/edit'), []);

  const renderGroup = useCallback(
    ({ item: group }: { item: Group }) => <GroupCard group={group} />,
    []
  );

  const header = (
    <View className="gap-4 pb-4">
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search tools"
        placeholderTextColor="rgba(255,255,255,0.4)"
        className="rounded-xl bg-white/10 px-4 py-3 text-white"
      />

      <GlassCard className="px-0 py-1">
        <ToolListRow label="Edit Tabs" onPress={goToEdit} accessory={chevron} />
      </GlassCard>
    </View>
  );

  return (
    <View className="flex-1">
      <GradientBackground />
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 16, gap: 16 }}
        data={groups}
        keyExtractor={(group) => group.title}
        ListHeaderComponent={header}
        renderItem={renderGroup}
      />
    </View>
  );
}
