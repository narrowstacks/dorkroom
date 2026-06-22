import type { BorderCalculation } from '@dorkroom/logic';

export type BladeSide = 'left' | 'right' | 'top' | 'bottom';

export interface BladeReadingLayout {
  side: BladeSide;
  reading: number;
  /** Anchor position within the paper box (pixels). */
  x: number;
  y: number;
  isInside: boolean;
  arrow: '←' | '→' | '↑' | '↓';
  arrowFirst: boolean;
}

export interface BladeReadingOptions {
  labelWidth?: number;
  labelHeight?: number;
  padding?: number;
}

const DEFAULT_LABEL_WIDTH = 64;
const DEFAULT_LABEL_HEIGHT = 36;
const DEFAULT_PADDING = 8;

type ReadingInput = Pick<
  BorderCalculation,
  | 'leftBorderPercent'
  | 'rightBorderPercent'
  | 'topBorderPercent'
  | 'bottomBorderPercent'
  | 'leftBladeReading'
  | 'rightBladeReading'
  | 'topBladeReading'
  | 'bottomBladeReading'
>;

export function computeBladeReadings(
  c: ReadingInput,
  boxWidth: number,
  boxHeight: number,
  options: BladeReadingOptions = {}
): BladeReadingLayout[] {
  const labelWidth = options.labelWidth ?? DEFAULT_LABEL_WIDTH;
  const labelHeight = options.labelHeight ?? DEFAULT_LABEL_HEIGHT;
  const padding = options.padding ?? DEFAULT_PADDING;

  const printLeft = (c.leftBorderPercent / 100) * boxWidth;
  const printRight = ((100 - c.rightBorderPercent) / 100) * boxWidth;
  const printTop = (c.topBorderPercent / 100) * boxHeight;
  const printBottom = ((100 - c.bottomBorderPercent) / 100) * boxHeight;

  const printW = printRight - printLeft;
  const printH = printBottom - printTop;

  const hInside = printW > labelWidth * 2 + padding * 2;
  const vInside = printH > labelHeight * 2 + padding * 2;

  const centerX = (printLeft + printRight) / 2;
  const centerY = (printTop + printBottom) / 2;

  const leftX = hInside ? printLeft : Math.max(labelWidth + padding, printLeft);
  const rightX = hInside
    ? printRight
    : Math.min(boxWidth - labelWidth - padding, printRight);
  const topY = vInside ? printTop : Math.max(labelHeight + padding, printTop);
  const bottomY = vInside
    ? printBottom
    : Math.min(boxHeight - labelHeight - padding, printBottom);

  return [
    layoutFor('left', c.leftBladeReading, leftX, centerY, hInside),
    layoutFor('right', c.rightBladeReading, rightX, centerY, hInside),
    layoutFor('top', c.topBladeReading, centerX, topY, vInside),
    layoutFor('bottom', c.bottomBladeReading, centerX, bottomY, vInside),
  ];
}

function layoutFor(
  side: BladeSide,
  reading: number,
  x: number,
  y: number,
  isInside: boolean
): BladeReadingLayout {
  const base = { side, reading, x, y, isInside };

  if (isInside) {
    switch (side) {
      case 'left':
        return { ...base, arrow: '←', arrowFirst: true };
      case 'right':
        return { ...base, arrow: '→', arrowFirst: false };
      case 'top':
        return { ...base, arrow: '↑', arrowFirst: true };
      case 'bottom':
        return { ...base, arrow: '↓', arrowFirst: false };
    }
  }
  switch (side) {
    case 'left':
      return { ...base, arrow: '→', arrowFirst: false };
    case 'right':
      return { ...base, arrow: '←', arrowFirst: true };
    case 'top':
      return { ...base, arrow: '↓', arrowFirst: false };
    case 'bottom':
      return { ...base, arrow: '↑', arrowFirst: true };
  }
}

/**
 * Pixel transform that anchors a label at its blade-reading position using the
 * label's MEASURED size. RN has no `translate(-50%)`, so the caller measures
 * each label and passes its real width/height — this keeps opposing labels
 * (e.g. top and bottom, both anchored at the print center) aligned regardless
 * of differing text widths.
 *
 * - Parallel axis (where the label spans the print edge): inside labels grow
 *   into the print interior; the perpendicular axis is centered on the anchor.
 */
export function bladeLabelOffset(
  side: BladeSide,
  isInside: boolean,
  width: number,
  height: number
): { translateX: number; translateY: number } {
  const halfW = width / 2;
  const halfH = height / 2;

  if (side === 'left' || side === 'right') {
    // Vertical centering on the anchor; horizontal grows toward the interior.
    const towardInterior = side === 'left' ? isInside : !isInside;
    return { translateX: towardInterior ? 0 : -width, translateY: -halfH };
  }
  // top / bottom: horizontal centering on the anchor (this is what aligns them).
  const towardInterior = side === 'top' ? isInside : !isInside;
  return { translateX: -halfW, translateY: towardInterior ? 0 : -height };
}
