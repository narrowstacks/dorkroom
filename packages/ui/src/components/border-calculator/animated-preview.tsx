/* ------------------------------------------------------------------ *
   animated-preview.tsx
   -------------------------------------------------------------
   Web-optimized animated preview with CSS animations
   -------------------------------------------------------------
   Features:
   - CSS-based animations for 60fps performance
   - Responsive preview scaling
   - Print area positioning with transforms
   - Blade visualization with smooth transitions
\* ------------------------------------------------------------------ */

import type { BorderCalculation } from '@dorkroom/logic';
import { useMemo } from 'react';
import { BladeReadingsOverlay } from './blade-readings-overlay';

interface AnimatedPreviewProps {
  calculation: BorderCalculation | null;
  showBlades?: boolean;
  showBladeReadings?: boolean;
  borderColor?: string;
  className?: string;
}

interface BladeProps {
  orientation: 'vertical' | 'horizontal';
  position: 'left' | 'right' | 'top' | 'bottom';
  positionPercent: number;
  thickness: number;
  opacity: number;
}

const AnimatedBlade = ({
  orientation,
  position,
  positionPercent,
  thickness,
  opacity,
}: BladeProps) => {
  const baseStyle = {
    position: 'absolute' as const,
    background: 'var(--blade-background)',
    border: 'var(--blade-border)',
    opacity,
    boxShadow: 'var(--blade-shadow)',
    zIndex: 10,
  };

  const orientationStyle =
    orientation === 'vertical'
      ? {
          top: -1000,
          bottom: -1000,
          width: thickness,
          left: `${positionPercent}%`,
          transform:
            position === 'left'
              ? `translateX(-${thickness}px)`
              : 'translateX(0)',
        }
      : {
          left: -1000,
          right: -1000,
          height: thickness,
          top: `${positionPercent}%`,
          transform:
            position === 'top'
              ? `translateY(-${thickness}px)`
              : 'translateY(0)',
        };

  return <div style={{ ...baseStyle, ...orientationStyle }} />;
};

export function AnimatedPreview({
  calculation,
  showBlades = true,
  showBladeReadings = false,
  className,
}: AnimatedPreviewProps) {

  // Static dimensions for consistent layout - make responsive for mobile
  const staticDimensions = useMemo(() => {
    if (!calculation) {
      // Use responsive dimensions that fit mobile screens better
      const isMobile = window.innerWidth < 768;
      return {
        width: isMobile ? Math.min(320, window.innerWidth - 80) : 400,
        height: isMobile ? Math.min(240, (window.innerWidth - 80) * 0.75) : 300,
      };
    }

    // Ensure preview dimensions are mobile-friendly
    const baseWidth = calculation.previewWidth || 400;
    const baseHeight = calculation.previewHeight || 300;
    const isMobile = window.innerWidth < 768;

    if (isMobile) {
      const maxWidth = Math.min(320, window.innerWidth - 80);
      const aspectRatio = baseHeight / baseWidth;
      const width = Math.min(baseWidth, maxWidth);
      const height = Math.min(baseHeight, width * aspectRatio);
      return { width, height };
    }

    return {
      width: baseWidth,
      height: baseHeight,
    };
  }, [calculation]);

  // Calculate transform values
  const transformValues = useMemo(() => {
    if (!calculation) return null;

    const containerWidth = staticDimensions.width;
    const containerHeight = staticDimensions.height;

    const printScaleX = (calculation.printWidthPercent || 0) / 100;
    const printScaleY = (calculation.printHeightPercent || 0) / 100;

    const printWidth = printScaleX * containerWidth;
    const printHeight = printScaleY * containerHeight;

    const printCenterX =
      ((calculation.leftBorderPercent || 0) / 100) * containerWidth +
      printWidth / 2;
    const printCenterY =
      ((calculation.topBorderPercent || 0) / 100) * containerHeight +
      printHeight / 2;

    const printTranslateX = printCenterX - containerWidth / 2;
    const printTranslateY = printCenterY - containerHeight / 2;

    return {
      printScale: { x: printScaleX, y: printScaleY },
      printTranslate: { x: printTranslateX, y: printTranslateY },
      leftBorderPercent: calculation.leftBorderPercent || 0,
      rightBorderPercent: 100 - (calculation.rightBorderPercent || 0),
      topBorderPercent: calculation.topBorderPercent || 0,
      bottomBorderPercent: 100 - (calculation.bottomBorderPercent || 0),
    };
  }, [calculation, staticDimensions]);

  if (!calculation || !transformValues) {
    return (
      <div
        className={`border bg-white/5 flex items-center justify-center mx-auto ${className}`}
        style={staticDimensions}
      >
        <div className="text-white/60">Preview</div>
      </div>
    );
  }

  const printStyle = {
    position: 'absolute' as const,
    backgroundColor: 'var(--color-print-background)',
    border: 'var(--print-border-style) var(--color-print-border)',
    left: 0,
    top: 0,
    width: staticDimensions.width,
    height: staticDimensions.height,
    transform: `translate(${transformValues.printTranslate.x}px, ${transformValues.printTranslate.y}px) scaleX(${transformValues.printScale.x}) scaleY(${transformValues.printScale.y})`,
    transformOrigin: 'center center',
  };

  const bladeThickness = calculation.bladeThickness || 2;

  return (
    <div
      className={`relative overflow-hidden mx-auto ${className}`}
      style={staticDimensions}
    >
      {/* Paper background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: 'var(--color-paper-background)',
          border: '1px solid var(--color-paper-border)',
        }}
      />

      {/* Print area */}
      <div style={printStyle} />

      {/* Blades */}
      {showBlades && (
        <>
          <AnimatedBlade
            orientation="vertical"
            position="left"
            positionPercent={transformValues.leftBorderPercent}
            thickness={bladeThickness}
            opacity={1}
          />
          <AnimatedBlade
            orientation="vertical"
            position="right"
            positionPercent={transformValues.rightBorderPercent}
            thickness={bladeThickness}
            opacity={1}
          />
          <AnimatedBlade
            orientation="horizontal"
            position="top"
            positionPercent={transformValues.topBorderPercent}
            thickness={bladeThickness}
            opacity={1}
          />
          <AnimatedBlade
            orientation="horizontal"
            position="bottom"
            positionPercent={transformValues.bottomBorderPercent}
            thickness={bladeThickness}
            opacity={1}
          />
        </>
      )}

      {/* Blade readings overlay */}
      {calculation && (
        <BladeReadingsOverlay
          calculation={calculation}
          containerWidth={staticDimensions.width}
          containerHeight={staticDimensions.height}
          showReadings={showBladeReadings}
        />
      )}
    </div>
  );
}
