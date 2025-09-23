/* ------------------------------------------------------------------ *
   blade-readings-overlay.tsx
   -------------------------------------------------------------
   Overlay component that displays blade readings on the print preview
   with smart positioning and arrow indicators
   -------------------------------------------------------------
   Features:
   - Dynamic positioning based on available space
   - Arrow indicators pointing towards blade positions
   - Smooth transitions for show/hide
   - Responsive text sizing
\* ------------------------------------------------------------------ */

import { useMemo } from 'react';
import type { BorderCalculation } from '@dorkroom/logic';

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
    const minTextWidth = 60;
    const minTextHeight = 30;
    const padding = 15;

    // Determine if readings should be inside or outside print area
    const leftCanFitInside = printWidth > minTextWidth + padding * 6;
    const rightCanFitInside = printWidth > minTextWidth + padding * 6;
    const topCanFitInside = printHeight > minTextHeight + padding * 6;
    const bottomCanFitInside = printHeight > minTextHeight + padding * 6;

    const readings: BladeReading[] = [];

    // Left blade reading - position at left blade boundary
    readings.push({
      label: 'Left',
      value: `${calculation.leftBladeReading.toFixed(2)}"`,
      position: {
        x: leftCanFitInside ? printLeftPx + padding : printLeftPx - padding,
        y: (printTopPx + printBottomPx) / 2,
      },
      side: 'left',
      isInside: leftCanFitInside,
    });

    // Right blade reading - position at right blade boundary
    readings.push({
      label: 'Right',
      value: `${calculation.rightBladeReading.toFixed(2)}"`,
      position: {
        x: rightCanFitInside ? printRightPx - padding : printRightPx + padding,
        y: (printTopPx + printBottomPx) / 2,
      },
      side: 'right',
      isInside: rightCanFitInside,
    });

    // Top blade reading - position at top blade boundary
    readings.push({
      label: 'Top',
      value: `${calculation.topBladeReading.toFixed(2)}"`,
      position: {
        x: (printLeftPx + printRightPx) / 2,
        y: topCanFitInside ? printTopPx + padding : printTopPx - padding,
      },
      side: 'top',
      isInside: topCanFitInside,
    });

    // Bottom blade reading - position at bottom blade boundary
    readings.push({
      label: 'Bottom',
      value: `${calculation.bottomBladeReading.toFixed(2)}"`,
      position: {
        x: (printLeftPx + printRightPx) / 2,
        y: bottomCanFitInside
          ? printBottomPx - padding
          : printBottomPx + padding,
      },
      side: 'bottom',
      isInside: bottomCanFitInside,
    });

    return readings;
  }, [calculation, containerWidth, containerHeight]);

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

  const containerClasses = `flex items-center gap-1 bg-black/50 text-white px-2 py-1 rounded text-xs font-medium shadow-lg backdrop-blur-sm`;
  const flexClasses = flexDirection === 'column' ? 'flex-col' : 'flex-row';

  return (
    <div style={baseStyle} className={`${containerClasses} ${flexClasses}`}>
      {arrowFirst && <span className="text-red-300 text-sm">{arrow}</span>}
      <span className="whitespace-nowrap">{value}</span>
      {!arrowFirst && <span className="text-red-300 text-sm">{arrow}</span>}
    </div>
  );
}
