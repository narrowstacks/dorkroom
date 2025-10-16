import { useMemo, useState } from 'react';

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
}

interface Point {
  x: number;
  y: number;
}

/**
 * ReciprocityChart displays a visual representation of reciprocity failure
 * showing how metered exposure times map to adjusted exposure times.
 *
 * The chart plots the reciprocity curve (y = x^factor) and highlights
 * the current calculation point with an annotation.
 */
export function ReciprocityChart({
  originalTime,
  adjustedTime,
  factor,
  filmName,
  className = '',
}: ReciprocityChartProps) {
  const chartData = useMemo(() => {
    // Chart dimensions
    const width = 800;
    const height = 500;
    const padding = { top: 40, right: 40, bottom: 60, left: 80 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    // Dynamic range based on current calculation with some headroom
    const maxMetered = Math.max(300, originalTime * 1.5);
    const maxAdjusted = Math.max(adjustedTime * 1.3, Math.pow(maxMetered, factor));

    // Scale functions
    const scaleX = (x: number) => (x / maxMetered) * plotWidth + padding.left;
    const scaleY = (y: number) =>
      height - padding.bottom - (y / maxAdjusted) * plotHeight;

    // Generate curve points
    const curvePoints: Point[] = [];
    const steps = 100;
    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * maxMetered;
      const y = Math.pow(x, factor);
      curvePoints.push({ x: scaleX(x), y: scaleY(y) });
    }

    // Current point
    const currentPoint = {
      x: scaleX(originalTime),
      y: scaleY(adjustedTime),
    };

    // Grid lines
    const xGridLines: number[] = [];
    const xStep = maxMetered > 200 ? 60 : 30;
    for (let i = xStep; i < maxMetered; i += xStep) {
      xGridLines.push(scaleX(i));
    }

    const yGridLines: number[] = [];
    const yStep = maxAdjusted > 800 ? 200 : 100;
    for (let i = yStep; i < maxAdjusted; i += yStep) {
      yGridLines.push(scaleY(i));
    }

    // Axis labels
    const xLabels = [0, 60, 120, 180, 240, 300]
      .filter((x) => x <= maxMetered)
      .map((x) => ({
        x: scaleX(x),
        label: `${x}`,
      }));

    // Generate Y-axis labels dynamically (every 400 to show every other value)
    const yLabels = [];
    const yLabelStep = 400;
    for (let y = 0; y <= maxAdjusted; y += yLabelStep) {
      yLabels.push({
        y: scaleY(y),
        label: `${y}`,
      });
    }

    // Format time for annotation
    const formatTime = (seconds: number): string => {
      if (seconds < 60) return `${Math.round(seconds * 10) / 10}s`;
      if (seconds < 3600) {
        const min = Math.floor(seconds / 60);
        const sec = Math.round((seconds % 60) * 10) / 10;
        return sec === 0 ? `${min}m` : `${min}m ${sec}s`;
      }
      const hrs = Math.floor(seconds / 3600);
      const min = Math.floor((seconds % 3600) / 60);
      return min === 0 ? `${hrs}h` : `${hrs}h ${min}m`;
    };

    // Generate hover points every 15 seconds along the curve
    const hoverPoints: Array<{
      meteredTime: number;
      adjustedTime: number;
      x: number;
      y: number;
      annotation: string;
    }> = [];

    for (let t = 0; t <= maxMetered; t += 15) {
      const adjustedT = Math.pow(t, factor);
      hoverPoints.push({
        meteredTime: t,
        adjustedTime: adjustedT,
        x: scaleX(t),
        y: scaleY(adjustedT),
        annotation: `${formatTime(t)} → ${formatTime(adjustedT)}`,
      });
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

  const hoveredPoint =
    hoveredPointIndex !== null
      ? chartData.hoverPoints[hoveredPointIndex]
      : null;

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${chartData.width} ${chartData.height}`}
        className="w-full"
        style={{
          maxHeight: '500px',
        }}
      >
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
              y={chartData.height - chartData.padding.bottom + 25}
              textAnchor="middle"
              fontSize="20"
              fill="var(--color-text-secondary)"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              {label.label}
            </text>
          ))}
          {/* X-axis title */}
          <text
            x={chartData.width / 2}
            y={chartData.height - 10}
            textAnchor="middle"
            fontSize="22"
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
              x={chartData.padding.left - 15}
              y={label.y + 6}
              textAnchor="end"
              fontSize="20"
              fill="var(--color-text-secondary)"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              {label.label}
            </text>
          ))}
          {/* Y-axis title */}
          <text
            x={12}
            y={chartData.height / 2}
            textAnchor="middle"
            fontSize="22"
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
          stroke="rgb(220, 38, 38)"
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
            r="6"
            fill="rgb(220, 38, 38)"
            stroke="white"
            strokeWidth="2"
            opacity="0.6"
          />
        </g>

        {/* Interactive hover points along the curve (15 second increments) */}
        {chartData.hoverPoints.map((point, i) => (
          <g key={`hover-${i}`}>
            {/* Invisible larger circle for hover detection */}
            <circle
              cx={point.x}
              cy={point.y}
              r="15"
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredPointIndex(i)}
              onMouseLeave={() => setHoveredPointIndex(null)}
            />
            {/* Visible point marker - only show on hover */}
            {hoveredPointIndex === i && (
              <>
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
                  r="8"
                  fill="rgb(220, 38, 38)"
                  stroke="white"
                  strokeWidth="3"
                  style={{ pointerEvents: 'none' }}
                />
              </>
            )}
          </g>
        ))}

        {/* Annotation callout - only show on hover */}
        {hoveredPoint && (
          <g style={{ pointerEvents: 'none' }}>
            {hoveredPoint.x < chartData.width - 200 ? (
              // Show callout to the right if there's space
              <>
                <rect
                  x={hoveredPoint.x + 15}
                  y={hoveredPoint.y - 30}
                  width="180"
                  height="60"
                  rx="8"
                  fill="rgba(245, 245, 244, 0.98)"
                  stroke="rgba(0, 0, 0, 0.2)"
                  strokeWidth="1"
                />
                <text
                  x={hoveredPoint.x + 105}
                  y={hoveredPoint.y + 5}
                  textAnchor="middle"
                  fontSize="18"
                  fontWeight="600"
                  fill="#1a1a1a"
                  fontFamily="system-ui, -apple-system, sans-serif"
                >
                  {hoveredPoint.annotation}
                </text>
              </>
            ) : (
              // Show callout to the left if not enough space on right
              <>
                <rect
                  x={hoveredPoint.x - 195}
                  y={hoveredPoint.y - 30}
                  width="180"
                  height="60"
                  rx="8"
                  fill="rgba(245, 245, 244, 0.98)"
                  stroke="rgba(0, 0, 0, 0.2)"
                  strokeWidth="1"
                />
                <text
                  x={hoveredPoint.x - 105}
                  y={hoveredPoint.y + 5}
                  textAnchor="middle"
                  fontSize="18"
                  fontWeight="600"
                  fill="#1a1a1a"
                  fontFamily="system-ui, -apple-system, sans-serif"
                >
                  {hoveredPoint.annotation}
                </text>
              </>
            )}
          </g>
        )}
      </svg>
    </div>
  );
}
