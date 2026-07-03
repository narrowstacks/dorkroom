import { Check } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { GlassCard } from '@/components/glass-card';
import { SectionLabel } from '@/components/section-label';
import { agitationSummary } from '@/lib/timer/agitation';
import type { TimerStage } from '@/lib/timer/types';
import { ACCENT } from '@/theme/accents';
import { formatDuration, formatTemp, stageDisplayName } from './format';

interface StageListProps {
  stages: TimerStage[];
  currentStageIndex: number;
  /** True once the whole sequence has finished (every stage reads as done). */
  completed: boolean;
}

/** Ordered, read-only stage list; the active stage is highlighted with the accent. */
export function StageList({
  stages,
  currentStageIndex,
  completed,
}: StageListProps) {
  if (stages.length === 0) return null;
  return (
    <View className="gap-2">
      <SectionLabel>Stages</SectionLabel>
      <GlassCard className="gap-1">
        {stages.map((stage, index) => {
          const done = completed || index < currentStageIndex;
          const active = !completed && index === currentStageIndex;
          const temp = formatTemp(stage.temperatureF);
          return (
            <View
              key={stage.id}
              className="flex-row items-center gap-3 rounded-xl px-2 py-2"
              style={active ? { backgroundColor: `${ACCENT.green}1f` } : null}
            >
              <View
                className="h-6 w-6 items-center justify-center rounded-full"
                style={{
                  backgroundColor: done
                    ? `${ACCENT.green}33`
                    : 'rgba(255,255,255,0.1)',
                }}
              >
                {done ? (
                  <Check size={14} color={ACCENT.green} />
                ) : (
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: active ? ACCENT.green : '#ffffff99' }}
                  >
                    {index + 1}
                  </Text>
                )}
              </View>
              <View className="flex-1">
                <Text
                  className={`text-base ${active ? 'font-semibold text-white' : done ? 'text-white/40' : 'text-white/80'}`}
                >
                  {stageDisplayName(stage)}
                </Text>
                {temp ? (
                  <Text className="text-xs text-white/40">{temp}</Text>
                ) : null}
                {stage.agitationPattern ? (
                  <Text className="text-xs text-white/40" numberOfLines={1}>
                    {agitationSummary(stage.agitationPattern)}
                  </Text>
                ) : null}
              </View>
              <Text
                className={`text-base ${active ? 'font-semibold text-white' : 'text-white/50'}`}
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {formatDuration(stage.durationSeconds)}
              </Text>
            </View>
          );
        })}
      </GlassCard>
    </View>
  );
}
