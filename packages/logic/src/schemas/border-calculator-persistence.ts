import { z } from 'zod';
import { BORDER_CALCULATOR_DEFAULTS } from '../constants/border-calculator-defaults';
import { BORDER_CALCULATOR_LINK_PARAMS } from '../constants/calculator-link-params';
import { BORDER_CALCULATOR_STORAGE_KEY } from '../constants/storage-keys';
import type { BorderCalculatorState } from '../types/border-calculator';
import { computeMaxAllowedMinBorder } from '../utils/border-calculations';
import { computeBorderLayout } from '../utils/border-layout';
import { defineCalculatorLink } from '../utils/calculator-url-params';
import { definePersistedCalculator } from '../utils/persisted-calculator';
import { borderPresetSettingsFieldSchemas } from './border-calculator.schema';

/*
 * The border calculator's persisted snapshot, its defaults and its link.
 * Kept apart from the reducer hook so a link can be built (the home search
 * does) without loading the hook.
 */

/**
 * Field bounds for the persisted border-calculator snapshot: the preset
 * settings bounds plus the `lastValid*` fields, each bounded exactly like the
 * field it mirrors. They accept 0 because applying the built-in preset copies
 * its zeroed custom dimensions into them; the negative values issue #239
 * reported are what the bounds keep out. Exported so the web form's hydration
 * can validate the same keys one at a time.
 */
export const persistedBorderCalculatorFieldSchemas = {
  ...borderPresetSettingsFieldSchemas,
  lastValidCustomAspectWidth:
    borderPresetSettingsFieldSchemas.customAspectWidth,
  lastValidCustomAspectHeight:
    borderPresetSettingsFieldSchemas.customAspectHeight,
  lastValidCustomPaperWidth: borderPresetSettingsFieldSchemas.customPaperWidth,
  lastValidCustomPaperHeight:
    borderPresetSettingsFieldSchemas.customPaperHeight,
  lastValidMinBorder: borderPresetSettingsFieldSchemas.minBorder,
};

/**
 * The persisted border-calculator snapshot. Fields are optional so a snapshot
 * from an earlier build still hydrates; one that fails is discarded whole, not
 * partially dispatched into state. Exported because the mobile calculator
 * writes and reads the same `borderCalculatorState_v2` payload.
 */
export const persistedBorderCalculatorSchema = z
  .object(persistedBorderCalculatorFieldSchemas)
  .partial();

export type PersistedBorderCalculatorState = z.infer<
  typeof persistedBorderCalculatorSchema
>;

const createInitialState = (): BorderCalculatorState => {
  return {
    aspectRatio: BORDER_CALCULATOR_DEFAULTS.aspectRatio,
    paperSize: BORDER_CALCULATOR_DEFAULTS.paperSize,
    customAspectWidth: BORDER_CALCULATOR_DEFAULTS.customAspectWidth,
    customAspectHeight: BORDER_CALCULATOR_DEFAULTS.customAspectHeight,
    customPaperWidth: BORDER_CALCULATOR_DEFAULTS.customPaperWidth,
    customPaperHeight: BORDER_CALCULATOR_DEFAULTS.customPaperHeight,
    lastValidCustomAspectWidth: BORDER_CALCULATOR_DEFAULTS.customAspectWidth,
    lastValidCustomAspectHeight: BORDER_CALCULATOR_DEFAULTS.customAspectHeight,
    lastValidCustomPaperWidth: BORDER_CALCULATOR_DEFAULTS.customPaperWidth,
    lastValidCustomPaperHeight: BORDER_CALCULATOR_DEFAULTS.customPaperHeight,
    minBorder: BORDER_CALCULATOR_DEFAULTS.minBorder,
    enableOffset: BORDER_CALCULATOR_DEFAULTS.enableOffset,
    ignoreMinBorder: BORDER_CALCULATOR_DEFAULTS.ignoreMinBorder,
    horizontalOffset: BORDER_CALCULATOR_DEFAULTS.horizontalOffset,
    verticalOffset: BORDER_CALCULATOR_DEFAULTS.verticalOffset,
    showBlades: BORDER_CALCULATOR_DEFAULTS.showBlades,
    showBladeReadings: BORDER_CALCULATOR_DEFAULTS.showBladeReadings,
    isLandscape: BORDER_CALCULATOR_DEFAULTS.isLandscape,
    isRatioFlipped: BORDER_CALCULATOR_DEFAULTS.isRatioFlipped,
    hasManuallyFlippedPaper: false,
    lastValidMinBorder: BORDER_CALCULATOR_DEFAULTS.minBorder,
  };
};

/**
 * Defaults for every persisted field, and nothing else: the iOS reducer starts
 * from it and the web form uses it as its default values.
 */
export const initialState = createInitialState();

