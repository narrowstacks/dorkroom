import { formatSeconds } from '@dorkroom/logic';

// Chart configuration constants for maintainability and theming
export const CHART_CONFIG = {
  dimensions: {
    width: 800,
    height: 500,
    padding: { top: 40, right: 40, bottom: 60, left: 80 },
  },
  grid: {
    maxGridLines: 20,
    xStepThreshold: 200,
    xStepLarge: 60,
    xStepSmall: 30,
  },
  labels: {
    maxLabels: 10,
    yLabelStepDefault: 400,
    xLabelStep: 60,
    fontSize: {
      label: 20,
      title: 22,
      tooltip: 18,
    },
    offsets: {
      xLabelOffset: 25,
      yLabelOffset: 15,
      xTitleOffset: 12,
      yTitleScale: 2.2,
    },
  },
  hover: {
    interval: 15, // seconds
    radius: 20, // hover detection area - ensures line hover stays active
    markerRadius: 8,
    currentPointRadius: 6,
    maxPoints: 50, // maximum number of hover points to prevent performance issues
  },
  tooltip: {
    minWidth: 80,
    maxWidth: 280,
    height: 60,
    offset: 15,
    radius: 8,
    charWidth: 11, // approximate width per character at fontSize 18
    padding: 20, // horizontal padding inside tooltip
  },
  colors: {
    curve: 'var(--color-chart-primary)',
    tooltipBg: 'var(--color-tooltip-bg)',
    tooltipBorder: 'var(--color-tooltip-border)',
    tooltipText: 'var(--color-tooltip-text)',
  },
} as const;

interface Point {
  x: number;
  y: number;
}

export interface HoverPoint {
  meteredTime: number;
  adjustedTime: number;
  x: number;
  y: number;
  annotation: string;
}

export interface AxisLabel {
  x?: number;
  y?: number;
  label: string;
}

export interface ChartData {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
  plotWidth: number;
  plotHeight: number;
  curvePoints: Point[];
  currentPoint: Point;
  xGridLines: number[];
  yGridLines: number[];
  xLabels: AxisLabel[];
  yLabels: AxisLabel[];
  maxMetered: number;
  maxAdjusted: number;
  hoverPoints: HoverPoint[];
  scaleX: (x: number) => number;
  scaleY: (y: number) => number;
}

/**
 * Compute the geometry, scales, grid lines, axis labels, and hover points for
 * the reciprocity chart given the current calculation inputs.
 */
