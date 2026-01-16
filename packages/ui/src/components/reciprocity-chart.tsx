import { formatSeconds } from '@dorkroom/logic';
import { useEffect, useMemo, useRef, useState } from 'react';

interface ReciprocityChartProps {
  /**
   * Original metered exposure time in seconds
   */
  originalTime: number;
  /**
   * Adjusted exposure time in seconds (after reciprocity correction)
   */
  adjustedTime: number;
  /**
   * Reciprocity factor (exponent in the formula: adjusted = original^factor)
   */
  factor: number;
  /**
   * Film name for display purposes
   */
  filmName: string;
  /**
   * Optional class name for styling
   */
  className?: string;
  /**
   * Whether to scroll the chart into view when layout mode changes
   * (inline to wide or vice versa). Ignores generic window resizes.
   * @default false
   */
  autoScrollOnResize?: boolean;
}

interface Point {
  x: number;
  y: number;
}

// Helper to determine if container is in "wide" mode (used for layout mode detection)
const isWideModeLayout = (width: number): boolean => {
  return width > 768; // Typical md breakpoint for Tailwind
};

// Chart configuration constants for maintainability and theming
const CHART_CONFIG = {
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

/**
 * Calculate tooltip width based on annotation text length
 */
function calculateTooltipWidth(annotation: string): number {
  // Note: Character width estimate of 11px is an approximation based on proportional fonts.
  // For more precision, consider using canvas.measureText() for font-aware measurement,
  // though the current approach provides good accuracy for typical UI text rendering.
  const estimatedWidth =
    annotation.length * CHART_CONFIG.tooltip.charWidth +
    CHART_CONFIG.tooltip.padding;
  return Math.max(
    CHART_CONFIG.tooltip.minWidth,
    Math.min(estimatedWidth, CHART_CONFIG.tooltip.maxWidth)
  );
}

/**
 * ReciprocityChart displays a visual representation of reciprocity failure
 * showing how metered exposure times map to adjusted exposure times.
 *
 * The chart plots the reciprocity curve (y = x^factor) and highlights
 * the current calculation point with an annotation.
 */
export const ReciprocityChart: React.FC<ReciprocityChartProps> = ({
  originalTime,
  adjustedTime,
  factor,
  filmName,
  className = '',
  autoScrollOnResize = false,
}) => {
  const chartData = useMemo(() => {
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
    const xLabels = [];
    for (let x = 0; x <= maxMetered; x += CHART_CONFIG.labels.xLabelStep) {
      xLabels.push({
        x: scaleX(x),
        label: `${x}`,
      });
    }

    // Generate Y-axis labels dynamically, capped to prevent performance issues
    const yLabels = [];
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
    const hoverPoints: Array<{
      meteredTime: number;
      adjustedTime: number;
      x: number;
      y: number;
      annotation: string;
    }> = [];

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

    // Always include the current calculated point as a hover point so users can see their values
    // Check if it's not already included (i.e., not a multiple of 15)
    if (originalTime % 15 !== 0) {
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
  }, [originalTime, adjustedTime, factor]);

  // Generate SVG path for curve
  const curvePath = useMemo(() => {
    return chartData.curvePoints
      .map((point, i) => `${i === 0 ? 'M' : 'L'} ${point.x},${point.y}`)
      .join(' ');
  }, [chartData.curvePoints]);

  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(
    null
  );
  const [focusedPointIndex, setFocusedPointIndex] = useState<number | null>(
    null
  );

  const hoveredPoint =
    hoveredPointIndex !== null
      ? chartData.hoverPoints[hoveredPointIndex]
      : null;

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const previousDimensionsRef = useRef<{
    width: number;
    height: number;
    isWideMode: boolean;
  } | null>(null);

  // Flag to skip the initial resize observer callback (on mount)
  const isInitialMountRef = useRef(true);

  // Scroll chart into view only on intentional layout mode changes (not on initial render or generic window resizes)
  useEffect(() => {
    if (!chartContainerRef.current || !autoScrollOnResize) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      const { width, height } = entry.contentRect;

      // Skip the initial callback after mount
      if (isInitialMountRef.current) {
        isInitialMountRef.current = false;
        previousDimensionsRef.current = {
          width,
          height,
          isWideMode: isWideModeLayout(width),
        };
        return;
      }

      // Check if previous dimensions exist
      if (!previousDimensionsRef.current) {
        previousDimensionsRef.current = {
          width,
          height,
          isWideMode: isWideModeLayout(width),
        };
        return;
      }

      const previousDims = previousDimensionsRef.current;
      const currentIsWideMode = isWideModeLayout(width);

      // Only trigger scroll if layout mode changed (inline ↔ wide)
      const layoutModeChanged = previousDims.isWideMode !== currentIsWideMode;

      if (layoutModeChanged) {
        chartContainerRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }

      // Update previous dimensions for next comparison
      previousDimensionsRef.current = {
        width,
        height,
        isWideMode: currentIsWideMode,
      };
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [autoScrollOnResize]);

  return (
    <div className={className} ref={chartContainerRef}>
      <svg
        viewBox={`0 0 ${chartData.width} ${chartData.height}`}
        className="w-full"
        style={{
          maxHeight: '500px',
        }}
        role="img"
        aria-label={`Reciprocity curve for ${filmName}`}
      >
        <title>Reciprocity failure chart for {filmName}</title>
        <desc>
          A curve showing how metered exposure times map to adjusted exposure
          times due to reciprocity failure. Current calculation:{' '}
          {formatSeconds(originalTime)} metered becomes{' '}
          {formatSeconds(adjustedTime)} adjusted.
        </desc>
        {/* Grid lines */}
        <g opacity="0.15">
          {chartData.xGridLines.map((x, i) => (
            <line
              key={`x-grid-${i}`}
              x1={x}
              y1={chartData.padding.top}
              x2={x}
              y2={chartData.height - chartData.padding.bottom}
              stroke="var(--color-text-secondary)"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
          ))}
          {chartData.yGridLines.map((y, i) => (
            <line
              key={`y-grid-${i}`}
              x1={chartData.padding.left}
              y1={y}
              x2={chartData.width - chartData.padding.right}
              y2={y}
              stroke="var(--color-text-secondary)"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
          ))}
        </g>

        {/* Axes */}
        <g>
          {/* X-axis */}
          <line
            x1={chartData.padding.left}
            y1={chartData.height - chartData.padding.bottom}
            x2={chartData.width - chartData.padding.right}
            y2={chartData.height - chartData.padding.bottom}
            stroke="var(--color-text-secondary)"
            strokeWidth="2"
          />
          {/* Y-axis */}
          <line
            x1={chartData.padding.left}
            y1={chartData.padding.top}
            x2={chartData.padding.left}
            y2={chartData.height - chartData.padding.bottom}
            stroke="var(--color-text-secondary)"
            strokeWidth="2"
          />
        </g>

        {/* Axis labels */}
        <g>
          {/* X-axis labels */}
          {chartData.xLabels.map((label, i) => (
            <text
              key={`x-label-${i}`}
              x={label.x}
              y={
                chartData.height -
                chartData.padding.bottom +
                CHART_CONFIG.labels.offsets.xLabelOffset
              }
              textAnchor="middle"
              fontSize={CHART_CONFIG.labels.fontSize.label}
              fill="var(--color-text-secondary)"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              {label.label}
            </text>
          ))}
          {/* X-axis title */}
          <text
            x={chartData.width / 2}
            y={chartData.height - CHART_CONFIG.labels.offsets.xTitleOffset}
            textAnchor="middle"
            fontSize={CHART_CONFIG.labels.fontSize.title}
            fill="var(--color-text-primary)"
            fontWeight="500"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            Metered exposure in seconds
          </text>

          {/* Y-axis labels */}
          {chartData.yLabels.map((label, i) => (
            <text
              key={`y-label-${i}`}
              x={
                chartData.padding.left -
                CHART_CONFIG.labels.offsets.yLabelOffset
              }
              y={label.y + 6}
              textAnchor="end"
              fontSize={CHART_CONFIG.labels.fontSize.label}
              fill="var(--color-text-secondary)"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              {label.label}
            </text>
          ))}
          {/* Y-axis title */}
          <text
            x={16}
            y={chartData.height / CHART_CONFIG.labels.offsets.yTitleScale}
            textAnchor="middle"
            fontSize={CHART_CONFIG.labels.fontSize.title}
            fill="var(--color-text-primary)"
            fontWeight="500"
            fontFamily="system-ui, -apple-system, sans-serif"
            transform={`rotate(-90, 12, ${chartData.height / 2})`}
          >
            Adjusted exposure in seconds
          </text>
        </g>

        {/* Reciprocity curve */}
        <path
          d={curvePath}
          fill="none"
          stroke={CHART_CONFIG.colors.curve}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Calculated result point - always visible */}
        <g>
          <line
            x1={chartData.currentPoint.x}
            y1={chartData.currentPoint.y}
            x2={chartData.currentPoint.x}
            y2={chartData.height - chartData.padding.bottom}
            stroke="var(--color-text-tertiary)"
            strokeWidth="2"
            strokeDasharray="6,4"
            opacity="0.3"
          />
          <circle
            cx={chartData.currentPoint.x}
            cy={chartData.currentPoint.y}
            r={CHART_CONFIG.hover.currentPointRadius}
            fill={CHART_CONFIG.colors.curve}
            stroke="var(--color-background)"
            strokeWidth="2"
            opacity="0.6"
          />
        </g>

        {/* Interactive hover points along the curve (15 second increments) */}
        {chartData.hoverPoints.map((point, i) => (
          <g key={`hover-${i}`}>
            <circle
              cx={point.x}
              cy={point.y}
              r={CHART_CONFIG.hover.radius}
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredPointIndex(i)}
              onMouseLeave={() => setHoveredPointIndex(null)}
              tabIndex={0}
              // eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- SVG circle element cannot be replaced with button; uses role="button" for accessibility
              role="button"
              aria-label={point.annotation}
              onFocus={() => {
                setHoveredPointIndex(i);
                setFocusedPointIndex(i);
              }}
              onBlur={() => {
                setHoveredPointIndex(null);
                setFocusedPointIndex(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setHoveredPointIndex(hoveredPointIndex === i ? null : i);
                }
              }}
            />
            {/* Visible point marker - only show on hover */}
            {hoveredPointIndex === i && (
              <g style={{ pointerEvents: 'none' }}>
                {/* Vertical line from point to x-axis */}
                <line
                  x1={point.x}
                  y1={point.y}
                  x2={point.x}
                  y2={chartData.height - chartData.padding.bottom}
                  stroke="var(--color-text-tertiary)"
                  strokeWidth="2"
                  strokeDasharray="6,4"
                  opacity="0.7"
                />
                {/* Point marker */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={CHART_CONFIG.hover.markerRadius}
                  fill={CHART_CONFIG.colors.curve}
                  stroke="var(--color-background)"
                  strokeWidth="3"
                />
              </g>
            )}
            {/* Visual focus indicator ring for keyboard navigation */}
            {focusedPointIndex === i && (
              <circle
                cx={point.x}
                cy={point.y}
                r={CHART_CONFIG.hover.markerRadius + 3}
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="2"
                style={{ pointerEvents: 'none' }}
              />
            )}
          </g>
        ))}

        {/* Annotation callout - only show on hover */}
        {hoveredPoint &&
          (() => {
            const tooltipWidth = calculateTooltipWidth(hoveredPoint.annotation);
            const showRight =
              hoveredPoint.x + CHART_CONFIG.tooltip.offset + tooltipWidth <
              chartData.width;

            // Calculate vertical position with bounds checking
            const tooltipHeight = CHART_CONFIG.tooltip.height;
            let tooltipY = hoveredPoint.y - 30;
            // Ensure tooltip doesn't overflow top
            if (tooltipY < chartData.padding.top) {
              tooltipY = chartData.padding.top;
            }
            // Ensure tooltip doesn't overflow bottom
            else if (
              tooltipY + tooltipHeight >
              chartData.height - chartData.padding.bottom
            ) {
              tooltipY =
                chartData.height - chartData.padding.bottom - tooltipHeight;
            }

            return (
              <g style={{ pointerEvents: 'none' }}>
                {showRight ? (
                  // Show callout to the right if there's space
                  <>
                    <rect
                      x={hoveredPoint.x + CHART_CONFIG.tooltip.offset}
                      y={tooltipY}
                      width={tooltipWidth}
                      height={CHART_CONFIG.tooltip.height}
                      rx={CHART_CONFIG.tooltip.radius}
                      fill={CHART_CONFIG.colors.tooltipBg}
                      stroke={CHART_CONFIG.colors.tooltipBorder}
                      strokeWidth="1"
                    />
                    <text
                      x={
                        hoveredPoint.x +
                        CHART_CONFIG.tooltip.offset +
                        tooltipWidth / 2
                      }
                      y={tooltipY + 35}
                      textAnchor="middle"
                      fontSize={CHART_CONFIG.labels.fontSize.tooltip}
                      fontWeight="600"
                      fill={CHART_CONFIG.colors.tooltipText}
                      fontFamily="system-ui, -apple-system, sans-serif"
                    >
                      {hoveredPoint.annotation}
                    </text>
                  </>
                ) : (
                  // Show callout to the left if not enough space on right
                  <>
                    <rect
                      x={
                        hoveredPoint.x -
                        CHART_CONFIG.tooltip.offset -
                        tooltipWidth
                      }
                      y={tooltipY}
                      width={tooltipWidth}
                      height={CHART_CONFIG.tooltip.height}
                      rx={CHART_CONFIG.tooltip.radius}
                      fill={CHART_CONFIG.colors.tooltipBg}
                      stroke={CHART_CONFIG.colors.tooltipBorder}
                      strokeWidth="1"
                    />
                    <text
                      x={
                        hoveredPoint.x -
                        CHART_CONFIG.tooltip.offset -
                        tooltipWidth / 2
                      }
                      y={tooltipY + 35}
                      textAnchor="middle"
                      fontSize={CHART_CONFIG.labels.fontSize.tooltip}
                      fontWeight="600"
                      fill={CHART_CONFIG.colors.tooltipText}
                      fontFamily="system-ui, -apple-system, sans-serif"
                    >
                      {hoveredPoint.annotation}
                    </text>
                  </>
                )}
              </g>
            );
          })()}
      </svg>
    </div>
  );
};
