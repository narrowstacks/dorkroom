import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { SectionList, Text, TextInput, View } from 'react-native';
import { GradientBackground } from '@/components/gradient-background';
import { ToolListRow } from '@/components/tool-list-row';
import { CATEGORY_LABELS, CATEGORY_ORDER, TOOLS } from '@/lib/tools';

export default function MoreIndex() {
  const [query, setQuery] = useState('');
  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CATEGORY_ORDER.map((category) => ({
      title: CATEGORY_LABELS[category],
      data: TOOLS.filter(
        (t) => t.category === category && t.label.toLowerCase().includes(q)
      ),
    })).filter((s) => s.data.length > 0);
  }, [query]);

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
            <ToolListRow
              label="Edit Tabs"
              onPress={() => router.push('/more/edit')}
              accessory="›"
            />
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text className="px-4 pb-1 pt-4 text-xs uppercase tracking-wide text-white/40">
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => (
          <ToolListRow
            label={item.label}
            accessory="›"
            onPress={() => router.push(item.route as never)}
          />
        )}
      />
    </View>
  );
}
