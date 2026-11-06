import type { HomeLinkTarget, HomeResultGroup } from '@dorkroom/logic';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { GlassCard } from '@/components/glass-card';
import { SectionLabel } from '@/components/section-label';
import { ToolIcon } from '@/components/tool-icon';
import { type HomeRoute, TOOL_ID_BY_HOME_ROUTE } from '@/lib/home/destination';
import { getTool } from '@/lib/tools';

interface ResultGroupsProps {
  groups: readonly HomeResultGroup[];
  onOpen: (target: HomeLinkTarget) => void;
  onOpenTool: (route: HomeRoute) => void;
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

/** Recipes, films, developers and tools matching the query, grouped. */
export function ResultGroups({
  groups,
  onOpen,
  onOpenTool,
}: ResultGroupsProps) {
  return (
    <>
      {groups.map((group) => (
        <View key={group.key} className="gap-2">
          <SectionLabel>
            {group.total >
            (group.key === 'tools' ? group.tools.length : group.items.length)
              ? `${group.label} (${group.total})`
              : group.label}
          </SectionLabel>
          <GlassCard className="px-0 py-1">
            {group.key === 'tools'
              ? group.tools.map((route) => {
                  const tool = getTool(TOOL_ID_BY_HOME_ROUTE[route]);
                  if (!tool) return null;
                  return (
                    <Pressable
                      key={route}
                      onPress={() => onOpenTool(route)}
                      accessibilityRole="button"
                      accessibilityLabel={tool.label}
                      className="flex-row items-center justify-between px-4 py-3 active:opacity-60"
                    >
                      <View className="flex-row items-center gap-3">
                        <ToolIcon name={tool.icon} />
                        <Text className="text-base text-white">
                          {tool.label}
                        </Text>
                      </View>
                      {chevron}
                    </Pressable>
                  );
                })
              : group.items.map((item) => (
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
      ))}
    </>
  );
}
