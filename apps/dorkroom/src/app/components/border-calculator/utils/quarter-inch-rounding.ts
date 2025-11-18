import { computePrintSize, roundToStandardPrecision } from '@dorkroom/logic';

const QUARTER_INCH = 0.25;
const EPSILON = 0.0001;

export interface QuarterInchRoundParams {
  paperWidth: number;
  paperHeight: number;
  ratioWidth: number;
  ratioHeight: number;
  currentMinBorder: number;
  printWidth: number;
  printHeight: number;
}

const isQuarterIncrement = (value: number) => {
  if (!Number.isFinite(value)) return false;
  const scaled = value / QUARTER_INCH;
  return Math.abs(scaled - Math.round(scaled)) < 0.001;
};

export const calculateQuarterInchMinBorder = ({
  paperWidth,
  paperHeight,
  ratioWidth,
  ratioHeight,
  currentMinBorder,
  printWidth,
  printHeight,
}: QuarterInchRoundParams): number | null => {
  if (
    paperWidth <= 0 ||
    paperHeight <= 0 ||
    ratioWidth <= 0 ||
    ratioHeight <= 0 ||
    printWidth <= 0 ||
    printHeight <= 0
  ) {
    return null;
  }

  const alreadyQuarterAligned =
    isQuarterIncrement(printWidth) && isQuarterIncrement(printHeight);
  if (alreadyQuarterAligned) {
    return null;
  }

  const unitWidth = ratioWidth * QUARTER_INCH;
  const unitHeight = ratioHeight * QUARTER_INCH;

  if (unitWidth <= 0 || unitHeight <= 0) {
    return null;
  }

  const widthMultiplier = Math.floor((printWidth + EPSILON) / unitWidth);
  const heightMultiplier = Math.floor((printHeight + EPSILON) / unitHeight);
  let multiplier = Math.min(widthMultiplier, heightMultiplier);

  if (multiplier <= 0) {
    return null;
  }

  const evaluateCandidate = (candidate: number) => {
    if (!Number.isFinite(candidate)) return null;
    if (candidate < currentMinBorder - EPSILON) return null;

    const { printW, printH } = computePrintSize(
      paperWidth,
      paperHeight,
      ratioWidth,
      ratioHeight,
      candidate
    );

    if (
      printW <= 0 ||
      printH <= 0 ||
      printW > printWidth + QUARTER_INCH ||
      printH > printHeight + QUARTER_INCH
    ) {
      return null;
    }

    if (isQuarterIncrement(printW) && isQuarterIncrement(printH)) {
      const roundedBorder = roundToStandardPrecision(Math.max(candidate, 0));
      if (Math.abs(roundedBorder - currentMinBorder) < EPSILON) {
        return null;
      }
      return roundedBorder;
    }

    return null;
  };

  while (multiplier > 0) {
    const targetWidth = unitWidth * multiplier;
    const targetHeight = unitHeight * multiplier;

    if (targetWidth <= 0 || targetHeight <= 0) {
      break;
    }

    const widthCandidate = (paperWidth - targetWidth) / 2;
    const fromWidth = evaluateCandidate(widthCandidate);
    if (fromWidth !== null) {
      return fromWidth;
    }

    const heightCandidate = (paperHeight - targetHeight) / 2;
    if (Math.abs(heightCandidate - widthCandidate) > EPSILON) {
      const fromHeight = evaluateCandidate(heightCandidate);
      if (fromHeight !== null) {
        return fromHeight;
      }
    }

    multiplier -= 1;
  }

  return null;
};
