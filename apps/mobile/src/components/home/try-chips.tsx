import { memo, useCallback } from 'react';
import { FlatList, type ListRenderItem, Pressable, Text } from 'react-native';
import { TRY_QUERIES } from '@/lib/home/try-queries';

const QUERIES = [...TRY_QUERIES];

const TryChip = memo(function TryChip({
  query,
  onTry,
}: {
  query: string;
  onTry: (query: string) => void;
}) {
  const handlePress = useCallback(() => onTry(query), [onTry, query]);
  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Try ${query}`}
      className="rounded-full bg-white/10 px-3 py-1.5 active:opacity-60"
    >
      <Text className="text-xs text-white/80">{query}</Text>
    </Pressable>
  );
});

/** Example queries, one tap to try. */
export function TryChips({ onTry }: { onTry: (query: string) => void }) {
  const renderItem = useCallback<ListRenderItem<string>>(
    ({ item }) => <TryChip query={item} onTry={onTry} />,
    [onTry]
  );
  return (
    <FlatList
      horizontal
      data={QUERIES}
      keyExtractor={(query) => query}
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ gap: 8, alignItems: 'center' }}
      ListHeaderComponent={<Text className="text-xs text-white/40">Try</Text>}
      renderItem={renderItem}
    />
  );
}
