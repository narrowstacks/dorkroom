import { Text, View } from 'react-native';
import { GlassCard } from '@/components/glass-card';
import type { FilmLogStats } from '@/lib/film-log-collection';

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function Label({ children, lines = 1 }: { children: string; lines?: number }) {
  return (
    <Text
      className="text-xs uppercase tracking-wide text-ink-50"
      numberOfLines={lines}
    >
      {children}
    </Text>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 justify-between gap-0.5">
      <Label lines={2}>{label}</Label>
      <Text className="text-base text-white" numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

/** A compact card read as one element: "This year" on its own row (rolls
 * STARTED this year and the frames on those rolls), then the most shot film and
 * most used camera side by side, which are ALL TIME and say so. */
export function FilmLogStatsStrip({ stats }: { stats: FilmLogStats }) {
  const rolls = plural(stats.rollsThisYear, 'roll');
  const frames = plural(stats.framesThisYear, 'frame');
  const film = stats.topFilm?.name ?? 'None yet';
  const camera = stats.topCamera?.name ?? 'None yet';
  return (
    <View
      accessible
      accessibilityLabel={`This year, ${rolls}, ${frames}. Top film, all time, ${film}. Top camera, all time, ${camera}.`}
    >
      <GlassCard compact className="gap-3">
        <View className="flex-row items-baseline justify-between gap-3">
          <View className="shrink-0">
            <Label>This year</Label>
          </View>
          <Text
            className="shrink text-right text-base text-white"
            numberOfLines={2}
          >
            {`${rolls} · ${frames}`}
          </Text>
        </View>
        <View className="flex-row gap-3">
          <Cell label="Film · all time" value={film} />
          <Cell label="Camera · all time" value={camera} />
        </View>
      </GlassCard>
    </View>
  );
}
