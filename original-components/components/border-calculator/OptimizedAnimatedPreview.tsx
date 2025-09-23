/* ------------------------------------------------------------------ *
  OptimizedAnimatedPreview.tsx
  -------------------------------------------------------------
  Ultra-optimized animated preview with maximum performance
  -------------------------------------------------------------
  Key optimizations:
  - Platform-specific animation engines (Reanimated on native, CSS on web)
  - Minimal re-renders through React.memo with custom comparison
  - Transform-only animations for native driver compatibility
  - Aggressive memoization of animation values
  - Smart change detection to avoid unnecessary animations
  - Reduced object allocations in render cycle
\* ------------------------------------------------------------------ */

import React, { useRef, useEffect, useMemo } from 'react';
import { View, Platform } from 'react-native';
import { BorderCalculation } from '@/types/borderTypes';

// Platform-specific imports
let Animated: any;
let useSharedValue: any;
let useAnimatedStyle: any;
let withTiming: any;

if (Platform.OS !== 'web') {
  try {
    // Try Reanimated first for best performance
    const reanimated = require('react-native-reanimated');
    useSharedValue = reanimated.useSharedValue;
    useAnimatedStyle = reanimated.useAnimatedStyle;
    withTiming = reanimated.withTiming;
  } catch {
    // Fallback to React Native Animated
    Animated = require('react-native').Animated;
  }
}

interface OptimizedAnimatedPreviewProps {
  calculation: BorderCalculation | null;
  showBlades: boolean;
  borderColor: string;
}

// Custom comparison function for React.memo
const arePropsEqual = (
  prevProps: OptimizedAnimatedPreviewProps,
  nextProps: OptimizedAnimatedPreviewProps
): boolean => {
  // Quick reference equality check first
  if (
    prevProps.calculation === nextProps.calculation &&
    prevProps.showBlades === nextProps.showBlades &&
    prevProps.borderColor === nextProps.borderColor
  ) {
    return true;
  }

  // If calculation is null in both, they're equal
  if (!prevProps.calculation && !nextProps.calculation) {
    return (
      prevProps.showBlades === nextProps.showBlades &&
      prevProps.borderColor === nextProps.borderColor
    );
  }

  // If one is null and the other isn't, they're different
  if (!prevProps.calculation || !nextProps.calculation) {
    return false;
  }

  // Deep comparison of calculation values that affect animation
  const prev = prevProps.calculation;
  const next = nextProps.calculation;

  return (
    prev.previewWidth === next.previewWidth &&
    prev.previewHeight === next.previewHeight &&
    prev.previewScale === next.previewScale &&
    prev.leftBorderPercent === next.leftBorderPercent &&
    prev.rightBorderPercent === next.rightBorderPercent &&
    prev.topBorderPercent === next.topBorderPercent &&
    prev.bottomBorderPercent === next.bottomBorderPercent &&
    prevProps.showBlades === nextProps.showBlades &&
    prevProps.borderColor === nextProps.borderColor
  );
};

// Reanimated version for maximum performance on native
const ReanimatedPreview: React.FC<OptimizedAnimatedPreviewProps> = ({
  calculation,
  showBlades,
  borderColor,
}) => {
  // Shared values for native thread animations
  const printScaleX = useSharedValue(0);
  const printScaleY = useSharedValue(0);
  const printTranslateX = useSharedValue(0);
  const printTranslateY = useSharedValue(0);
  const bladeOpacity = useSharedValue(showBlades ? 1 : 0);

  // Memoized static dimensions to prevent recalculation
  const staticDimensions = useMemo(
    () => ({
      width: calculation?.previewWidth || 0,
      height: calculation?.previewHeight || 0,
    }),
    [calculation?.previewWidth, calculation?.previewHeight]
  );

  // Update animations only when necessary
  useEffect(() => {
    if (!calculation) return;

    const { previewWidth, previewHeight } = calculation;

    // Animate to new dimensions with native driver
    printScaleX.value = withTiming(previewWidth / 100, { duration: 200 });
    printScaleY.value = withTiming(previewHeight / 100, { duration: 200 });

    // Center the print area
    printTranslateX.value = withTiming(
      (staticDimensions.width - previewWidth) / 2,
      { duration: 200 }
    );
    printTranslateY.value = withTiming(
      (staticDimensions.height - previewHeight) / 2,
      { duration: 200 }
    );
  }, [
    calculation,
    staticDimensions,
    printScaleX,
    printScaleY,
    printTranslateX,
    printTranslateY,
  ]);

  // Update blade visibility
  useEffect(() => {
    bladeOpacity.value = withTiming(showBlades ? 1 : 0, { duration: 100 });
  }, [showBlades, bladeOpacity]);

  // Animated styles using worklets (runs on native thread)
  const printAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: printTranslateX.value },
      { translateY: printTranslateY.value },
      { scaleX: printScaleX.value },
      { scaleY: printScaleY.value },
    ],
  }));

  const bladeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: bladeOpacity.value,
  }));

  if (!calculation) return null;

  const ReanimatedView = require('react-native-reanimated').default.View;

  return (
    <View
      style={{ width: staticDimensions.width, height: staticDimensions.height }}
    >
      {/* Print area */}
      <ReanimatedView
        style={[
          {
            position: 'absolute',
            width: 100,
            height: 100,
            backgroundColor: 'white',
            borderWidth: 1,
            borderColor: borderColor,
          },
          printAnimatedStyle,
        ]}
      />

      {/* Blade indicators */}
      {showBlades && (
        <ReanimatedView style={[{ position: 'absolute' }, bladeAnimatedStyle]}>
          {/* Blade rendering logic here */}
        </ReanimatedView>
      )}
    </View>
  );
};

