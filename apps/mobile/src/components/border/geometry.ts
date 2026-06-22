import type { BorderCalculation } from '@dorkroom/logic';

export interface PaperBox {
  width: number;
  height: number;
}

/**
 * Size the paper rectangle to its real aspect ratio, fitting the available
 * container width and a maximum height. Returns a zero box for invalid input.
 */
export function computePaperBox(
  paperWidth: number,
  paperHeight: number,
  containerWidth: number,
  maxHeight: number
): PaperBox {
  if (
    paperWidth <= 0 ||
    paperHeight <= 0 ||
    containerWidth <= 0 ||
    maxHeight <= 0
  ) {
    return { width: 0, height: 0 };
  }
  const aspect = paperWidth / paperHeight;
  let width = containerWidth;
  let height = width / aspect;
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspect;
  }
  return { width, height };
}

export interface PrintRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Position the print area within the paper box using the hook's percentages. */
export function computePrintRect(
  c: Pick<
    BorderCalculation,
    | 'leftBorderPercent'
    | 'topBorderPercent'
    | 'printWidthPercent'
    | 'printHeightPercent'
  >,
  box: PaperBox
): PrintRect {
  return {
    left: (c.leftBorderPercent / 100) * box.width,
    top: (c.topBorderPercent / 100) * box.height,
    width: (c.printWidthPercent / 100) * box.width,
    height: (c.printHeightPercent / 100) * box.height,
  };
}
