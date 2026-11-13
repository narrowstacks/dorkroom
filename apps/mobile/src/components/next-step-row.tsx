import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useDimInk, usePhaseHue } from '@/theme/use-phase-accent';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

const ROW_CLASS =
  'min-h-11 flex-row items-center gap-3 rounded-xl border-hw border-line bg-surface px-4';

interface RowContentProps {
  symbol: SymbolName;
  label: string;
  detail?: string;
  chevron: boolean;
}

/** What a row shows, shared by the real row and its invisible placeholder. */
function RowContent({ symbol, label, detail, chevron }: RowContentProps) {
  const hue = usePhaseHue();
  const chevronInk = useDimInk('rgba(255,255,255,0.4)');
  return (
    <>
      <SymbolView name={symbol} size={20} tintColor={hue} />
      <Text
        numberOfLines={detail === undefined ? 1 : undefined}
        className={`text-base text-white ${detail === undefined ? 'flex-1' : ''}`}
      >
        {label}
      </Text>
      {detail === undefined ? null : (
        <Text
          numberOfLines={1}
          className="flex-1 text-right text-sm text-ink-60"
        >
          {detail}
        </Text>
      )}
      {chevron ? (
        <SymbolView name="chevron.right" size={13} tintColor={chevronInk} />
      ) : null}
    </>
  );
}

interface ActionRowProps {
  /** An SF Symbol name, tinted with the phase hue. */
  symbol: SymbolName;
  label: string;
  /** Trailing text in `text-ink-60`; the label alone fills the row without it. */
  detail?: string;
  onPress: () => void;
  accessibilityRole: 'button' | 'link';
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** A faint trailing chevron: this row goes somewhere. */
  chevron?: boolean;
}

/**
 * One full-width row under a `Readout` (its `actions` slot): a phase-hued
 * symbol, a label, an optional trailing detail and an optional chevron. The
 * look shared by "Save to roll" and the next-step links.
 */
export function ActionRow({
  symbol,
  label,
  detail,
  onPress,
  accessibilityRole,
  accessibilityLabel,
  accessibilityHint,
  chevron = false,
}: ActionRowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      className={`${ROW_CLASS} active:opacity-80`}
    >
      <RowContent
        symbol={symbol}
        label={label}
        detail={detail}
        chevron={chevron}
      />
    </Pressable>
  );
}

interface NextStepRowProps {
  label: string;
  detail?: string;
  /** An SF Symbol name. */
  symbol: SymbolName;
  onPress: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

/**
 * A link to the next tool, carrying the answer there: an `ActionRow` that is
 * a link and ends in a chevron. Target paths come from `lib/next-step.ts`.
 */
export function NextStepRow({
  label,
  detail,
  symbol,
  onPress,
  accessibilityLabel,
  accessibilityHint,
}: NextStepRowProps) {
  return (
    <ActionRow
      symbol={symbol}
      label={label}
      detail={detail}
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={
        accessibilityLabel ?? (detail ? `${label}, ${detail}` : label)
      }
      accessibilityHint={accessibilityHint}
      chevron
    />
  );
}

/**
 * An invisible stand-in that draws the row's own content (the one you pass,
 * a sample of what the row says), so its height follows Dynamic Type exactly
 * as the real row's does. For a header that must not move when its row appears
 * or goes away. Not touchable and hidden from VoiceOver.
 */
export function ActionRowPlaceholder({
  symbol,
  label,
  detail,
}: Omit<
  NextStepRowProps,
  'onPress' | 'accessibilityLabel' | 'accessibilityHint'
>) {
  return (
    <View
      className={ROW_CLASS}
      style={{ opacity: 0 }}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <RowContent symbol={symbol} label={label} detail={detail} chevron />
    </View>
  );
}
