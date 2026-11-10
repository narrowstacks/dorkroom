import * as Haptics from 'expo-haptics';
import { Pressable, Text, View } from 'react-native';
import {
  buildStopLadder,
  formatStopsLabel,
  LADDER_INCREMENTS,
  ladderFontSize,
  type LadderIncrementValue,
  spokenStops,
} from '@/components/exposure/stop-ladder-logic';
import { SegmentedControl } from '@/components/segmented-control';
import { spokenDuration } from '@/lib/spoken-time';
import type { AccentColor } from '@/theme/accents';
import { readoutText } from '@/theme/tokens';
import { useSelectionTint } from '@/theme/use-phase-accent';

const INCREMENT_OPTIONS = LADDER_INCREMENTS.map(({ label, value }) => ({
  label,
  value,
}));

interface StopLadderProps {
  /** The base exposure time in seconds. */
  baseSeconds: number;
  /** The stops currently entered, or `null` with no result. The ladder
   * recentres on them. */
  stops: number | null;
  /** Called with the tapped cell's stops. */
  onSelect: (stops: number) => void;
  /** The screen's time formatter, so cells read like the readout. */
  formatTime: (seconds: number) => string;
  /** The step between cells, as a `LADDER_INCREMENTS` value. */
  increment: LadderIncrementValue;
  onIncrementChange: (increment: LadderIncrementValue) => void;
  accent: AccentColor;
  className?: string;
}

/**
 * Five exposure times around the current stops, one tap apart. Replaces the
 * stop presets, custom stops field and stepper: the cells show what each
 * choice would give, and the window recentres on whatever is selected.
 */
export function StopLadder({
  baseSeconds,
  stops,
  onSelect,
  formatTime,
  increment,
  onIncrementChange,
  accent,
  className,
}: StopLadderProps) {
  const step = LADDER_INCREMENTS.find((i) => i.value === increment);
  const cells = buildStopLadder({
    baseSeconds,
    stops,
    increment: step?.stops ?? LADDER_INCREMENTS[0].stops,
  });
  const tint = useSelectionTint(accent);
  const fontSize = ladderFontSize(cells.map((c) => formatTime(c.seconds)));

  return (
    <View className={`gap-3 p-3 ${className ?? ''}`}>
      <View className="flex-row gap-2">
        {cells.map((cell) => (
          <Pressable
            key={cell.stops}
            disabled={!cell.enabled}
            onPress={() => {
              Haptics.selectionAsync();
              onSelect(cell.stops);
            }}
            accessibilityRole="button"
            accessibilityLabel={`${spokenStops(cell.stops)}, ${spokenDuration(formatTime(cell.seconds))}`}
            accessibilityState={{
              selected: cell.selected,
              disabled: !cell.enabled,
            }}
            className="min-h-14 flex-1 items-center justify-center gap-0.5 rounded-xl px-1 py-2"
            style={[
              cell.selected
                ? {
                    backgroundColor: tint.backgroundColor,
                    borderWidth: 1,
                    borderColor: tint.borderColor,
                  }
                : null,
              cell.enabled ? null : { opacity: 0.4 },
            ]}
          >
            <Text
              numberOfLines={1}
              className="font-bold text-white"
              style={[
                readoutText,
                { fontSize, fontWeight: '700' },
                cell.selected ? { color: tint.color } : null,
              ]}
            >
              {formatTime(cell.seconds)}
            </Text>
            <Text className="text-xs text-ink-60">
              {formatStopsLabel(cell.stops)}
            </Text>
          </Pressable>
        ))}
      </View>
      <SegmentedControl
        accent={accent}
        accessibilityLabel="Ladder step"
        options={INCREMENT_OPTIONS}
        value={increment}
        onChange={onIncrementChange}
      />
    </View>
  );
}
