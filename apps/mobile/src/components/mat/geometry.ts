export interface MatRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface MatPreviewInput {
  outerWidth: number;
  outerHeight: number;
  borderTop: number;
  borderBottom: number;
  borderLeft: number;
  borderRight: number;
  artworkWidth: number;
  artworkHeight: number;
  revealMode: boolean;
  valid: boolean;
  availableWidth: number;
  maxHeight: number;
}

export interface MatPreviewGeometry {
  board: MatRect;
  window: MatRect;
  artwork: MatRect | null;
  scale: number;
}

export function computeMatPreviewGeometry(
  input: MatPreviewInput
): MatPreviewGeometry | null {
  const numeric = [
    input.outerWidth,
    input.outerHeight,
    input.borderTop,
    input.borderBottom,
    input.borderLeft,
    input.borderRight,
    input.availableWidth,
    input.maxHeight,
  ];
  if (!input.valid || numeric.some((value) => !Number.isFinite(value))) {
    return null;
  }
  if (
    input.outerWidth <= 0 ||
    input.outerHeight <= 0 ||
    input.availableWidth <= 0 ||
    input.maxHeight <= 0
  ) {
    return null;
  }
  if (
    input.borderTop < 0 ||
    input.borderBottom < 0 ||
    input.borderLeft < 0 ||
    input.borderRight < 0 ||
    input.borderLeft + input.borderRight >= input.outerWidth ||
    input.borderTop + input.borderBottom >= input.outerHeight
  ) {
    return null;
  }

  const scale = Math.min(
    input.availableWidth / input.outerWidth,
    input.maxHeight / input.outerHeight
  );
  const boardWidth = input.outerWidth * scale;
  const boardHeight = input.outerHeight * scale;
  const board = {
    left: (input.availableWidth - boardWidth) / 2,
    top: 0,
    width: boardWidth,
    height: boardHeight,
  };
  const window = {
    left: board.left + input.borderLeft * scale,
    top: input.borderTop * scale,
    width: (input.outerWidth - input.borderLeft - input.borderRight) * scale,
    height: (input.outerHeight - input.borderTop - input.borderBottom) * scale,
  };
  const artworkValid =
    input.revealMode &&
    Number.isFinite(input.artworkWidth) &&
    Number.isFinite(input.artworkHeight) &&
    input.artworkWidth > 0 &&
    input.artworkHeight > 0;
  const artwork = artworkValid
    ? {
        left:
          board.left + ((input.outerWidth - input.artworkWidth) / 2) * scale,
        top: ((input.outerHeight - input.artworkHeight) / 2) * scale,
        width: input.artworkWidth * scale,
        height: input.artworkHeight * scale,
      }
    : null;
  return { board, window, artwork, scale };
}

/** Thinnest a top or bottom border band may be, in px, and still hold its label. */
const BAND_MIN_HEIGHT = 16;
/** Thinnest a left or right band may be, in px: it holds the text across. */
const BAND_MIN_WIDTH = 34;
/** Shortest a left or right band may be: the text is one line tall. */
const BAND_MIN_LENGTH = 16;

/**
 * Whether a border's value label fits in its band on the drawing. A band too
 * thin for the text, or too short along its edge (a window squeezed to 1/2"),
 * hides it rather than shrinking it to nothing; the value is still in the
 * drawing's spoken summary.
 */
export function borderLabelFits(
  edge: 'top' | 'bottom' | 'left' | 'right',
  bandPx: number,
  alongPx: number = Number.POSITIVE_INFINITY
): boolean {
  if (edge === 'top' || edge === 'bottom') return bandPx >= BAND_MIN_HEIGHT;
  return bandPx >= BAND_MIN_WIDTH && alongPx >= BAND_MIN_LENGTH;
}

/** Narrowest and shortest a window may be, in px, and still hold its size label. */
const WINDOW_LABEL_MIN_WIDTH = 96;
const WINDOW_LABEL_MIN_HEIGHT = 20;

/**
 * Whether the window's own size label fits inside it. A window too small for it
 * leaves the label out (the caption under the drawing always carries the size)
 * rather than truncating it to "1..".
 */
export function windowLabelFits(window: {
  width: number;
  height: number;
}): boolean {
  return (
    window.width >= WINDOW_LABEL_MIN_WIDTH &&
    window.height >= WINDOW_LABEL_MIN_HEIGHT
  );
}
