import { Check } from 'lucide-react-native';
import { Text, View } from 'react-native';
import { SectionLabel } from '@/components/section-label';
import { Surface } from '@/components/surface';
import { agitationSummary } from '@/lib/timer/agitation';
import type { TimerStage } from '@/lib/timer/types';
import {
  useAccentColor,
  useAccentFill,
  useDimInk,
  useNeutralFill,
} from '@/theme/use-phase-accent';
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
  const teal = useAccentColor('teal');
  const tealFill = useAccentFill('teal', '1f');
  const tealDoneFill = useAccentFill('teal', '33');
  const idleDot = useNeutralFill('rgba(255,255,255,0.1)');
  const idleNumber = useDimInk('#ffffff99');
  if (stages.length === 0) return null;
  return (
    <View className="gap-2">
      <SectionLabel>Stages</SectionLabel>
      <Surface className="gap-1">
        {stages.map((stage, index) => {
          const done = completed || index < currentStageIndex;
          const active = !completed && index === currentStageIndex;
          const temp = formatTemp(stage.temperatureF);
          return (
            <View
              key={stage.id}
              className="flex-row items-center gap-3 rounded-xl px-2 py-2"
              style={active ? { backgroundColor: tealFill } : null}
            >
              <View
                className="h-6 w-6 items-center justify-center rounded-full"
                style={{
                  backgroundColor: done ? tealDoneFill : idleDot,
                }}
              >
                {done ? (
                  <Check size={14} color={teal} />
                ) : (
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: active ? teal : idleNumber }}
                  >
                    {index + 1}
                  </Text>
                )}
              </View>
              <View className="flex-1">
                <Text
                  className={`text-base ${active ? 'font-semibold text-white' : done ? 'text-ink-40' : 'text-ink-80'}`}
                >
                  {stageDisplayName(stage)}
                </Text>
                {temp ? (
                  <Text className="text-xs text-ink-40">{temp}</Text>
                ) : null}
                {stage.agitationPattern ? (
                  <Text className="text-xs text-ink-40" numberOfLines={1}>
                    {agitationSummary(stage.agitationPattern)}
                  </Text>
                ) : null}
              </View>
              <Text
                className={`text-base ${active ? 'font-semibold text-white' : 'text-ink-50'}`}
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {formatDuration(stage.durationSeconds)}
              </Text>
            </View>
          );
        })}
      </Surface>
    </View>
  );
}