// React Native Animated fallback
const AnimatedPreview: React.FC<OptimizedAnimatedPreviewProps> = ({
  calculation,
  showBlades,
  borderColor,
}) => {
  const animatedValues = useRef({
    printScale: new Animated.Value(0),
    bladeOpacity: new Animated.Value(showBlades ? 1 : 0),
  }).current;

  const staticDimensions = useMemo(
    () => ({
      width: calculation?.previewWidth || 0,
      height: calculation?.previewHeight || 0,
    }),
    [calculation?.previewWidth, calculation?.previewHeight]
  );

  useEffect(() => {
    if (!calculation) return;

    Animated.timing(animatedValues.printScale, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [calculation, animatedValues.printScale]);

  useEffect(() => {
    Animated.timing(animatedValues.bladeOpacity, {
      toValue: showBlades ? 1 : 0,
      duration: 100,
      useNativeDriver: true,
    }).start();
  }, [showBlades, animatedValues.bladeOpacity]);

  if (!calculation) return null;

  return (
    <View
      style={{ width: staticDimensions.width, height: staticDimensions.height }}
    >
      <Animated.View
        style={{
          position: 'absolute',
          width: calculation.previewWidth,
          height: calculation.previewHeight,
          backgroundColor: 'white',
          borderWidth: 1,
          borderColor: borderColor,
          transform: [{ scale: animatedValues.printScale }],
        }}
      />

      {showBlades && (
        <Animated.View
          style={{
            position: 'absolute',
            opacity: animatedValues.bladeOpacity,
          }}
        >
          {/* Blade rendering logic here */}
        </Animated.View>
      )}
    </View>
  );
};

// Web version with CSS animations
const WebPreview: React.FC<OptimizedAnimatedPreviewProps> = ({
  calculation,
  showBlades,
  borderColor,
}) => {
  const staticDimensions = useMemo(
    () => ({
      width: calculation?.previewWidth || 0,
      height: calculation?.previewHeight || 0,
    }),
    [calculation?.previewWidth, calculation?.previewHeight]
  );

  if (!calculation) return null;

  return (
    <div
      style={{
        width: staticDimensions.width,
        height: staticDimensions.height,
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: calculation.previewWidth,
          height: calculation.previewHeight,
          backgroundColor: 'white',
          border: `1px solid ${borderColor}`,
          transition: 'all 0.2s ease-in-out',
          transform: 'translate(-50%, -50%)',
          left: '50%',
          top: '50%',
        }}
      />

      {showBlades && (
        <div
          style={{
            position: 'absolute',
            opacity: showBlades ? 1 : 0,
            transition: 'opacity 0.1s ease-in-out',
          }}
        >
          {/* Blade rendering logic here */}
        </div>
      )}
    </div>
  );
};

// Main component that selects the best animation approach
export const OptimizedAnimatedPreview =
  React.memo<OptimizedAnimatedPreviewProps>((props) => {
    if (Platform.OS === 'web') {
      return <WebPreview {...props} />;
    }

    // Use Reanimated if available, otherwise fall back to Animated
    if (useSharedValue && useAnimatedStyle) {
      return <ReanimatedPreview {...props} />;
    }

    return <AnimatedPreview {...props} />;
  }, arePropsEqual);
