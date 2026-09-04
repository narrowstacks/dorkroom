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
