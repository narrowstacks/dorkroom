import type { HomeSuggestion, HomeSuggestionHint } from '@dorkroom/logic';
import { Pressable, Text, View } from 'react-native';
import { Surface } from '@/components/surface';

const HINT_LABELS = {
  film: 'Film',
  developer: 'Developer',
  tool: 'Tool',
  recipe: 'Recipe',
  reciprocity: 'Reciprocity',
  border: 'Border',
  resize: 'Resize',
  mat: 'Mat',
  lens: 'Lens',
  stops: 'Stops',
} as const satisfies Record<HomeSuggestionHint, string>;

/** Completions and query templates for what is being typed; tapping one fills the box. */
export function SuggestionList({
  suggestions,
  onPick,
}: {
  suggestions: readonly HomeSuggestion[];
  onPick: (query: string) => void;
}) {
  if (suggestions.length === 0) return null;
  return (
    <Surface className="px-0 py-1">
      {suggestions.map((suggestion) => (
        <Pressable
          key={suggestion.query}
          onPress={() => onPick(suggestion.query)}
          accessibilityRole="button"
          accessibilityLabel={`${suggestion.label}, ${HINT_LABELS[suggestion.hint]} suggestion`}
          className="flex-row items-center justify-between gap-3 px-4 py-2.5 active:opacity-60"
        >
          <Text
            className="min-w-0 flex-1 text-base text-white"
            numberOfLines={1}
          >
            {suggestion.label}
          </Text>
          <View className="rounded-lg border-hw border-line bg-surface-strong px-2 py-0.5">
            <Text className="text-xs text-ink-70">
              {HINT_LABELS[suggestion.hint]}
            </Text>
          </View>
        </Pressable>
      ))}
    </Surface>
  );
}
