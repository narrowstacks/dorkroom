import type { HomeLinkTarget, HomeResultGroup } from '@dorkroom/logic';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { GlassCard } from '@/components/glass-card';
import { SectionLabel } from '@/components/section-label';
import { ToolIcon } from '@/components/tool-icon';
import { getTool } from '@/lib/tools';

interface ResultGroupsProps {
  groups: readonly HomeResultGroup[];
  /** The tools to list (`homeToolIds`): the shared matches plus label matches. */
  toolIds: readonly string[];
  onOpen: (target: HomeLinkTarget) => void;
  onOpenTool: (toolId: string) => void;
}

const chevron = <ChevronRight size={18} color="rgba(255,255,255,0.4)" />;

function ResultRow({
  title,
  detail,
  meta,
  onPress,
}: {
  title: string;
  detail?: string;
  meta?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[title, detail, meta].filter(Boolean).join(', ')}
      className="flex-row items-center justify-between gap-3 px-4 py-3 active:opacity-60"
    >
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="text-base text-white" numberOfLines={1}>
          {title}
        </Text>
        {detail ? (
          <Text className="text-sm text-white/50" numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
      </View>
      {meta ? <Text className="text-sm text-white/60">{meta}</Text> : null}
      {chevron}
    </Pressable>
  );
}

function ToolRows({
  toolIds,
  onOpenTool,
}: {
  toolIds: readonly string[];
  onOpenTool: (toolId: string) => void;
}) {
  return (
    <View className="gap-2">
      <SectionLabel>Tools</SectionLabel>
      <GlassCard className="px-0 py-1">
        {toolIds.map((id) => {
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
      </GlassCard>
    </View>
  );
}

/**
 * Recipes, films, developers and tools matching the query, grouped. Tools sit
 * where the shared search put them, or last when only a label matched.
 */
export function ResultGroups({
  groups,
  toolIds,
  onOpen,
  onOpenTool,
}: ResultGroupsProps) {
  const tools =
    toolIds.length > 0 ? (
      <ToolRows key="tools" toolIds={toolIds} onOpenTool={onOpenTool} />
    ) : null;
  const sharedHasTools = groups.some((group) => group.key === 'tools');
  return (
    <>
      {groups.map((group) =>
        group.key === 'tools' ? (
          tools
        ) : (
          <View key={group.key} className="gap-2">
            <SectionLabel>
              {group.total > group.items.length
                ? `${group.label} (${group.total})`
                : group.label}
            </SectionLabel>
            <GlassCard className="px-0 py-1">
              {group.items.map((item) => (
                <ResultRow
                  key={`${item.title}|${item.detail}|${item.meta}`}
                  title={item.title}
                  detail={item.detail}
                  meta={item.meta}
                  onPress={() => onOpen(item.target)}
                />
              ))}
            </GlassCard>
          </View>
        )
      )}
      {sharedHasTools ? null : tools}
    </>
  );
}
