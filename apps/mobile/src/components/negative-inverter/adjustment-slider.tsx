import Slider from '@react-native-community/slider';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  type AdjustmentSpec,
  CHROME_TEXT_SCALE,
  formatAdjustment,
  isDefaultAdjustment,
} from './editor-layout';

export interface AdjustmentSliderProps {
  spec: AdjustmentSpec;
  value: number;
  /** Hide the end labels, to give a small phone's photo the room. */
  compact?: boolean;
  /** Every move, for the live preview. Must not cause a screen re-render. */
  onPreview: (value: number) => void;
  /** On release, to commit the value. */
  onCommit: (value: number) => void;
  /** Put this adjustment back to its default. */
  onReset: () => void;
  className?: string;
}

/**
 * The one slider of the adjustments panel, with its value and a reset. The
 * readout tracks the drag locally, so only this row re-renders while the
 * canvas redraws from the previewed uniforms.
 */
export function AdjustmentSlider({
  spec,
  value,
  compact = false,
  onPreview,
  onCommit,
  onReset,
  className = '',
}: AdjustmentSliderProps) {
  // The value mid-drag; null when idle, so the committed value shows.
  const [dragging, setDragging] = useState<number | null>(null);
  const shown = dragging ?? value;
  const atDefault = isDefaultAdjustment(spec.key, shown);
  const readout = formatAdjustment(spec.key, shown);

  return (
    <View className={className}>
      <View className="flex-row items-center gap-2">
        <Slider
          style={{ flex: 1, height: 44 }}
          minimumValue={spec.min}
          maximumValue={spec.max}
          step={spec.step}
          value={value}
          onValueChange={(v) => {
            setDragging(v);
            onPreview(v);
          }}
          onSlidingComplete={(v) => {
            setDragging(null);
            onCommit(v);
          }}
          minimumTrackTintColor="#e11d48"
          maximumTrackTintColor="rgba(255,255,255,0.2)"
          thumbTintColor="#f5f5f4"
          accessibilityLabel={spec.label}
          accessibilityValue={{ text: readout }}
          accessibilityHint={`Slide toward ${spec.ends[0]} or ${spec.ends[1]}`}
        />
        <Text
          maxFontSizeMultiplier={CHROME_TEXT_SCALE}
          className="min-w-16 text-right text-base font-semibold text-white"
          style={{ fontVariant: ['tabular-nums'] }}
          importantForAccessibility="no"
          accessibilityElementsHidden
        >
          {readout}
        </Text>
        <Pressable
          onPress={onReset}
          disabled={atDefault}
          accessibilityRole="button"
          accessibilityLabel={`Reset ${spec.label}`}
          accessibilityState={{ disabled: atDefault }}
          className="min-h-11 min-w-11 items-center justify-center rounded-full bg-white/10 active:opacity-70"
        >
          <SymbolView
            name="arrow.uturn.backward"
            size={16}
            tintColor={atDefault ? 'rgba(255,255,255,0.3)' : '#ffffff'}
          />
        </Pressable>
      </View>
      {compact ? null : (
        <View
          className="-mt-1 flex-row justify-between pr-[128px]"
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          <Text
            maxFontSizeMultiplier={CHROME_TEXT_SCALE}
            className="text-xs text-white/50"
          >
            {spec.ends[0]}
          </Text>
          <Text
            maxFontSizeMultiplier={CHROME_TEXT_SCALE}
            className="text-xs text-white/50"
          >
            {spec.ends[1]}
          </Text>
        </View>
      )}
    </View>
  );
}
