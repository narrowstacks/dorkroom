import type { ViewStyle } from 'react-native';
import type { Phase } from '@/lib/tools';
import { ACCENT, PHASE_ACCENT } from '@/theme/accents';
import { SAFELIGHT } from '@/theme/safelight';
import { withAlpha } from '@/theme/with-alpha';

/** Near-black under the glow. */
export const BACKDROP_COLOR = '#070708';
/** The glow on Home and Settings, which belong to no phase. */
const NEUTRAL_GLOW = '#ffffff';
const GLOW_OPACITY = 0.12;

/**
 * The screen backdrop as a style: near-black with one radial glow at the top
 * in the phase's hue (neutral with no phase), or true black with no glow under
 * safelight.
 *
 * It is a background, not a view, so it can sit on the scroll view itself:
 * a large title collapses only when the scroll view is the screen's root view
 * (see `Screen`), and a backdrop view in front of it, or a wrapper around it,
 * stops that. A scroll view's own background does not scroll.
 *
 * The ellipse is the old SVG glow's geometry (`cx 50% cy -10% r 75%` in the
 * view's bounding box, fading out by 55% of the radius).
 */
export function backdropStyle(
  phase: Phase | null,
  safelightOn: boolean
): ViewStyle {
  if (safelightOn) return { backgroundColor: SAFELIGHT.background };
  const glow = phase === null ? NEUTRAL_GLOW : ACCENT[PHASE_ACCENT[phase]];
  return {
    backgroundColor: BACKDROP_COLOR,
    // CSS syntax: the ellipse's two radii, then its centre. React Native
    // drops an ellipse given only one radius, without a word.
    experimental_backgroundImage: `radial-gradient(ellipse 75% 75% at 50% -10%, ${withAlpha(glow, GLOW_OPACITY)} 0%, ${withAlpha(glow, 0)} 55%)`,
  };
}
