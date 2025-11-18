/* ------------------------------------------------------------------ *
   blade-readings-overlay.tsx
   -------------------------------------------------------------
   Overlay component that displays blade readings on the print preview
   with smart positioning and arrow indicators
   -------------------------------------------------------------
   Features:
   - Dynamic positioning based on available space
   - Boundary-aware positioning to keep readings visible
   - Arrow indicators pointing towards blade positions
   - Smooth transitions for show/hide
   - Responsive text sizing
\* ------------------------------------------------------------------ */

import { useMemo } from 'react';
import type { BorderCalculation } from '@dorkroom/logic';
import { useMeasurementFormatter } from '../../hooks/use-measurement-conversion';

interface BladeReadingsOverlayProps {
  calculation: BorderCalculation;
  containerWidth: number;
  containerHeight: number;
  showReadings: boolean;
  className?: string;
}

interface BladeReading {
  label: string;
  value: string;
  position: {
    x: number;
    y: number;
  };
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

    // Calculate print area boundaries in pixels
    const printLeftPx = (calculation.leftBorderPercent / 100) * containerWidth;
    const printRightPx =
      ((100 - calculation.rightBorderPercent) / 100) * containerWidth;
    const printTopPx = (calculation.topBorderPercent / 100) * containerHeight;
    const printBottomPx =
      ((100 - calculation.bottomBorderPercent) / 100) * containerHeight;

    const printWidth = printRightPx - printLeftPx;
    const printHeight = printBottomPx - printTopPx;

    // Minimum space needed for text display (approximate)
    const minTextWidth = 80; // Increased from 60 to provide more buffer
    const minTextHeight = 40; // Increased from 30 to provide more buffer
    const padding = 8; // Increased from 4 to provide more spacing

    // Determine if readings should be inside or outside print area
    const leftCanFitInside = printWidth > +minTextWidth + (padding + 11) * 6;
    const rightCanFitInside = printWidth > +minTextWidth + (padding + 11) * 6;
    const topCanFitInside = printHeight > minTextHeight + (padding + 11) * 6;
    const bottomCanFitInside = printHeight > minTextHeight + (padding + 11) * 6;

    // Check if readings would fall outside container bounds when placed outside print area
    const leftHasSpaceOutside = printLeftPx - padding - minTextWidth >= 0;
    const rightHasSpaceOutside =
      printRightPx + padding + minTextWidth <= containerWidth;
    const topHasSpaceOutside = printTopPx - padding - minTextHeight >= 0;
    const bottomHasSpaceOutside =
      printBottomPx + padding + minTextHeight <= containerHeight;

    const readings: BladeReading[] = [];

    // Left blade reading - position at left blade boundary
    const leftShouldBeInside = leftCanFitInside || !leftHasSpaceOutside;
    readings.push({
      label: 'Left',
      value: formatWithUnit(calculation.leftBladeReading),
      position: {
        x: leftShouldBeInside ? printLeftPx + padding : printLeftPx - padding,
        y: (printTopPx + printBottomPx) / 2,
      },
      side: 'left',
      isInside: leftShouldBeInside,
    });

    // Right blade reading - position at right blade boundary
    const rightShouldBeInside = rightCanFitInside || !rightHasSpaceOutside;
    readings.push({
      label: 'Right',
      value: formatWithUnit(calculation.rightBladeReading),
      position: {
        x: rightShouldBeInside
          ? printRightPx - padding
          : printRightPx + padding,
        y: (printTopPx + printBottomPx) / 2,
      },
      side: 'right',
      isInside: rightShouldBeInside,
    });

    // Top blade reading - position at top blade boundary
    const topShouldBeInside = topCanFitInside || !topHasSpaceOutside;
    readings.push({
      label: 'Top',
      value: formatWithUnit(calculation.topBladeReading),
      position: {
        x: (printLeftPx + printRightPx) / 2,
        y: topShouldBeInside ? printTopPx + padding : printTopPx - padding,
      },
      side: 'top',
      isInside: topShouldBeInside,
    });

    // Bottom blade reading - position at bottom blade boundary
    const bottomShouldBeInside = bottomCanFitInside || !bottomHasSpaceOutside;
    readings.push({
      label: 'Bottom',
      value: formatWithUnit(calculation.bottomBladeReading),
      position: {
        x: (printLeftPx + printRightPx) / 2,
        y: bottomShouldBeInside
          ? printBottomPx - padding
          : printBottomPx + padding,
      },
      side: 'bottom',
      isInside: bottomShouldBeInside,
    });

    return readings;
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

interface BladeReadingIndicatorProps {
  reading: BladeReading;
}

function BladeReadingIndicator({ reading }: BladeReadingIndicatorProps) {
  const { position, side, value, isInside } = reading;

  // Determine positioning and arrow direction based on side
  const getLayoutProps = () => {
    switch (side) {
      case 'left':
        return {
          transform: isInside ? 'translate(0, -50%)' : 'translate(-100%, -50%)',
          arrow: isInside ? '←' : '→',
          flexDirection: 'row' as const,
          arrowFirst: isInside ? true : false,
        };
      case 'right':
        return {
          transform: isInside ? 'translate(-100%, -50%)' : 'translate(0, -50%)',
          arrow: isInside ? '→' : '←',
          flexDirection: 'row' as const,
          arrowFirst: isInside ? false : true,
        };
      case 'top':
        return {
          transform: isInside ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
          arrow: isInside ? '↑' : '↓',
          flexDirection: 'column' as const,
          arrowFirst: isInside ? true : false,
        };
      case 'bottom':
        return {
          transform: isInside ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
          arrow: isInside ? '↓' : '↑',
          flexDirection: 'column' as const,
          arrowFirst: isInside ? false : true,
        };
      default:
        return {
          transform: 'translate(-50%, -50%)',
          arrow: '•',
          flexDirection: 'row' as const,
          arrowFirst: true,
        };
    }
  };

  const { transform, arrow, flexDirection, arrowFirst } = getLayoutProps();

  const baseStyle = {
    position: 'absolute' as const,
    left: position.x,
    top: position.y,
    transform,
    transition: 'all 0.15s ease-in-out',
  };

  const containerClasses = `flex items-center gap-1 px-2 py-1 rounded text-xs font-medium shadow-lg backdrop-blur-sm`;
  const containerStyle = {
    backgroundColor: 'var(--color-visualization-overlay)',
    color: 'var(--color-text-primary)',
    border: '1px solid var(--color-border-secondary)',
  };
  const flexClasses = flexDirection === 'column' ? 'flex-col' : 'flex-row';

  return (
    <div
      style={{ ...baseStyle, ...containerStyle }}
      className={`${containerClasses} ${flexClasses}`}
    >
      {arrowFirst && (
        <span className="text-sm" style={{ color: 'var(--color-accent)' }}>
          {arrow}
        </span>
      )}
      <span className="whitespace-nowrap">{value}</span>
      {!arrowFirst && (
        <span className="text-sm" style={{ color: 'var(--color-accent)' }}>
          {arrow}
        </span>
      )}
    </div>
  );
}
