// Colours for the Home Screen and Lock Screen widgets. A widget layout runs in
// an isolated runtime that cannot import the theme, so every colour reaches it
// as a literal hex string in its props, as the Live Activity's palette does.
//
// Always the normal dark look, never the safelight red: a widget sits on the
// Home Screen beside the wallpaper and other apps' widgets, which nothing
// dims, and its look is fixed until the app next pushes, so a red widget would
// stay red after the mode was switched off from Control Center with the app
// closed. See "Widgets" in CLAUDE.md.
import { ACCENT, type AccentColor } from '@/theme/accents';

export interface WidgetPalette {
  /** The widget's container background. */
  bg: string;
  /** Primary text. */
  ink: string;
  /** Secondary text. */
  inkSecondary: string;
  /** Tertiary text and hints. */
  inkTertiary: string;
  /** The phase hue: the glyph, the countdown, the header. */
  accent: string;
}

/** The dark palette with one phase hue as the accent. */
export function widgetPalette(accent: AccentColor): WidgetPalette {
  return {
    bg: '#0b0b0c',
    ink: '#ffffff',
    inkSecondary: '#d4d4d8',
    inkTertiary: '#8e8e93',
    accent: ACCENT[accent],
  };
}

/**
 * `text` cut to at most `max` characters, ending in an ellipsis when cut, so
 * one long name cannot grow the payload. The layout still truncates to fit.
 */
export function cutText(text: string, max: number): string {
  return text.length <= max
    ? text
    : `${text.slice(0, max - 1).trimEnd()}\u2026`;
}
