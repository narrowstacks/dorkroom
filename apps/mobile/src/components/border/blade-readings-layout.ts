import type { BorderCalculation } from '@dorkroom/logic';

export type BladeSide = 'left' | 'right' | 'top' | 'bottom';

export interface BladeReadingLayout {
  side: BladeSide;
  reading: number;
  x: number;
  y: number;
  isInside: boolean;
  arrow: '←' | '→' | '↑' | '↓';
  arrowFirst: boolean;
  translateX: number;
  translateY: number;
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
    layoutFor(
      'left',
      c.leftBladeReading,
      leftX,
      centerY,
      hInside,
      labelWidth,
      labelHeight
    ),
    layoutFor(
      'right',
      c.rightBladeReading,
      rightX,
      centerY,
      hInside,
      labelWidth,
      labelHeight
    ),
    layoutFor(
      'top',
      c.topBladeReading,
      centerX,
      topY,
      vInside,
      labelWidth,
      labelHeight
    ),
    layoutFor(
      'bottom',
      c.bottomBladeReading,
      centerX,
      bottomY,
      vInside,
      labelWidth,
      labelHeight
    ),
  ];
}

function layoutFor(
  side: BladeSide,
  reading: number,
  x: number,
  y: number,
  isInside: boolean,
  labelWidth: number,
  labelHeight: number
): BladeReadingLayout {
  const halfW = labelWidth / 2;
  const halfH = labelHeight / 2;
  const base = { side, reading, x, y, isInside };

  if (isInside) {
    switch (side) {
      case 'left':
        return {
          ...base,
          arrow: '←',
          arrowFirst: true,
          translateX: 0,
          translateY: -halfH,
        };
      case 'right':
        return {
          ...base,
          arrow: '→',
          arrowFirst: false,
          translateX: -labelWidth,
          translateY: -halfH,
        };
      case 'top':
        return {
          ...base,
          arrow: '↑',
          arrowFirst: true,
          translateX: -halfW,
          translateY: 0,
        };
      case 'bottom':
        return {
          ...base,
          arrow: '↓',
          arrowFirst: false,
          translateX: -halfW,
          translateY: -labelHeight,
        };
    }
  }
  switch (side) {
    case 'left':
      return {
        ...base,
        arrow: '→',
        arrowFirst: false,
        translateX: -labelWidth,
        translateY: -halfH,
      };
    case 'right':
      return {
        ...base,
        arrow: '←',
        arrowFirst: true,
        translateX: 0,
        translateY: -halfH,
      };
    case 'top':
      return {
        ...base,
        arrow: '↓',
        arrowFirst: false,
        translateX: -halfW,
        translateY: -labelHeight,
      };
    case 'bottom':
      return {
        ...base,
        arrow: '↑',
        arrowFirst: true,
        translateX: -halfW,
        translateY: 0,
      };
  }
}
