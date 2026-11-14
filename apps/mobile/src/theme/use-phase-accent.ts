import type { TextStyle, ViewStyle } from 'react-native';
import { useSafelight } from '@/components/safelight/safelight-provider';
import {
  ACCENT,
  type AccentColor,
  PHASE_ACCENT,
  type SelectionTint,
} from '@/theme/accents';
import { usePhase } from '@/theme/phase-context';
import {
  resolveAccentColor,
  resolveCommit,
  resolveDirection,
  resolveHue,
  resolveSelectionTint,
  resolveWarningLine,
} from '@/theme/resolve-accent';
import { SAFELIGHT } from '@/theme/safelight';

/** The hue of the phase this screen is in, or null on Home and Settings. */
export function usePhaseAccent(): AccentColor | null {
  const phase = usePhase();
  return phase === null ? null : PHASE_ACCENT[phase];
}

/**
 * The selected-state tint for a control: its own `accent` if given, else the
 * surrounding phase's, else neutral.
 */
export function useSelectionTint(accent?: AccentColor): SelectionTint {
  const phaseAccent = usePhaseAccent();
  const { on } = useSafelight();
  return resolveSelectionTint(accent ?? phaseAccent, on);
}

export interface CommitStyle {
  fill: Pick<ViewStyle, 'backgroundColor' | 'borderColor' | 'borderWidth'>;
  label: Pick<TextStyle, 'color'>;
  /** The ink as a plain colour, for icons. */
  ink: string;
}

/** Styles for a commit button's fill and label in the surrounding phase. */
export function useCommitStyle(): CommitStyle {
  const accent = usePhaseAccent();
  const { on } = useSafelight();
  return resolveCommit(accent, on);
}

/**
 * Style for a row in a pick-one list: the tint when selected, a faint fill
 * otherwise. Pair with `border` in its class so the layout doesn't shift.
 */
export function selectableRowStyle(
  tint: SelectionTint,
  selected: boolean
): ViewStyle {
  return selected
    ? { backgroundColor: tint.backgroundColor, borderColor: tint.borderColor }
    : tint.idle;
}

/**
 * The phase hue as a colour value, for what a class can't carry (a slider
 * track, a check mark, tinted text). Outside a phase it is the neutral white.
 * A colour string, not necessarily hex: `rgb(255, 0, 0)` under safelight. To
 * make a tint of it use `withAlpha(hue, alpha)`, never `${hue}33`.
 */
export function usePhaseHue(): string {
  const accent = usePhaseAccent();
  const { on } = useSafelight();
  return resolveHue(accent, on);
}

/**
 * A named accent as a colour string: `#rrggbb` normally, `rgb(255, 0, 0)` under
 * safelight. Never append hex alpha digits to it; use `withAlpha`.
 */
export function useAccentColor(accent: AccentColor): string {
  const { on } = useSafelight();
  return resolveAccentColor(accent, on);
}

/** A named accent with a hex alpha suffix, as a fill: faint under safelight. */
export function useAccentFill(accent: AccentColor, alphaHex: string): string {
  const { on } = useSafelight();
  return on ? SAFELIGHT.wash : `${ACCENT[accent]}${alphaHex}`;
}

/** A named accent with a hex alpha suffix, as a line: a hairline under safelight. */
export function useAccentLine(accent: AccentColor, alphaHex: string): string {
  const { on } = useSafelight();
  return on ? SAFELIGHT.outline : `${ACCENT[accent]}${alphaHex}`;
}

/**
 * The two direction-coded data colours (pushed/hot, pulled/cold). Under
 * safelight both are the same red: the meaning must come from the text or sign
 * next to them, never from colour alone.
 */
export function useDirectionColors(): { up: string; down: string } {
  const { on } = useSafelight();
  return resolveDirection(on);
}

/** Ink on a selected (filled) control: dark on white, bright red under safelight. */
export function useSelectedInk(normal = '#0b0b0c'): string {
  const { on } = useSafelight();
  return on ? SAFELIGHT.text : normal;
}

/** Dim text or an icon that is not selected: tertiary red under safelight. */
export function useDimInk(normal: string): string {
  const { on } = useSafelight();
  return on ? SAFELIGHT.textTertiary : normal;
}

/** A colour that differs by mode: `normal` as drawn, or the safelight value. */
export function useModeColor(normal: string, safelight: string): string {
  const { on } = useSafelight();
  return on ? safelight : normal;
}

/** A neutral translucent fill: a faint red wash under safelight. */
export function useNeutralFill(normal: string): string {
  const { on } = useSafelight();
  return on ? SAFELIGHT.wash : normal;
}

/** A warning card's outline: amber normally, the theme's selected outline
 * under safelight (amber would be the one colour on a red screen). */
export function useWarningLine(): string {
  const { on } = useSafelight();
  return resolveWarningLine(on);
}
