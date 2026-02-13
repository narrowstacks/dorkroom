/* ------------------------------------------------------------------ *
   blade-readings-overlay.tsx
   -------------------------------------------------------------
   Overlay component that displays blade readings on the print preview
   with smart positioning and arrow indicators
   -------------------------------------------------------------
   Features:
   - Inside positioning when print area is large enough
   - Boundary-straddling when labels don't fit inside
   - Arrow indicators pointing towards blade positions
   - Smooth transitions for show/hide
   - Responsive text sizing
\* ------------------------------------------------------------------ */

import type { BorderCalculation } from '@dorkroom/logic';
import { useMemo } from 'react';
import { useMeasurementFormatter } from '../../hooks/use-measurement-conversion';

interface BladeReadingsOverlayProps {
  calculation: BorderCalculation;
  containerWidth: number;
  containerHeight: number;
  showReadings: boolean;
  className?: string;
}

interface BladeReading {
  value: string;
  position: { x: number; y: number };
  side: 'left' | 'right' | 'top' | 'bottom';
  isInside: boolean;
}

export function BladeReadingsOverlay({
  calculation,
  containerWidth,
  containerHeight,
  showReadings,
  className = '',
}: BladeReadingsOverlayProps) {
  const { formatWithUnit } = useMeasurementFormatter();

  const readings = useMemo((): BladeReading[] => {
    if (!calculation) return [];

    const printLeftPx = (calculation.leftBorderPercent / 100) * containerWidth;
    const printRightPx =
      ((100 - calculation.rightBorderPercent) / 100) * containerWidth;
    const printTopPx = (calculation.topBorderPercent / 100) * containerHeight;
    const printBottomPx =
      ((100 - calculation.bottomBorderPercent) / 100) * containerHeight;

    const printWidth = printRightPx - printLeftPx;
    const printHeight = printBottomPx - printTopPx;

    // Approximate label dimensions at current font size
    const labelWidth = 85;
    const labelHeight = 45;
    const padding = 10;

    // Labels go inside only if BOTH opposing labels fit without overlapping
    const hInside = printWidth > labelWidth * 2 + padding * 2;
    const vInside = printHeight > labelHeight * 2 + padding * 2;

    const centerY = (printTopPx + printBottomPx) / 2;
    const centerX = (printLeftPx + printRightPx) / 2;

    // When labels are outside, clamp positions so they don't go off-canvas.
    // For outside labels, ensure there's room for the label between the blade
    // edge and the container edge.
    const clampedLeftX = hInside
      ? printLeftPx
      : Math.max(labelWidth + padding, printLeftPx);
    const clampedRightX = hInside
      ? printRightPx
      : Math.min(containerWidth - labelWidth - padding, printRightPx);
    const clampedTopY = vInside
      ? printTopPx
      : Math.max(labelHeight + padding, printTopPx);
    const clampedBottomY = vInside
      ? printBottomPx
      : Math.min(containerHeight - labelHeight - padding, printBottomPx);

    return [
      {
        value: formatWithUnit(calculation.leftBladeReading),
        position: { x: clampedLeftX, y: centerY },
        side: 'left' as const,
        isInside: hInside,
      },
      {
        value: formatWithUnit(calculation.rightBladeReading),
        position: { x: clampedRightX, y: centerY },
        side: 'right' as const,
        isInside: hInside,
      },
      {
        value: formatWithUnit(calculation.topBladeReading),
        position: { x: centerX, y: clampedTopY },
        side: 'top' as const,
        isInside: vInside,
      },
      {
        value: formatWithUnit(calculation.bottomBladeReading),
        position: { x: centerX, y: clampedBottomY },
        side: 'bottom' as const,
        isInside: vInside,
      },
    ];
  }, [calculation, containerWidth, containerHeight, formatWithUnit]);

  if (!showReadings || !calculation) {
    return null;
  }

  return (
    <div
      className={`absolute inset-0 pointer-events-none transition-opacity ease-in-out ${
        showReadings ? 'opacity-100' : 'opacity-0'
      } ${className}`}
      style={{
        transitionDuration: '0.15s',
        zIndex: 20,
      }}
    >
      {readings.map((reading) => (
        <BladeReadingIndicator key={reading.side} reading={reading} />
      ))}
    </div>
  );
}

function BladeReadingIndicator({ reading }: { reading: BladeReading }) {
  const { position, side, value, isInside } = reading;
  const isVertical = side === 'top' || side === 'bottom';

  // Inside: label fully within print area, arrow points toward blade
  // Straddling: label centered on blade boundary
  const getTransformAndArrow = () => {
    if (isInside) {
      switch (side) {
        case 'left':
          return {
            transform: 'translate(0, -50%)',
            arrow: '←',
            arrowFirst: true,
          };
        case 'right':
          return {
            transform: 'translate(-100%, -50%)',
            arrow: '→',
            arrowFirst: false,
          };
        case 'top':
          return {
            transform: 'translate(-50%, 0)',
            arrow: '↑',
            arrowFirst: true,
          };
        case 'bottom':
          return {
            transform: 'translate(-50%, -100%)',
            arrow: '↓',
            arrowFirst: false,
          };
      }
    }
    // Outside: label in the border area, arrow pointing at the blade edge
    switch (side) {
      case 'left':
        return {
          transform: 'translate(-100%, -50%)',
          arrow: '→',
          arrowFirst: false,
        };
      case 'right':
        return {
          transform: 'translate(0, -50%)',
          arrow: '←',
          arrowFirst: true,
        };
      case 'top':
        return {
          transform: 'translate(-50%, -100%)',
          arrow: '↓',
          arrowFirst: false,
        };
      case 'bottom':
        return {
          transform: 'translate(-50%, 0)',
          arrow: '↑',
          arrowFirst: true,
        };
    }
  };

  const { transform, arrow, arrowFirst } = getTransformAndArrow();

  const arrowClasses = isVertical
    ? 'text-xl leading-none'
    : 'text-lg leading-none';

  return (
    <div
      className={`flex items-center gap-0.5 px-2.5 py-1 rounded text-sm font-medium shadow-lg backdrop-blur-sm ${
        isVertical ? 'flex-col' : 'flex-row'
      }`}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        transform,
        transition: 'all 0.15s ease-in-out',
        backgroundColor: 'var(--color-visualization-overlay)',
        color: 'var(--color-text-primary)',
        border: '1px solid var(--color-border-secondary)',
      }}
    >
      {arrowFirst && (
        <span className={arrowClasses} style={{ color: 'var(--color-accent)' }}>
          {arrow}
        </span>
      )}
      <span className="whitespace-nowrap">{value}</span>
      {!arrowFirst && (
        <span className={arrowClasses} style={{ color: 'var(--color-accent)' }}>
          {arrow}
        </span>
      )}
    </div>
  );
}
