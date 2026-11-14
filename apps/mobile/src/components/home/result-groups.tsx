import type { HomeLinkTarget, HomeResultGroup } from '@dorkroom/logic';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { StatusPill } from '@/components/film-log/roll-row';
import { SectionLabel } from '@/components/section-label';
import { Surface } from '@/components/surface';
import { ToolIcon } from '@/components/tool-icon';
import { stacksRollRow } from '@/lib/film-log-list';
import type { FilmLogMatches } from '@/lib/home/film-log-matches';
import { getTool } from '@/lib/tools';

interface ResultGroupsProps {
  groups: readonly HomeResultGroup[];
  /** The tools to list (`homeToolIds`): the shared matches plus label matches. */
  toolIds: readonly string[];
  /** The user's own film log, local data shown above the catalog groups. */
  filmLog: FilmLogMatches;
  onOpen: (target: HomeLinkTarget) => void;
  onOpenTool: (toolId: string) => void;
  onOpenRoll: (rollId: string) => void;
  onOpenGear: () => void;
}

const chevron = <ChevronRight size={18} color="rgba(255,255,255,0.4)" />;

function ResultRow({
  title,
  detail,
  meta,
  status,
  onPress,
}: {
  title: string;
  detail?: string;
  meta?: string;
  /** A roll's status, as the Film Log list shows it: a `StatusPill`. */
  status?: { label: string; tinted: boolean };
  onPress: () => void;
}) {
  const { fontScale } = useWindowDimensions();
  // As in the Film Log's rows, the pill drops under the text at the
  // accessibility sizes so the title keeps the width.
  const stacked = status !== undefined && stacksRollRow(fontScale);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[title, detail, status?.label, meta]
        .filter(Boolean)
        .join(', ')}
      className="flex-row items-center justify-between gap-3 px-4 py-3 active:opacity-60"
    >
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="text-base text-white" numberOfLines={1}>
          {title}
        </Text>
        {detail ? (
          <Text
            className="text-sm text-ink-50"
            // A roll's detail ends in its frame count: two lines beside the
            // pill, all of it once the pill drops below, so the count is
            // never truncated away.
            numberOfLines={status ? (stacked ? undefined : 2) : 1}
          >
            {detail}
          </Text>
        ) : null}
        {stacked && status ? (
          <View className="items-start pt-1">
            <StatusPill label={status.label} tinted={status.tinted} />
          </View>
        ) : null}
      </View>
      {meta ? <Text className="text-sm text-ink-60">{meta}</Text> : null}
      {status && !stacked ? (
        <View className="shrink-0">
          <StatusPill label={status.label} tinted={status.tinted} />
        </View>
      ) : null}
      {chevron}
    </Pressable>
  );
}

function FilmLogRows({
  matches,
  onOpenRoll,
  onOpenGear,
}: {
  matches: FilmLogMatches;
  onOpenRoll: (rollId: string) => void;
  onOpenGear: () => void;
}) {
  if (matches.rolls.length === 0 && matches.cameras.length === 0) return null;
  return (
    <View className="gap-2">
      <SectionLabel>Your film log</SectionLabel>
      <Surface className="px-0 py-1">
        {matches.rolls.map((roll) => (
          <ResultRow
            key={`roll-${roll.rollId}`}
            title={roll.title}
            detail={roll.subtitle}
            status={{ label: roll.status, tinted: roll.inCamera }}
            onPress={() => onOpenRoll(roll.rollId)}
          />
        ))}
        {matches.cameras.map((camera) => (
          <ResultRow
            key={`camera-${camera.cameraId}`}
            title={camera.title}
            detail={camera.subtitle}
            onPress={onOpenGear}
          />
        ))}
      </Surface>
    </View>
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
      <Surface className="px-0 py-1">
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
      </Surface>
    </View>
  );
}

/**
 * The user's film log, then recipes, films, developers and tools matching the
 * query, grouped. Tools sit
 * where the shared search put them, or last when only a label matched.
 */
export function ResultGroups({
  groups,
  toolIds,
  filmLog,
  onOpen,
  onOpenTool,
  onOpenRoll,
  onOpenGear,
}: ResultGroupsProps) {
  const tools =
    toolIds.length > 0 ? (
      <ToolRows key="tools" toolIds={toolIds} onOpenTool={onOpenTool} />
    ) : null;
  const sharedHasTools = groups.some((group) => group.key === 'tools');
  return (
    <>
      <FilmLogRows
        matches={filmLog}
        onOpenRoll={onOpenRoll}
        onOpenGear={onOpenGear}
      />
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
            <Surface className="px-0 py-1">
              {group.items.map((item) => (
                <ResultRow
                  key={`${item.title}|${item.detail}|${item.meta}`}
                  title={item.title}
                  detail={item.detail}
                  meta={item.meta}
                  onPress={() => onOpen(item.target)}
                />
              ))}
            </Surface>
          </View>
        )
      )}
      {sharedHasTools ? null : tools}
    </>
  );
}