/**
 * Storage key, persist keys, per-key hydration validators and defaults for
 * the web form, which hydrates field by field (a bad field falls back on its
 * own). The defaults hold exactly the persisted fields.
 */
export const borderCalculatorPersistence = definePersistedCalculator(
  BORDER_CALCULATOR_STORAGE_KEY,
  persistedBorderCalculatorFieldSchemas,
  initialState
);

/** Link that opens the border calculator pre-filled (params: `BORDER_CALCULATOR_LINK_PARAMS`). */
export const borderCalculatorLink = defineCalculatorLink(
  borderCalculatorPersistence,
  BORDER_CALCULATOR_LINK_PARAMS
);

/** Each linkable length and the `lastValid*` mirror the layout draws from. */
const LINK_MIRRORS = [
  ['customPaperWidth', 'lastValidCustomPaperWidth'],
  ['customPaperHeight', 'lastValidCustomPaperHeight'],
  ['customAspectWidth', 'lastValidCustomAspectWidth'],
  ['customAspectHeight', 'lastValidCustomAspectHeight'],
  ['minBorder', 'lastValidMinBorder'],
] as const satisfies readonly (readonly [
  keyof BorderCalculatorState,
  keyof BorderCalculatorState,
])[];

/**
 * A border link's values (`borderCalculatorLink.read`), completed the way a
 * form edit would complete them, so the same link renders the same for every
 * viewer:
 *
 * - Each length also sets its `lastValid*` mirror, as editing it does.
 * - A link that sets `landscape` pins it, like a manual Flip Paper, so the
 *   custom-paper re-derivation leaves it alone.
 * - A link that sets the paper (size or custom dimensions) without
 *   `landscape` orients it the way picking that paper in the form does:
 *   landscape for a standard size, derived from width and height for custom.
 *
 * The web calculator applies the result over the stored inputs; the
 * shared-link preview card applies it over the defaults
 * ({@link borderStateFromLink}).
 */
export function completeBorderLinkValues(
  link: Partial<BorderCalculatorState>
): Partial<BorderCalculatorState> {
  const overrides = { ...link };
  for (const [field, mirror] of LINK_MIRRORS) {
    const value = link[field];
    if (value !== undefined) overrides[mirror] = value;
  }
  // An offset in the link turns offsets on; a link that sets up the print
  // (paper or ratio) without one centres it, whatever the viewer had stored.
  if (overrides.enableOffset === undefined) {
    const setsOffset =
      link.horizontalOffset !== undefined || link.verticalOffset !== undefined;
    const setsPrint =
      link.paperSize !== undefined ||
      link.customPaperWidth !== undefined ||
      link.customPaperHeight !== undefined ||
      link.aspectRatio !== undefined;
    if (setsOffset) overrides.enableOffset = true;
    else if (setsPrint) overrides.enableOffset = false;
  }
  if (link.isLandscape !== undefined) {
    return { ...overrides, hasManuallyFlippedPaper: true };
  }
  const setsPaper =
    link.paperSize !== undefined ||
    link.customPaperWidth !== undefined ||
    link.customPaperHeight !== undefined;
  if (!setsPaper) return overrides;
  // Custom paper: onHydrated and the orientation effect derive isLandscape
  // from the merged dimensions, since the flip flag is now off.
  return { ...overrides, isLandscape: true, hasManuallyFlippedPaper: false };
}

/**
 * The calculator state a first-time visitor (nothing stored) sees after
 * opening a border link: the defaults with {@link completeBorderLinkValues}
 * applied, then the two corrections the web calculator makes once the form
 * settles. Custom paper that was not flipped by hand is oriented from its
 * width and height, and a minimum border too large for the paper is reduced
 * to the largest that fits (`computeMaxAllowedMinBorder`). The shared-link
 * preview card draws from this, so its numbers are the calculator's.
 */
export function borderStateFromLink(
  link: Partial<BorderCalculatorState>
): BorderCalculatorState {
  const state: BorderCalculatorState = {
    ...initialState,
    ...completeBorderLinkValues(link),
  };
  if (
    state.paperSize === 'custom' &&
    state.customPaperWidth > 0 &&
    state.customPaperHeight > 0 &&
    !state.hasManuallyFlippedPaper
  ) {
    state.isLandscape = state.customPaperWidth < state.customPaperHeight;
  }
  const { orientedPaper } = computeBorderLayout(state, {
    viewport: { width: 0, height: 0 },
  }).orientedDimensions;
  const maxAllowedMinBorder = computeMaxAllowedMinBorder(
    orientedPaper.w,
    orientedPaper.h
  );
  if (state.minBorder > maxAllowedMinBorder && maxAllowedMinBorder > 0) {
    state.minBorder = maxAllowedMinBorder;
    state.lastValidMinBorder = maxAllowedMinBorder;
  }
  return state;
}
