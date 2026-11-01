import {
  DEFAULT_INVERSION_ADJUSTMENTS,
  type InversionAdjustments,
  type NegativeFilmType,
} from '@dorkroom/logic';
import type { BaseSample, InverterTool } from './inverter-state';
import { isUnsureBase } from './inverter-state';
import { type FilmExposure, isBlueClipping } from './live-exposure';

/**
 * The editor's pure pieces: which adjustment the one slider edits, the
 * short status chips drawn over the stage, and how much the controls may
 * show for the height the screen leaves them. The `.tsx` files only render
 * what these return.
 */

export type AdjustmentKey = keyof InversionAdjustments;

export interface AdjustmentSpec {
  key: AdjustmentKey;
  label: string;
  min: number;
  max: number;
  step: number;
  /** What the slider's two ends do. */
  ends: readonly [string, string];
  c41Only: boolean;
}

// Ranges match the web page's adjustments card. Saturation is iOS only;
// the web uses its default.
export const ADJUSTMENTS: readonly AdjustmentSpec[] = [
  {
    key: 'exposure',
    label: 'Exposure',
    min: -3,
    max: 3,
    step: 0.1,
    ends: ['Darker', 'Brighter'],
    c41Only: false,
  },
  {
    key: 'contrast',
    label: 'Contrast',
    min: 0.5,
    max: 2,
    step: 0.05,
    ends: ['Softer', 'Harder'],
    c41Only: false,
  },
  {
    key: 'warmth',
    label: 'Warmth',
    min: -1,
    max: 1,
    step: 0.05,
    ends: ['Cooler', 'Warmer'],
    c41Only: true,
  },
  {
    key: 'tint',
    label: 'Tint',
    min: -1,
    max: 1,
    step: 0.05,
    ends: ['Magenta', 'Green'],
    c41Only: true,
  },
  {
    key: 'saturation',
    label: 'Saturation',
    min: 0,
    max: 2,
    step: 0.05,
    ends: ['Muted', 'Vivid'],
    c41Only: true,
  },
];

/** The adjustments a film type offers, in display order. */
export function adjustmentsFor(
  filmType: NegativeFilmType
): readonly AdjustmentSpec[] {
  return ADJUSTMENTS.filter((s) => filmType === 'c41' || !s.c41Only);
}

/** The adjustment the slider edits: the chosen one while the film type
 *  offers it, else the first (B&W has no Warmth, Tint or Saturation). */
export function activeAdjustment(
  chosen: AdjustmentKey,
  filmType: NegativeFilmType
): AdjustmentSpec {
  const offered = adjustmentsFor(filmType);
  return offered.find((s) => s.key === chosen) ?? offered[0];
}

const signed = (v: number, digits: number) =>
  `${v > 0 ? '+' : ''}${(v === 0 ? 0 : v).toFixed(digits)}`;

/** An adjustment's value as its chip and readout show it. */
export function formatAdjustment(key: AdjustmentKey, value: number): string {
  switch (key) {
    case 'exposure':
      return `${signed(value, 1)} EV`;
    case 'contrast':
    case 'saturation':
      return `${value.toFixed(2)}x`;
    case 'warmth':
    case 'tint':
      return signed(value, 2);
  }
}

/** True when an adjustment sits at its default, so its reset has nothing
 *  to do. Within half a slider step, since slider values are floats. */
export function isDefaultAdjustment(
  key: AdjustmentKey,
  value: number
): boolean {
  const spec = ADJUSTMENTS.find((s) => s.key === key);
  const tolerance = spec ? spec.step / 2 : 1e-6;
  return Math.abs(value - DEFAULT_INVERSION_ADJUSTMENTS[key]) < tolerance;
}

/** True when every adjustment the film type offers sits at its default. */
export function allDefault(
  adjustments: InversionAdjustments,
  filmType: NegativeFilmType
): boolean {
  return adjustmentsFor(filmType).every((s) =>
    isDefaultAdjustment(s.key, adjustments[s.key])
  );
}

export type ChipTone = 'neutral' | 'info' | 'alert' | 'ok';

export interface StatusChip {
  text: string;
  tone: ChipTone;
  /** What VoiceOver reads, when the short text is not enough. */
  label: string;
  /** True when tapping it should start picking the base. */
  picksBase: boolean;
}

