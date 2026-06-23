export interface Padding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ChartLayout {
  width: number;
  height: number;
  padding: Padding;
  maxMetered: number;
  maxAdjusted: number;
}

export interface ChartPoint {
  x: number;
  y: number;
}

export interface AxisTick {
  value: number;
  px: number;
}

/**
 * Linear-axis layout for the reciprocity curve (adjusted = metered^factor),
 * faithful to the web chart: metered seconds on X, adjusted seconds on Y, with
 * headroom around the current calculation.
 */
export function computeChartLayout(params: {
  originalTime: number;
  adjustedTime: number;
  factor: number;
  width: number;
  height: number;
  padding: Padding;
}): ChartLayout {
  const { originalTime, adjustedTime, factor, width, height, padding } = params;
  const maxMetered = Math.max(300, originalTime * 1.5);
  const maxAdjusted = Math.max(adjustedTime * 1.3, maxMetered ** factor);
  return { width, height, padding, maxMetered, maxAdjusted };
}

export function scaleX(metered: number, l: ChartLayout): number {
  const plotWidth = l.width - l.padding.left - l.padding.right;
  return l.padding.left + (metered / l.maxMetered) * plotWidth;
}

export function scaleY(adjusted: number, l: ChartLayout): number {
  const plotHeight = l.height - l.padding.top - l.padding.bottom;
  return l.height - l.padding.bottom - (adjusted / l.maxAdjusted) * plotHeight;
}

/** Inverse of scaleX, clamped to the plotted metered range — for drag input. */
export function meteredAtX(px: number, l: ChartLayout): number {
  const plotWidth = l.width - l.padding.left - l.padding.right;
  if (plotWidth <= 0) return 0;
  const t = (px - l.padding.left) / plotWidth;
  return Math.min(1, Math.max(0, t)) * l.maxMetered;
}

/** Sample the curve across the plotted range. Returns `samples + 1` points. */
export function buildCurve(
  l: ChartLayout,
  factor: number,
  samples = 100
): ChartPoint[] {
  const points: ChartPoint[] = [];
  for (let i = 0; i <= samples; i++) {
    const metered = (i / samples) * l.maxMetered;
    const adjusted = metered ** factor;
    points.push({ x: scaleX(metered, l), y: scaleY(adjusted, l) });
  }
  return points;
}

/** Pixel positions of dashed grid lines for both axes. */
export function gridLines(l: ChartLayout): { x: number[]; y: number[] } {
  const x: number[] = [];
  const xStep = l.maxMetered > 200 ? 60 : 30;
  for (let v = xStep; v < l.maxMetered; v += xStep) x.push(scaleX(v, l));

  const y: number[] = [];
  let yStep = l.maxAdjusted > 800 ? 200 : 100;
  while (l.maxAdjusted / yStep > 20) yStep *= 2;
  for (let v = yStep; v < l.maxAdjusted; v += yStep) y.push(scaleY(v, l));

  return { x, y };
}

/** Tick values + pixel positions for axis labels. */
export function axisTicks(l: ChartLayout): { x: AxisTick[]; y: AxisTick[] } {
  const x: AxisTick[] = [];
  for (let v = 0; v <= l.maxMetered; v += 60)
    x.push({ value: v, px: scaleX(v, l) });

  const y: AxisTick[] = [];
  let yStep = 400;
  while (l.maxAdjusted / yStep > 8) yStep *= 2;
  for (let v = 0; v <= l.maxAdjusted; v += yStep)
    y.push({ value: v, px: scaleY(v, l) });

  return { x, y };
}
