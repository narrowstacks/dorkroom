import { parseDecimalInput } from '@dorkroom/logic';
import { memo, useCallback, useId, useMemo, useState } from 'react';
import {
  InputAccessoryView,
  Keyboard,
  type KeyboardTypeOptions,
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { SafelightOverlay } from '@/components/safelight/safelight-overlay';
import { useSafelight } from '@/components/safelight/safelight-provider';
import {
  type RulerConfig,
  rulerWindowTicks,
} from '@/components/scrub/ruler-machine';
import { RULER_METRICS } from '@/components/scrub/ruler-metrics';
import { ScrubRuler } from '@/components/scrub/scrub-ruler';
import { formatScrubbed, type ScrubStep } from '@/components/scrub/scrub-value';
import { useScrubMachine } from '@/components/scrub/use-scrub-machine';
import {
  handleStepperAction,
  STEPPER_ACCESSIBILITY_ACTIONS,
  stepperAccessibilityValue,
} from '@/lib/stepper-a11y';
import type { AccentColor } from '@/theme/accents';
import { SAFELIGHT } from '@/theme/safelight';
import { readoutText } from '@/theme/tokens';
import { useAccentColor, useDimInk } from '@/theme/use-phase-accent';

const EDIT_ACTION = { name: 'activate', label: 'Edit value' } as const;
const ROW_CLASS = 'min-h-11 flex-row items-center justify-between gap-3 px-4';
const VALUE_STYLE = [readoutText, { fontSize: 20, fontWeight: '600' } as const];
// The Done bar above a pad with no return key. Plain styles with explicit
// size and colours: a bare accessory view can collapse to nothing, and the
// keyboard is itself dark, so the bar needs a lighter fill and a hairline.
const DONE_BAR_STYLE = {
  height: 44,
  alignSelf: 'stretch',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'flex-end',
  paddingHorizontal: 16,
  backgroundColor: '#2c2c2e',
  borderTopWidth: StyleSheet.hairlineWidth,
  borderTopColor: 'rgba(255,255,255,0.25)',
} as const;
const DONE_BUTTON_STYLE = {
  minHeight: 44,
  minWidth: 56,
  alignItems: 'flex-end',
  justifyContent: 'center',
} as const;
const DONE_TEXT_STYLE = {
  color: '#0a84ff',
  fontSize: 17,
  fontWeight: '600',
} as const;
// The Done bar rides on the keyboard, outside the root overlay, so safelight
// mode gives it its own black ground, red text and overlay.
const DONE_BAR_SAFELIGHT = {
  backgroundColor: '#000000',
  borderTopColor: SAFELIGHT.outline,
} as const;
const DONE_TEXT_SAFELIGHT = { color: SAFELIGHT.text } as const;
const PLACEHOLDER_COLOR = 'rgba(255,255,255,0.4)';

interface ScrubRowProps {
  label: string;
  /** The hook's raw string for this field. */
  value: string;
  onChangeText: (text: string) => void;
  unit?: string;
  /** One step per 10px of drag. A function is evaluated at each step
   * with the value being left at every step, so a long drag can coarsen. */
  step: ScrubStep;
  min?: number;
  max?: number;
  /** Text to number. `NaN` or `null` mean "does not parse". Defaults to
   * `parseDecimalInput`. */
  parse?: (text: string) => number | null;
  /** The value in words for VoiceOver (e.g. "30s" as "30 seconds"). Defaults
   * to the text plus the unit. */
  speakValue?: (text: string) => string;
  /** A scrubbed number to the text written back. Defaults to `formatScrubbed`. */
  format?: (value: number, step: number) => string;
  accent: AccentColor;
  keyboardType?: KeyboardTypeOptions;
  placeholder?: string;
  accessibilityLabel?: string;
  className?: string;
}

/** Keyboards with no return key get a Done bar; the others have their own. */
const KEYBOARDS_WITHOUT_RETURN: readonly KeyboardTypeOptions[] = [
  'decimal-pad',
  'number-pad',
  'phone-pad',
];

/**
 * A numeric input row: drag sideways along the ruler to scrub the value, tap
 * the row to type it exactly. The ruler's state machine is the pure reducer in
 * `ruler-machine.ts`. The pan runs on the UI thread: it moves one shared
 * translate every frame and tells JS only when the whole-step count changes
 * (once per 10px), and JS then writes the text. Outside changes (`sync`) and
 * user events (`act`) go through separate paths so only the latter can write.
 * Re-renders: the scrubbed row per step (its `value` changes), the ruler only
 * when the tick window or origin changes.
 */
export const ScrubRow = memo(function ScrubRow({
  label,
  value,
  onChangeText,
  unit,
  step,
  min = Number.NEGATIVE_INFINITY,
  max = Number.POSITIVE_INFINITY,
  parse = parseDecimalInput,
  format = formatScrubbed,
  speakValue,
  accent,
  keyboardType = 'decimal-pad',
  placeholder,
  accessibilityLabel,
  className,
}: ScrubRowProps) {
  const [editing, setEditing] = useState(false);
  const [rulerWidth, setRulerWidth] = useState(0);
  const [selection, setSelection] = useState<
    { start: number; end: number } | undefined
  >(undefined);
  const doneId = useId();
  const safelight = useSafelight();
  const placeholderColor = useDimInk('#71717a');
  const rulerColor = useAccentColor(accent);
  const config = useMemo<RulerConfig>(
    () => ({ step, min, max, parse, format, width: rulerWidth }),
    [step, min, max, parse, format, rulerWidth]
  );

  const startEditing = useCallback(() => setEditing(true), []);
  const { view, offset, gesture, nudge } = useScrubMachine({
    value,
    config,
    onChangeText,
    editing,
    onTap: startEditing,
  });

  const ticks = useMemo(
    () =>
      rulerWindowTicks({
        origin: view.origin,
        step,
        min,
        max,
        lo: view.windowLo,
        hi: view.windowHi,
      }),
    [view.origin, view.windowLo, view.windowHi, step, min, max]
  );

  const onRulerLayout = (event: LayoutChangeEvent) => {
    setRulerWidth(event.nativeEvent.layout.width);
  };

  const endEditing = () => {
    setSelection(undefined);
    setEditing(false);
  };

  const empty = value.trim() === '';
  const needsDone = KEYBOARDS_WITHOUT_RETURN.includes(keyboardType);
  const spokenValue = empty
    ? 'empty'
    : speakValue
      ? speakValue(value)
      : `${value}${unit ? ` ${unit}` : ''}`;
  const spokenLabel = accessibilityLabel ?? label;
  const unitText = unit ? (
    <Text className="text-base text-ink-60">{unit}</Text>
  ) : null;

  return (
    <View
      accessible={!editing}
      accessibilityRole="adjustable"
      accessibilityLabel={spokenLabel}
      accessibilityValue={stepperAccessibilityValue(spokenValue)}
      accessibilityHint="Double tap to type a value. Swipe up or down to adjust."
      accessibilityActions={[...STEPPER_ACCESSIBILITY_ACTIONS, EDIT_ACTION]}
      onAccessibilityAction={(event) => {
        const name = event.nativeEvent.actionName;
        if (name === EDIT_ACTION.name) {
          setEditing(true);
          return;
        }
        handleStepperAction(
          name,
          () => nudge(-1),
          () => nudge(1)
        );
      }}
      className={className}
    >
      <GestureDetector gesture={gesture}>
        <View className="pb-1.5 pt-1">
          <View className={ROW_CLASS}>
            <Text
              className="text-base text-white"
              // The input below carries the spoken label while editing.
              accessibilityElementsHidden={editing}
              importantForAccessibility={
                editing ? 'no-hide-descendants' : 'auto'
              }
            >
              {label}
            </Text>
            <View className="flex-row items-baseline gap-1">
              {editing ? (
                <>
                  <TextInput
                    accessibilityLabel={spokenLabel}
                    value={value}
                    onChangeText={onChangeText}
                    onBlur={endEditing}
                    onSubmitEditing={endEditing}
                    keyboardType={keyboardType}
                    returnKeyType="done"
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder={placeholder}
                    placeholderTextColor={placeholderColor}
                    keyboardAppearance="dark"
                    selectTextOnFocus
                    // `selectTextOnFocus` alone does not fire with `autoFocus`
                    // (the field is focused as it mounts), so the caret lands
                    // at the end and typing appends. Select the whole text on
                    // focus; the first selection report is that taking effect,
                    // after which the cursor is the user's again.
                    onFocus={() =>
                      setSelection({ start: 0, end: value.length })
                    }
                    onSelectionChange={() => setSelection(undefined)}
                    selection={selection}
                    inputAccessoryViewID={needsDone ? doneId : undefined}
                    // eslint-disable-next-line jsx-a11y/no-autofocus -- the user just tapped the row to type, so focus is the point of the switch
                    autoFocus
                    style={[
                      VALUE_STYLE,
                      { color: '#ffffff', minWidth: 96, textAlign: 'right' },
                    ]}
                  />
                  {needsDone ? (
                    <InputAccessoryView nativeID={doneId}>
                      <View
                        style={[
                          DONE_BAR_STYLE,
                          safelight.on ? DONE_BAR_SAFELIGHT : null,
                        ]}
                      >
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Done"
                          hitSlop={8}
                          onPress={() => {
                            Keyboard.dismiss();
                            endEditing();
                          }}
                          style={DONE_BUTTON_STYLE}
                        >
                          <Text
                            style={[
                              DONE_TEXT_STYLE,
                              safelight.on ? DONE_TEXT_SAFELIGHT : null,
                            ]}
                          >
                            Done
                          </Text>
                        </Pressable>
                        {/* The accessory bar is its own surface; the root overlay cannot reach it. */}
                        <SafelightOverlay />
                      </View>
                    </InputAccessoryView>
                  ) : null}
                </>
              ) : (
                <Text
                  style={[
                    VALUE_STYLE,
                    { color: empty ? PLACEHOLDER_COLOR : '#ffffff' },
                  ]}
                >
                  {empty ? (placeholder ?? '–') : value}
                </Text>
              )}
              {unitText}
            </View>
          </View>
          <View
            onLayout={onRulerLayout}
            pointerEvents="none"
            style={{
              height: RULER_METRICS.height,
              overflow: 'hidden',
              // No value to point at: do not look like a live reading.
              opacity: empty ? 0.35 : 1,
            }}
          >
            {rulerWidth > 0 ? (
              <ScrubRuler
                ticks={ticks}
                width={rulerWidth}
                color={rulerColor}
                offset={offset}
              />
            ) : null}
          </View>
        </View>
      </GestureDetector>
    </View>
  );
});