export function computeChartData(
  originalTime: number,
  adjustedTime: number,
  factor: number
): ChartData {
  // Chart dimensions
  const width = CHART_CONFIG.dimensions.width;
  const height = CHART_CONFIG.dimensions.height;
  const padding = CHART_CONFIG.dimensions.padding;
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Dynamic range based on current calculation with some headroom
  const maxMetered = Math.max(300, originalTime * 1.5);
  const maxAdjusted = Math.max(adjustedTime * 1.3, maxMetered ** factor);

  // Scale functions
  const scaleX = (x: number) => (x / maxMetered) * plotWidth + padding.left;
  const scaleY = (y: number) =>
    height - padding.bottom - (y / maxAdjusted) * plotHeight;

  // Generate curve points
  const curvePoints: Point[] = [];
  const steps = 100;
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * maxMetered;
    const y = x ** factor;
    curvePoints.push({ x: scaleX(x), y: scaleY(y) });
  }

  // Current point
  const currentPoint = {
    x: scaleX(originalTime),
    y: scaleY(adjustedTime),
  };

  // Grid lines
  const xGridLines: number[] = [];
  const xStep =
    maxMetered > CHART_CONFIG.grid.xStepThreshold
      ? CHART_CONFIG.grid.xStepLarge
      : CHART_CONFIG.grid.xStepSmall;
  for (let i = xStep; i < maxMetered; i += xStep) {
    xGridLines.push(scaleX(i));
  }

  const yGridLines: number[] = [];
  let yStep = maxAdjusted > 800 ? 200 : 100;
  // Dynamically increase yStep if it would create too many lines
  while (maxAdjusted / yStep > CHART_CONFIG.grid.maxGridLines) {
    yStep *= 2;
  }
  for (let i = yStep; i < maxAdjusted; i += yStep) {
    yGridLines.push(scaleY(i));
  }

  // Axis labels
  // Generate X-axis labels dynamically
  const xLabels: AxisLabel[] = [];
  for (let x = 0; x <= maxMetered; x += CHART_CONFIG.labels.xLabelStep) {
    xLabels.push({
      x: scaleX(x),
      label: `${x}`,
    });
  }

  // Generate Y-axis labels dynamically, capped to prevent performance issues
  const yLabels: AxisLabel[] = [];
  let yLabelStep = CHART_CONFIG.labels.yLabelStepDefault;
  // Dynamically increase label step if it would create too many labels
  while (maxAdjusted / yLabelStep > CHART_CONFIG.labels.maxLabels) {
    yLabelStep *= 2;
  }
  for (let y = 0; y <= maxAdjusted; y += yLabelStep) {
    yLabels.push({
      y: scaleY(y),
      label: `${y}`,
    });
  }

  // Generate hover points along the curve with dynamic interval to limit total points
  const hoverPoints: HoverPoint[] = [];

  const interval = CHART_CONFIG.hover.interval;
  const maxPoints = CHART_CONFIG.hover.maxPoints;

  // Calculate total points that would be generated at the default interval
  const totalPoints = Math.ceil(maxMetered / interval);

  // Compute effective interval to limit points if necessary
  let effectiveInterval = interval;
  if (totalPoints > maxPoints) {
    const multiplier = Math.ceil(totalPoints / maxPoints);
    effectiveInterval = interval * multiplier;
  }

  for (let t = effectiveInterval; t <= maxMetered; t += effectiveInterval) {
    const adjustedT = t ** factor;
    hoverPoints.push({
      meteredTime: t,
      adjustedTime: adjustedT,
      x: scaleX(t),
      y: scaleY(adjustedT),
      annotation: `${formatSeconds(t)} → ${formatSeconds(adjustedT)}`,
    });
  }

  // Always include the final maxMetered point if it's not already included
  const lastHoverPoint = hoverPoints[hoverPoints.length - 1];
  if (!lastHoverPoint || lastHoverPoint.meteredTime < maxMetered) {
    const adjustedMaxMetered = maxMetered ** factor;
    hoverPoints.push({
      meteredTime: maxMetered,
      adjustedTime: adjustedMaxMetered,
      x: scaleX(maxMetered),
      y: scaleY(adjustedMaxMetered),
      annotation: `${formatSeconds(maxMetered)} → ${formatSeconds(
        adjustedMaxMetered
      )}`,
    });
  }

  // Always include the current calculated point as a hover point so users can
  // see their values. Presence is checked directly rather than via interval
  // math because the generation interval above scales with the range.
  const hasCurrentPoint = hoverPoints.some(
    (point) => point.meteredTime === originalTime
  );
  if (!hasCurrentPoint) {
    hoverPoints.push({
      meteredTime: originalTime,
      adjustedTime: adjustedTime,
      x: scaleX(originalTime),
      y: scaleY(adjustedTime),
      annotation: `${formatSeconds(originalTime)} → ${formatSeconds(
        adjustedTime
      )}`,
    });
    // Sort by metered time to maintain order
    hoverPoints.sort((a, b) => a.meteredTime - b.meteredTime);
  }

  return {
    width,
    height,
    padding,
    plotWidth,
    plotHeight,
    curvePoints,
    currentPoint,
    xGridLines,
    yGridLines,
    xLabels,
    yLabels,
    maxMetered,
    maxAdjusted,
    hoverPoints,
    scaleX,
    scaleY,
  };
}
