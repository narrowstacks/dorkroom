import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { GlassCard } from '@/components/glass-card';
import type { LiveFocus } from '@/hooks/use-live-inverter';
import { EditorButton } from './editor-button';
import { CHROME_TEXT_SCALE } from './editor-layout';

export interface FocusPanelProps {
  focus: LiveFocus;
  /** Where the lens is now, for the slider to show while autofocus has it. */
  lens: number;
  /** The lens position, 0 (near) to 1 (far); `commit` on release. */
  onLens: (lens: number, commit: boolean) => void;
  onAuto: () => void;
  onDone: () => void;
  compact?: boolean;
}

const percent = (lens: number) => `${Math.round(lens * 100)}%`;

/**
 * Manual focus for live mode: a near-to-far slider that locks the lens, and
 * a way back to autofocus. A tap on the stage still focuses on a point.
 */
export function FocusPanel({
  focus,
  lens,
  onLens,
  onAuto,
  onDone,
  compact = false,
}: FocusPanelProps) {
  const [dragging, setDragging] = useState<number | null>(null);
  const value = focus.mode === 'manual' ? focus.lens : lens;
  const shown = dragging ?? value;
  const manual = focus.mode === 'manual' || dragging !== null;
  const readout = manual ? percent(shown) : 'Auto';

  return (
    <GlassCard compact style={{ flexGrow: 1 }} className="flex-1 gap-1">
      <View className="flex-row items-center gap-2">
        <Slider
          style={{ flex: 1, height: 44 }}
          minimumValue={0}
          maximumValue={1}
          step={0.005}
          value={value}
          onSlidingStart={() => void Haptics.selectionAsync()}
          onValueChange={(v) => {
            setDragging(v);
            onLens(v, false);
          }}
          onSlidingComplete={(v) => {
            setDragging(null);
            onLens(v, true);
          }}
          minimumTrackTintColor={manual ? '#fbbf24' : 'rgba(255,255,255,0.5)'}
          maximumTrackTintColor="rgba(255,255,255,0.2)"
          thumbTintColor="#f5f5f4"
          accessibilityLabel="Manual focus"
          accessibilityValue={{ text: readout }}
          accessibilityHint="Slide toward near or far to lock the focus"
        />
        <Text
          maxFontSizeMultiplier={CHROME_TEXT_SCALE}
          className="min-w-14 text-right text-base font-semibold text-white"
          style={{ fontVariant: ['tabular-nums'] }}
          importantForAccessibility="no"
          accessibilityElementsHidden
        >
          {readout}
        </Text>
      </View>
      {compact ? null : (
        <View
          className="-mt-1 flex-row justify-between pr-[64px]"
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          <Text
            maxFontSizeMultiplier={CHROME_TEXT_SCALE}
            className="text-xs text-white/50"
          >
            Near
          </Text>
          <Text
            maxFontSizeMultiplier={CHROME_TEXT_SCALE}
            className="text-xs text-white/50"
          >
            Far
          </Text>
        </View>
      )}
      <View className="flex-row items-center justify-end gap-2">
        <EditorButton
          label="Autofocus"
          icon="a.circle"
          showLabel
          selected={focus.mode === 'auto'}
          accessibilityHint="Goes back to continuous autofocus"
          onPress={onAuto}
        />
        <EditorButton
          label="Done"
          icon="checkmark"
          showLabel
          primary
          onPress={onDone}
        />
      </View>
    </GlassCard>
  );
}
