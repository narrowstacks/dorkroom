import { Text } from 'react-native';
import { developedDate } from '@/components/film-log/developed-date';
import { GlassCard } from '@/components/glass-card';
import { ResultRow } from '@/components/result-row';
import { SectionLabel } from '@/components/section-label';
import { developmentDetails } from '@/lib/roll-lifecycle';
import type { RollDevelopment } from '@/schemas/film-log.schema';

/** How a developed roll was developed: the record saved from the Process
 * Timer, or just the date from "Mark as developed". */
export function RollDevelopmentSection({
  development,
}: {
  development: RollDevelopment;
}) {
  const date = developedDate(development.developedAt);
  const rows = developmentDetails(development);
  return (
    <GlassCard className="gap-1">
      <SectionLabel>Developed</SectionLabel>
      {date ? <ResultRow label="Date" value={date} /> : null}
      {rows.map((row) => (
        <ResultRow key={row.label} label={row.label} value={row.value} />
      ))}
      {development.notes?.trim() ? (
        <Text className="text-sm text-ink-60">{development.notes}</Text>
      ) : null}
    </GlassCard>
  );
}
