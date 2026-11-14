import { ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { NavRow } from '@/components/nav-row';
import { SectionLabel } from '@/components/section-label';
import { Surface } from '@/components/surface';
import { ToolIcon } from '@/components/tool-icon';
import type { EaselSummary } from '@/lib/home/easel-summary';
import { getTool } from '@/lib/tools';

export interface RecentRecipeRow {
  id: string;
  title: string;
  detail: string;
}

interface ResumeSectionsProps {
  easel: EaselSummary | null;
  recentToolIds: readonly string[];
  recentRecipes: readonly RecentRecipeRow[];
  onOpenEasel: () => void;
  onOpenTool: (toolId: string) => void;
  onOpenRecipe: (id: string) => void;
}

const chevron = <ChevronRight size={18} color="rgba(255,255,255,0.4)" />;

/** What Home picks up on a later launch: the last easel, tools and recipes. */
export function ResumeSections({
  easel,
  recentToolIds,
  recentRecipes,
  onOpenEasel,
  onOpenTool,
  onOpenRecipe,
}: ResumeSectionsProps) {
  return (
    <>
      {easel ? (
        <View className="gap-2">
          <SectionLabel>Last easel setup</SectionLabel>
          <NavRow
            label={easel.detail}
            value={easel.title}
            onPress={onOpenEasel}
          />
        </View>
      ) : null}

      {recentToolIds.length > 0 ? (
        <View className="gap-2">
          <SectionLabel>Recently used</SectionLabel>
          <Surface className="px-0 py-1">
            {recentToolIds.map((id) => {
              const tool = getTool(id);
              if (!tool) return null;
              return (
                <Pressable
                  key={id}
                  onPress={() => onOpenTool(id)}
                  accessibilityRole="button"
                  accessibilityLabel={tool.label}
                  className="flex-row items-center justify-between px-4 py-3 active:opacity-60"
                >
                  <View className="flex-row items-center gap-3">
                    <ToolIcon name={tool.icon} />
                    <Text className="text-base text-white">{tool.label}</Text>
                  </View>
                  {chevron}
                </Pressable>
              );
            })}
          </Surface>
        </View>
      ) : null}

      {recentRecipes.length > 0 ? (
        <View className="gap-2">
          <SectionLabel>Recent recipes</SectionLabel>
          <Surface className="px-0 py-1">
            {recentRecipes.map((recipe) => (
              <Pressable
                key={recipe.id}
                onPress={() => onOpenRecipe(recipe.id)}
                accessibilityRole="button"
                accessibilityLabel={`${recipe.title}, ${recipe.detail}`}
                className="flex-row items-center justify-between gap-3 px-4 py-3 active:opacity-60"
              >
                <View className="min-w-0 flex-1 gap-0.5">
                  <Text className="text-base text-white" numberOfLines={1}>
                    {recipe.title}
                  </Text>
                  <Text className="text-sm text-ink-50" numberOfLines={1}>
                    {recipe.detail}
                  </Text>
                </View>
                {chevron}
              </Pressable>
            ))}
          </Surface>
        </View>
      ) : null}
    </>
  );
}
