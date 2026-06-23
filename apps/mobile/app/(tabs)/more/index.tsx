import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { SectionList, Text, TextInput, View } from 'react-native';
import { GradientBackground } from '@/components/gradient-background';
import { ToolListRow } from '@/components/tool-list-row';
import type { Tool } from '@/lib/tools';
import { CATEGORY_LABELS, CATEGORY_ORDER, TOOLS } from '@/lib/tools';

function ToolRow({ item }: { item: Tool }) {
  const onPress = useCallback(
    () => router.push(item.route as never),
    [item.route]
  );
  return <ToolListRow label={item.label} accessory="›" onPress={onPress} />;
}

export default function MoreIndex() {
  const [query, setQuery] = useState('');
  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result: { title: string; data: Tool[] }[] = [];
    for (const category of CATEGORY_ORDER) {
      const data = TOOLS.filter(
        (t) => t.category === category && t.label.toLowerCase().includes(q)
      );
      if (data.length > 0) {
        result.push({ title: CATEGORY_LABELS[category], data });
      }
    }
    return result;
  }, [query]);

  const goToEdit = useCallback(() => router.push('/more/edit'), []);

  const renderItem = useCallback(
    ({ item }: { item: Tool }) => <ToolRow item={item} />,
    []
  );

  return (
    <View className="flex-1">
      <GradientBackground />
      <SectionList
        contentInsetAdjustmentBehavior="automatic"
        sections={sections}
        keyExtractor={(t) => t.id}
        ListHeaderComponent={
          <View className="gap-3 p-4">
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search tools"
              placeholderTextColor="rgba(255,255,255,0.4)"
              className="rounded-xl bg-white/10 px-4 py-3 text-white"
            />
            <ToolListRow label="Edit Tabs" onPress={goToEdit} accessory="›" />
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text className="px-4 pb-1 pt-4 text-xs uppercase tracking-wide text-white/40">
            {section.title}
          </Text>
        )}
        renderItem={renderItem}
      />
    </View>
  );
}
