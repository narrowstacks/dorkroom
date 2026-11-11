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

export interface BladeLabelOffset {
  translateX: number;
  translateY: number;
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
): BladeLabelOffset {
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

export type ReadingForm = 'full' | 'compact';

/** The most the labels' text grows with the system font size. */
export const READING_MAX_FONT_SCALE = 1.2;

export interface LabelSize {
  width: number;
  height: number;
}

interface ReadingSizes {
  row: LabelSize;
  col: LabelSize;
}

const BASE_READING_SIZE = {
  full: { row: { width: 62, height: 24 }, col: { width: 50, height: 38 } },
  compact: { row: { width: 52, height: 20 }, col: { width: 52, height: 20 } },
} as const satisfies Record<ReadingForm, ReadingSizes>;

/**
 * Label sizes per form and orientation, fixed for a given font scale so a
 * label's box stays stable as its text grows ("1" to "1.25"): labels do not
 * jitter while an edge is dragged, and equal widths keep opposing labels
 * aligned. The boxes grow with the (capped) font scale the text itself uses, so
 * a widest label ("← -10.94\"" at 12pt) never truncates. Full labels carry an
 * arrow (beside the value on the left and right, above or below it on the top
 * and bottom); compact ones are the value alone.
 */
export function readingSize(
  form: ReadingForm,
  fontScale: number = 1
): ReadingSizes {
  const scale = Math.min(Math.max(fontScale, 1), READING_MAX_FONT_SCALE);
  const base = BASE_READING_SIZE[form];
  const grow = (size: LabelSize): LabelSize => ({
    width: Math.ceil(size.width * scale),
    height: Math.ceil(size.height * scale),
  });
  return { row: grow(base.row), col: grow(base.col) };
}

/** Gap kept between a label and the edge it describes, so the edge's drag
 * handle stays clear. */
const EDGE_INSET = 6;

export interface PlacedReading extends BladeReadingLayout {
  /** The label's box in the paper's coordinates. */
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ReadingsLayout {
  /** `none` when no form fits without overlap: the panel's summary has them. */
  form: ReadingForm | 'none';
  readings: PlacedReading[];
}

/** The least space between two labels before the layout gives the form up. */
export const READING_GAP = 8;

const tooClose = (a: PlacedReading, b: PlacedReading) =>
  a.left < b.left + b.width + READING_GAP &&
  b.left < a.left + a.width + READING_GAP &&
  a.top < b.top + b.height + READING_GAP &&
  b.top < a.top + a.height + READING_GAP;

function place(
  c: ReadingInput,
  boxWidth: number,
  boxHeight: number,
  form: ReadingForm,
  fontScale: number
): PlacedReading[] {
  const size = readingSize(form, fontScale);
  const raw = computeBladeReadings(c, boxWidth, boxHeight, {
    labelWidth: size.row.width,
    labelHeight: size.col.height,
  });
  return raw.map((r) => {
    const vertical = r.side === 'top' || r.side === 'bottom';
    const dim = vertical ? size.col : size.row;
    const shift = r.isInside ? EDGE_INSET : 0;
    const x =
      r.x + (r.side === 'left' ? shift : r.side === 'right' ? -shift : 0);
    const y =
      r.y + (r.side === 'top' ? shift : r.side === 'bottom' ? -shift : 0);
    const offset = bladeLabelOffset(r.side, r.isInside, dim.width, dim.height);
    return {
      ...r,
      x,
      y,
      left: x + offset.translateX,
      top: y + offset.translateY,
      width: dim.width,
      height: dim.height,
    };
  });
}

/**
 * Where the four blade readings go on the drawing, on the edges they describe.
 * It tries the full form, then the compact one, with every label inside the
 * print, then the same outside it, and takes the first whose labels all stay on
 * the paper and at least `READING_GAP` apart; when neither does (a
 * print too small to label) it returns none and the panel's text summary
 * carries the numbers.
 */
export function layoutReadings(
  c: ReadingInput,
  boxWidth: number,
  boxHeight: number,
  fontScale: number = 1
): ReadingsLayout {
  // Inside the print first (full, then compact), then wherever they fit.
  for (const insideOnly of [true, false]) {
    for (const form of ['full', 'compact'] as const) {
      const readings = place(c, boxWidth, boxHeight, form, fontScale);
      const onPaper = readings.every(
        (r) =>
          r.left >= 0 &&
          r.top >= 0 &&
          r.left + r.width <= boxWidth &&
          r.top + r.height <= boxHeight
      );
      const clear = readings.every((a, i) =>
        readings.every((b, j) => j <= i || !tooClose(a, b))
      );
      const inside = !insideOnly || readings.every((r) => r.isInside);
      if (onPaper && clear && inside) return { form, readings };
    }
  }
  return { form: 'none', readings: [] };
}
