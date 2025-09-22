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

import { useMemo, useState, useEffect } from 'react';
import type { BorderCalculation } from '@dorkroom/logic';

interface AnimatedPreviewProps {
  calculation: BorderCalculation | null;
  showBlades?: boolean;
  borderColor?: string;
  className?: string;
}

interface BladeProps {
  orientation: 'vertical' | 'horizontal';
  position: 'left' | 'right' | 'top' | 'bottom';
  positionPercent: number;
  thickness: number;
  borderColor: string;
  opacity: number;
}

const AnimatedBlade = ({
  orientation,
  position,
  positionPercent,
  thickness,
  borderColor,
  opacity,
}: BladeProps) => {
  const baseStyle = {
    position: 'absolute' as const,
    backgroundColor: borderColor,
    opacity,
    transition: 'all 0.15s ease-in-out',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.25)',
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
  borderColor = '#353535',
  className,
}: AnimatedPreviewProps) {
  const [animatedValues, setAnimatedValues] = useState({
    printScale: { x: 0, y: 0 },
    printTranslate: { x: 0, y: 0 },
    bladeOpacity: showBlades ? 1 : 0,
  });

  // Static dimensions for consistent layout
  const staticDimensions = useMemo(() => {
    if (!calculation) return { width: 400, height: 300 };
    return {
      width: calculation.previewWidth || 400,
      height: calculation.previewHeight || 300,
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

  // Update animated values when transform values change
  useEffect(() => {
    if (!transformValues) return;

    setAnimatedValues((prev) => ({
      printScale: transformValues.printScale,
      printTranslate: transformValues.printTranslate,
      bladeOpacity: prev.bladeOpacity,
    }));
  }, [transformValues]);

  // Update blade opacity
  useEffect(() => {
    setAnimatedValues((prev) => ({
      ...prev,
      bladeOpacity: showBlades ? 1 : 0,
    }));
  }, [showBlades]);

  if (!calculation || !transformValues) {
    return (
      <div
        className={`border bg-white/5 flex items-center justify-center ${className}`}
        style={staticDimensions}
      >
        <div className="text-white/60">Preview</div>
      </div>
    );
  }

  const printStyle = {
    position: 'absolute' as const,
    backgroundColor: '#666',
    left: 0,
    top: 0,
    width: staticDimensions.width,
    height: staticDimensions.height,
    transform: `translate(${animatedValues.printTranslate.x}px, ${animatedValues.printTranslate.y}px) scaleX(${animatedValues.printScale.x}) scaleY(${animatedValues.printScale.y})`,
    transition: 'transform 0.15s ease-in-out',
    transformOrigin: 'center center',
  };

  const bladeThickness = calculation.bladeThickness || 2;

  return (
    <div
      className={`relative bg-white overflow-hidden ${className}`}
      style={staticDimensions}
    >
      {/* Paper background */}
      <div
        className="absolute inset-0 bg-white"
        style={{
          borderColor: borderColor,
        }}
      />

      {/* Print area */}
      <div style={printStyle} />

      {/* Animated blades */}
      {showBlades && (
        <>
          <AnimatedBlade
            orientation="vertical"
            position="left"
            positionPercent={transformValues.leftBorderPercent}
            thickness={bladeThickness}
            borderColor={borderColor}
            opacity={animatedValues.bladeOpacity}
          />
          <AnimatedBlade
            orientation="vertical"
            position="right"
            positionPercent={transformValues.rightBorderPercent}
            thickness={bladeThickness}
            borderColor={borderColor}
            opacity={animatedValues.bladeOpacity}
          />
          <AnimatedBlade
            orientation="horizontal"
            position="top"
            positionPercent={transformValues.topBorderPercent}
            thickness={bladeThickness}
            borderColor={borderColor}
            opacity={animatedValues.bladeOpacity}
          />
          <AnimatedBlade
            orientation="horizontal"
            position="bottom"
            positionPercent={transformValues.bottomBorderPercent}
            thickness={bladeThickness}
            borderColor={borderColor}
            opacity={animatedValues.bladeOpacity}
          />
        </>
      )}
    </div>
  );
}
