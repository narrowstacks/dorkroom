import { z } from 'zod';
import { BORDER_CALCULATOR_DEFAULTS } from '../constants/border-calculator-defaults';
import { BORDER_CALCULATOR_LINK_PARAMS } from '../constants/calculator-link-params';
import { BORDER_CALCULATOR_STORAGE_KEY } from '../constants/storage-keys';
import type { BorderCalculatorState } from '../types/border-calculator';
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
