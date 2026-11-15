import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useRecordResult } from '@/hooks/use-record-result';
import { formatReadoutSummary } from '@/lib/result-recorder';
import type { RecordingToolId } from '@/lib/tools';
import type { AccentColor } from '@/theme/accents';
import { readoutText } from '@/theme/tokens';
import { useAccentColor } from '@/theme/use-phase-accent';

interface ReadoutProps {
  /** What the number is, e.g. "New time". Shown as a small uppercase eyebrow. */
  label: string;
  /** The answer. `null` shows an en dash while the inputs are incomplete. */
  value: string | null;
  unit?: string;
  /** Supporting figures in one wrapping row under the value. */
  facts?: string[];
  accent: AccentColor;
  /** Remember this value as the tool's last result, shown on its hub tile. */
  toolId?: RecordingToolId;
  /** Below the readout, outside the spoken summary: warnings and hints. */
  note?: ReactNode;
  /** Under the note, outside the spoken summary: next-step actions, such as
   * "Save to roll", stacked with a gap. */
  actions?: ReactNode;
  /** The whole spoken answer after the label, facts included, e.g.
   * "15.12 seconds, plus one third stop, times 1.26". Defaults to the value
   * and unit as written followed by the facts. */
  accessibilityValueText?: string;
  className?: string;
}

/**
 * The pinned answer on an answer-first calculator screen. One accessible
 * element reads the label, value and facts together; `note` stays separate so
 * a warning remains its own VoiceOver stop.
 */
export function Readout({
  label,
  value,
  unit,
  facts,
  accent,
  toolId,
  note,
  actions,
  accessibilityValueText,
  className,
}: ReadoutProps) {
  const hue = useAccentColor(accent);
  useRecordResult(toolId, formatReadoutSummary(value, unit));
  const spoken =
    value === null
      ? 'no result yet'
      : (accessibilityValueText ?? (unit ? `${value} ${unit}` : value));
  const spokenFacts =
    accessibilityValueText === undefined && facts && facts.length > 0
      ? `. ${facts.join(', ')}`
      : '';
  return (
    <View className={`gap-1 ${className ?? ''}`}>
      <View
        accessible
        accessibilityRole="text"
        accessibilityLabel={`${label}, ${spoken}${spokenFacts}`}
        className="gap-1"
      >
        <Text className="text-xs font-semibold uppercase tracking-wide text-ink-60">
          {label}
        </Text>
        {value === null ? (
          <Text
            className="text-ink-40"
            style={[readoutText, { fontSize: 54, fontWeight: '700' }]}
          >
            –
          </Text>
        ) : (
          <View className="flex-row items-baseline gap-1">
            <Text
              adjustsFontSizeToFit
              numberOfLines={1}
              minimumFontScale={0.5}
              className="shrink font-bold"
              style={[
                readoutText,
                { fontSize: 54, fontWeight: '700', color: hue },
              ]}
            >
              {value}
            </Text>
            {unit ? (
              <Text style={[readoutText, { fontSize: 20, color: hue }]}>
                {unit}
              </Text>
            ) : null}
          </View>
        )}
        {facts && facts.length > 0 ? (
          <View className="flex-row flex-wrap gap-x-3 gap-y-0.5">
            {facts.map((fact) => (
              <Text
                key={fact}
                className="text-sm text-ink-60"
                style={readoutText}
              >
                {fact}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
      {note}
      {actions ? <View className="gap-2 pt-1">{actions}</View> : null}
    </View>
  );
}
