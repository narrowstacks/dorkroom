import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { GlassCard } from '@/components/glass-card';
import { GradientBackground } from '@/components/gradient-background';
import { ToolIcon } from '@/components/tool-icon';
import { ToolListRow } from '@/components/tool-list-row';
import type { Tool } from '@/lib/tools';
import { CATEGORY_LABELS, CATEGORY_ORDER, TOOLS } from '@/lib/tools';

const chevron = <ChevronRight size={18} color="rgba(255,255,255,0.4)" />;

export default function MoreIndex() {
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result: { title: string; tools: Tool[] }[] = [];
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

  return (
    <View className="flex-1">
      <GradientBackground />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 16, gap: 16 }}
      >
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search tools"
          placeholderTextColor="rgba(255,255,255,0.4)"
          className="rounded-xl bg-white/10 px-4 py-3 text-white"
        />

        <GlassCard className="px-0 py-1">
          <ToolListRow
            label="Edit Tabs"
            onPress={goToEdit}
            accessory={chevron}
          />
        </GlassCard>

        {groups.map((group) => (
          <View key={group.title} className="gap-2">
            <Text className="px-1 text-xs uppercase tracking-wide text-white/40">
              {group.title}
            </Text>
            <GlassCard className="px-0 py-1">
              {group.tools.map((tool) => (
                <ToolListRow
                  key={tool.id}
                  label={tool.label}
                  leading={<ToolIcon name={tool.icon} />}
                  accessory={chevron}
                  onPress={() => router.push(tool.route as never)}
                />
              ))}
            </GlassCard>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
