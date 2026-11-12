import type { TextStyle, ViewStyle } from 'react-native';
import {
  ACCENT,
  type AccentColor,
  commitColors,
  PHASE_ACCENT,
  type SelectionTint,
  selectionTint,
} from '@/theme/accents';
import { usePhase } from '@/theme/phase-context';

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
  return selectionTint(accent ?? phaseAccent);
}

export interface CommitStyle {
  fill: Pick<ViewStyle, 'backgroundColor'>;
  label: Pick<TextStyle, 'color'>;
  /** The ink as a plain colour, for icons. */
  ink: string;
}

/** Styles for a commit button's fill and label in the surrounding phase. */
export function useCommitStyle(): CommitStyle {
  const { fill, ink } = commitColors(usePhaseAccent());
  return { fill: { backgroundColor: fill }, label: { color: ink }, ink };
}

const ROW_IDLE: ViewStyle = {
  backgroundColor: 'rgba(255,255,255,0.05)',
  borderColor: 'transparent',
};

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
    : ROW_IDLE;
}

/**
 * The phase hue as a colour value, for what a class can't carry (a slider
 * track, a check mark, tinted text). Outside a phase it is the neutral white.
 */
export function usePhaseHue(): string {
  const accent = usePhaseAccent();
  return accent === null ? '#ffffff' : ACCENT[accent];
}
