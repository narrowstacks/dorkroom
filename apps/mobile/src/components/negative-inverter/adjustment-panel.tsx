import type { InversionAdjustments, NegativeFilmType } from '@dorkroom/logic';
import { DEFAULT_INVERSION_ADJUSTMENTS } from '@dorkroom/logic';
import * as Haptics from 'expo-haptics';
import { memo, useCallback } from 'react';
import {
  FlatList,
  type ListRenderItem,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';
import { GlassCard } from '@/components/glass-card';
import { AdjustmentSlider } from './adjustment-slider';
import {
  activeAdjustment,
  type AdjustmentKey,
  adjustmentsFor,
  type AdjustmentSpec,
  CHROME_TEXT_SCALE,
  formatAdjustment,
  isDefaultAdjustment,
} from './editor-layout';

export interface AdjustmentPanelProps {
  filmType: NegativeFilmType;
  adjustments: InversionAdjustments;
  /** A slider mid-drag: redraw without committing. */
  onPreview: (key: AdjustmentKey, value: number) => void;
  onCommit: (key: AdjustmentKey, value: number) => void;
  /** The adjustment the slider edits. Held by the screen, so it survives
   *  the panel giving way to a tool hint. */
  chosen: AdjustmentKey;
  onChoose: (key: AdjustmentKey) => void;
  compact?: boolean;
  className?: string;
}

const CHIP_SLOP = { top: 4, bottom: 4, left: 0, right: 0 };
const SELECTED = { selected: true };
const UNSELECTED = { selected: false };

const styles = StyleSheet.create({
  row: { gap: 6 },
  numbers: { fontVariant: ['tabular-nums'] },
});

interface AdjustmentChipProps {
  spec: AdjustmentSpec;
  value: number;
  selected: boolean;
  onChoose: (key: AdjustmentKey) => void;
}

/** One parameter in the selector, with its value once it is edited. */
const AdjustmentChip = memo(function AdjustmentChip({
  spec,
  value,
  selected,
  onChoose,
}: AdjustmentChipProps) {
  const edited = !isDefaultAdjustment(spec.key, value);
  const readout = formatAdjustment(spec.key, value);
  const choose = useCallback(() => {
    if (selected) return;
    void Haptics.selectionAsync();
    onChoose(spec.key);
  }, [onChoose, selected, spec.key]);
  return (
    <Pressable
      onPress={choose}
      accessibilityRole="tab"
      accessibilityLabel={`${spec.label}, ${readout}`}
      accessibilityState={selected ? SELECTED : UNSELECTED}
      hitSlop={CHIP_SLOP}
      className={`min-h-9 flex-row items-center gap-1.5 rounded-full px-3 ${
        selected ? 'bg-white' : 'bg-white/10'
      }`}
    >
      <Text
        maxFontSizeMultiplier={CHROME_TEXT_SCALE}
        className={`text-sm font-semibold ${
          selected ? 'text-[#0b0b0c]' : 'text-white/80'
        }`}
      >
        {spec.label}
      </Text>
      {edited ? (
        <Text
          maxFontSizeMultiplier={CHROME_TEXT_SCALE}
          className={`text-xs ${selected ? 'text-rose-700' : 'text-rose-300'}`}
          style={styles.numbers}
        >
          {readout}
        </Text>
      ) : null}
    </Pressable>
  );
});

const keyOf = (spec: AdjustmentSpec) => spec.key;

/**
 * The adjustments as a photo editor shows them: a row of parameters, each
 * with its value, and one slider for the selected one. Two short rows in
 * place of a stack of five sliders, so the photo keeps the screen.
 */
export function AdjustmentPanel({
  filmType,
  adjustments,
  onPreview,
  onCommit,
  chosen,
  onChoose,
  compact = false,
  className = '',
}: AdjustmentPanelProps) {
  const active = activeAdjustment(chosen, filmType);
  const renderChip = useCallback<ListRenderItem<AdjustmentSpec>>(
    ({ item }) => (
      <AdjustmentChip
        spec={item}
        value={adjustments[item.key]}
        selected={item.key === active.key}
        onChoose={onChoose}
      />
    ),
    [adjustments, active.key, onChoose]
  );

  return (
    <GlassCard compact className={`gap-1 ${className}`}>
      <FlatList
        horizontal
        data={adjustmentsFor(filmType)}
        keyExtractor={keyOf}
        renderItem={renderChip}
        // renderItem reads the selection and values from props.
        extraData={renderChip}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        accessibilityRole="tablist"
        accessibilityLabel="Adjustment"
      />
      <AdjustmentSlider
        // Remount per adjustment, so a drag never carries over to another.
        key={active.key}
        spec={active}
        value={adjustments[active.key]}
        compact={compact}
        onPreview={(v) => onPreview(active.key, v)}
        onCommit={(v) => onCommit(active.key, v)}
        onReset={() =>
          onCommit(active.key, DEFAULT_INVERSION_ADJUSTMENTS[active.key])
        }
      />
    </GlassCard>
  );
}
