import {
  ACCENT,
  type AccentColor,
  commitColors,
  DIRECTION_COLOR,
  type SelectionTint,
  selectionTint,
} from '@/theme/accents';
import { SAFELIGHT, SAFELIGHT_HUE } from '@/theme/safelight';

/**
 * Pure resolution of the phase colours with safelight mode folded in. The hooks
 * in `use-phase-accent.ts` call these with the mode read from context, so this
 * is the ONE place that decides what a hue, a selection tint or a commit button
 * is under the mode, and a screen never branches on it.
 */

// Selected is clearly distinct without a bright slab: a dim fill at the commit
// level, the brighter outline, and the bold text the controls already use.
const SAFELIGHT_TINT: SelectionTint = {
  backgroundColor: SAFELIGHT.commitFill,
  borderColor: SAFELIGHT.outlineSelected,
  color: SAFELIGHT.text,
  idle: { backgroundColor: 'transparent', borderColor: SAFELIGHT.outline },
};

export interface ResolvedCommit {
  fill: {
    backgroundColor: string;
    borderColor?: string;
    borderWidth?: number;
  };
  label: { color: string };
  ink: string;
}

export function resolveSelectionTint(
  accent: AccentColor | null,
  safelight: boolean
): SelectionTint {
  return safelight ? SAFELIGHT_TINT : selectionTint(accent);
}

/** A large bright slab is still a lot of light: under safelight a commit
 * button is a dim fill with a bright outline and bright text. */
export function resolveCommit(
  accent: AccentColor | null,
  safelight: boolean
): ResolvedCommit {
  if (safelight) {
    return {
      fill: {
        backgroundColor: SAFELIGHT.commitFill,
        borderColor: SAFELIGHT.outlineSelected,
        borderWidth: 1,
      },
      label: { color: SAFELIGHT.text },
      ink: SAFELIGHT.text,
    };
  }
  const { fill, ink } = commitColors(accent);
  return { fill: { backgroundColor: fill }, label: { color: ink }, ink };
}

/** The phase hue as a colour; neutral white outside a phase. */
export function resolveHue(
  accent: AccentColor | null,
  safelight: boolean
): string {
  if (safelight) return SAFELIGHT_HUE;
  return accent === null ? '#ffffff' : ACCENT[accent];
}

/** A named accent as a colour. */
export function resolveAccentColor(
  accent: AccentColor,
  safelight: boolean
): string {
  return safelight ? SAFELIGHT_HUE : ACCENT[accent];
}

/** The two direction-coded data colours. Under safelight both are one red, so
 * the meaning must come from the sign or words beside them. */
export function resolveDirection(safelight: boolean): {
  up: string;
  down: string;
} {
  return safelight
    ? { up: SAFELIGHT_HUE, down: SAFELIGHT_HUE }
    : { up: DIRECTION_COLOR.up, down: DIRECTION_COLOR.down };
}
