/* ------------------------------------------------------------------ *
   precision.ts
   -------------------------------------------------------------
   Precision and rounding helpers mirrored from the original project
\* ------------------------------------------------------------------ */

import { CALCULATION_CONSTANTS } from '../constants/calculations';

const { ROUNDING_MULTIPLIER, DECIMAL_PLACES } = CALCULATION_CONSTANTS.PRECISION;

export const roundToPrecision = (
  value: number,
  places: number = DECIMAL_PLACES
): number => {
  const multiplier = Math.pow(10, places);
  return Math.round(value * multiplier) / multiplier;
};

export const roundToStandardPrecision = (value: number): number => {
  return Math.round(value * ROUNDING_MULTIPLIER) / ROUNDING_MULTIPLIER;
};

export const createMemoKey = (
  ...values: (number | boolean | string)[]
): string => {
  return values
    .map((val) =>
      typeof val === 'number'
        ? Math.round(val * ROUNDING_MULTIPLIER).toString()
        : val.toString()
    )
    .join(':');
};

export default {
  roundToPrecision,
  roundToStandardPrecision,
  createMemoKey,
};
