import type { NegativeFilmType } from '@dorkroom/logic';
import * as Haptics from 'expo-haptics';
import { type SFSymbol, SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { GlassCard } from '@/components/glass-card';
import { EditorButton } from './editor-button';
import { CHROME_TEXT_SCALE } from './editor-layout';

/**
 * Small pieces shared by the photo editor and live mode: the film type
 * toggle, the tool hint that stands in for the adjustments while a tool is
 * on, and the hold-for-negative button over the stage.
 */

export interface FilmTypeToggleProps {
  value: NegativeFilmType;
  onChange: (value: NegativeFilmType) => void;
  className?: string;
}

/** One pill that flips between colour and black and white film. */
export function FilmTypeToggle({
  value,
  onChange,
  className = '',
}: FilmTypeToggleProps) {
  const c41 = value === 'c41';
  return (
    <Pressable
      onPress={() => {
        void Haptics.selectionAsync();
        onChange(c41 ? 'bw' : 'c41');
      }}
      accessibilityRole="button"
      accessibilityLabel={`Film type, ${c41 ? 'C-41 colour' : 'black and white'}`}
      accessibilityHint={`Switches to ${c41 ? 'black and white' : 'C-41 colour'} film`}
      className={`min-h-11 flex-row items-center gap-1.5 rounded-full bg-white/10 px-3.5 active:opacity-70 ${className}`}
    >
      <View
        className={`h-2.5 w-2.5 rounded-full ${c41 ? 'bg-amber-400' : 'bg-white/80'}`}
      />
      <Text
        maxFontSizeMultiplier={CHROME_TEXT_SCALE}
        className="text-sm font-semibold text-white"
      >
        {c41 ? 'C-41' : 'B&W'}
      </Text>
      <SymbolView
        name="arrow.left.arrow.right"
        size={12}
        tintColor="rgba(255,255,255,0.6)"
      />
    </Pressable>
  );
}

export interface ToolHintProps {
  hint: string;
  onDone: () => void;
  /** A tool's own action, such as clearing the neutral or going back to
   *  the automatic base. */
  extra?: ReactNode;
  className?: string;
}

/** What the active tool does and how to leave it, in the panel's place. */
export function ToolHint({
  hint,
  onDone,
  extra,
  className = '',
}: ToolHintProps) {
  return (
    <GlassCard
      compact
      style={{ flexGrow: 1 }}
      className={`flex-1 justify-between gap-2 ${className}`}
    >
      <Text
        maxFontSizeMultiplier={CHROME_TEXT_SCALE}
        className="text-sm text-white/80"
        accessibilityRole="text"
      >
        {hint}
      </Text>
      <View className="flex-row items-center justify-end gap-2">
        {extra}
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

export interface HoldButtonProps {
  onHold: (holding: boolean) => void;
  disabled?: boolean;
  className?: string;
}

/** Shows the negative while pressed: the before of a before and after. */
export function HoldButton({
  onHold,
  disabled = false,
  className = '',
}: HoldButtonProps) {
  return (
    <Pressable
      onPressIn={() => onHold(true)}
      onPressOut={() => onHold(false)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Hold to see the negative"
      accessibilityState={{ disabled }}
      className={`h-11 w-11 items-center justify-center rounded-full bg-black/70 active:bg-white ${className}`}
    >
      <SymbolView
        name="circle.lefthalf.filled"
        size={20}
        tintColor={disabled ? 'rgba(255,255,255,0.35)' : '#ffffff'}
      />
    </Pressable>
  );
}

export interface ToolButtonProps {
  label: string;
  icon: SFSymbol;
  selected: boolean;
  onPress: () => void;
  className?: string;
}

/**
 * A tool in the tool row: icon over a short label, sharing the row equally,
 * as the Photos editor lays out its tools. Fits four tools and a reset on a
 * 375 pt phone.
 */
export function ToolButton({
  label,
  icon,
  selected,
  onPress,
  className = '',
}: ToolButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      className={`min-h-11 flex-1 items-center justify-center gap-0.5 rounded-xl px-1 py-1 active:opacity-70 ${
        selected ? 'bg-white' : 'bg-white/10'
      } ${className}`}
    >
      <SymbolView
        name={icon}
        size={16}
        tintColor={selected ? '#0b0b0c' : '#ffffff'}
      />
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={CHROME_TEXT_SCALE}
        className={`text-[11px] font-semibold ${
          selected ? 'text-[#0b0b0c]' : 'text-white/90'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