/** The film base chip over the stage, or null when there is nothing to say
 *  (a picked base needs no badge). `searching` is live mode, where a missing
 *  base is still being looked for rather than missing. */
export function baseChip(
  base: BaseSample | null,
  searching = false
): StatusChip | null {
  if (!base && searching) {
    return {
      text: 'Finding base',
      tone: 'neutral',
      label: 'Looking for the film base. Tap to pick it yourself.',
      picksBase: true,
    };
  }
  if (!base) {
    return {
      text: 'Pick film base',
      tone: 'alert',
      label: 'No film base yet. Pick the unexposed rebate to convert.',
      picksBase: true,
    };
  }
  if (isUnsureBase(base)) {
    return {
      text: 'Check film base',
      tone: 'alert',
      label: 'Not sure the automatic film base is right. Pick it yourself.',
      picksBase: true,
    };
  }
  if (base.auto) {
    return {
      text: 'Auto base',
      tone: 'info',
      label: 'Film base found automatically. Tap to pick it yourself.',
      picksBase: true,
    };
  }
  return null;
}

/** The blue-clipping chip of live mode. */
export function clippingChip(exposure: FilmExposure | null): StatusChip {
  if (!exposure) {
    return {
      text: 'Metering',
      tone: 'neutral',
      label: 'Blue clipping not measured yet',
      picksBase: false,
    };
  }
  const percent = Math.round(exposure.blueClipped * 100);
  return isBlueClipping(exposure)
    ? {
        text: `Blue clipping ${percent}%`,
        tone: 'alert',
        label: `Blue clipping ${percent} percent`,
        picksBase: false,
      }
    : {
        text: 'Blue OK',
        tone: 'ok',
        label: `Blue clipping ${percent} percent`,
        picksBase: false,
      };
}

/** One line telling the user what the active tool does. */
export function toolHint(tool: InverterTool): string {
  switch (tool) {
    case 'crop':
      return 'Drag the edges to frame. The export and levels use the inside.';
    case 'base':
      return 'Drag to the unexposed rebate between frames, then lift.';
    case 'neutral':
      return 'Drag to something that should be grey, then lift.';
    case 'rotate':
      return 'Turn or mirror the photo. The crop and picks turn with it.';
  }
}

/** Below this body height (points between the header and the tab bar)
 *  the editor drops optional chrome, such as the slider's end labels, so the
 *  photo keeps the room on a small phone. An iPhone 17e leaves about 640. */
export const COMPACT_BODY_HEIGHT = 660;

/** True when the editor should use its compact controls. */
export function isCompactEditor(bodyHeight: number): boolean {
  return bodyHeight > 0 && bodyHeight < COMPACT_BODY_HEIGHT;
}

/** Editor toolbar metrics, in points, matching `EditorButton` and
 *  `FilmTypeToggle` at the default text size. */
export const TOOLBAR_BUTTON = 44;
export const FILM_TOGGLE_WIDTH = 100;
export const TOOLBAR_GAP = 6;
/** Side padding of the editor body. */
export const EDITOR_GUTTER = 16;

/** Largest Dynamic Type scale for the editor's chrome text. Past it the
 *  controls would crowd out the photo; the system Large Content Viewer
 *  still serves bigger sizes. */
export const CHROME_TEXT_SCALE = 1.3;

/** Width of the editor toolbar: the film type toggle and `buttons` icon
 *  buttons, with a gap between each. */
export function toolbarWidth(buttons: number): number {
  return buttons * TOOLBAR_BUTTON + FILM_TOGGLE_WIDTH + buttons * TOOLBAR_GAP;
}

export interface EditorLayout {
  /** Drop optional chrome (the slider's end labels) for the photo's sake. */
  compact: boolean;
  /** Fold Choose Photo and Live Camera into one button, so the toolbar
   *  fits a 375 pt wide phone (iPhone SE) without pushing Save off it. */
  mergePhotoActions: boolean;
}

/** How the editor arranges its controls for the body it is given. The full
 *  toolbar has five buttons: two photo sources, info, share and save. */
export function editorLayout(body: {
  width: number;
  height: number;
}): EditorLayout {
  const room = body.width - 2 * EDITOR_GUTTER;
  return {
    compact: isCompactEditor(body.height),
    mergePhotoActions: body.width > 0 && toolbarWidth(5) > room,
  };
}
