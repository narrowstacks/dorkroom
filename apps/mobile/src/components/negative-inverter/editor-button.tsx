import { type SFSymbol, SymbolView } from 'expo-symbols';
import { ActivityIndicator, Pressable, Text } from 'react-native';
import { useCommitStyle, useSelectedInk } from '@/theme/use-phase-accent';
import { CHROME_TEXT_SCALE } from './editor-layout';

export interface EditorButtonProps {
  /** Spoken by VoiceOver, and shown when `showLabel`. */
  label: string;
  icon: SFSymbol;
  onPress: () => void;
  /** Rose fill, for the one action the screen is about. */
  primary?: boolean;
  /** Draws a spinner in place of the icon. */
  busy?: boolean;
  disabled?: boolean;
  /** Text beside the icon; icon-only otherwise. */
  showLabel?: boolean;
  /** Selected state, for a tool that stays on. */
  selected?: boolean;
  accessibilityHint?: string;
  className?: string;
}

/**
 * An editor toolbar button: a 44 pt pill with an SF Symbol, and a text
 * label when there is room for one. Icon-only buttons still carry the label
 * for VoiceOver.
 */
export function EditorButton({
  label,
  icon,
  onPress,
  primary = false,
  busy = false,
  disabled = false,
  showLabel = false,
  selected = false,
  accessibilityHint,
  className = '',
}: EditorButtonProps) {
  const commit = useCommitStyle();
  const selectedInk = useSelectedInk();
  const inactive = disabled || busy;
  const fill = primary
    ? inactive
      ? 'opacity-40'
      : ''
    : selected
      ? 'border-hw border-edge-strong bg-selected'
      : 'border-hw border-line bg-surface';
  const ink = primary ? commit.ink : selected ? selectedInk : '#ffffff';
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy, selected }}
      hitSlop={4}
      className={`min-h-11 min-w-11 flex-row items-center justify-center gap-1.5 rounded-full ${
        showLabel ? 'px-3.5' : ''
      } ${fill} active:opacity-70 ${className}`}
      style={primary ? commit.fill : undefined}
    >
      {busy ? (
        <ActivityIndicator color={ink} size="small" />
      ) : (
        <SymbolView
          name={icon}
          size={18}
          tintColor={inactive && !primary ? 'rgba(255,255,255,0.35)' : ink}
        />
      )}
      {showLabel ? (
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={CHROME_TEXT_SCALE}
          className={`text-sm font-semibold ${
            primary
              ? ''
              : selected
                ? 'text-selected-ink'
                : inactive
                  ? 'text-white/35'
                  : 'text-white'
          }`}
          style={primary ? commit.label : undefined}
        >
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}
