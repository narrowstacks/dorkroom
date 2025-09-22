import React, { useEffect, useMemo } from "react";
import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  useAnimatedReaction,
} from "react-native-reanimated";
import { AnimatedBlade } from "./AnimatedBlade.reanimated";
import { debugLog, debugLogTiming } from "@/utils/debugLogger";

interface AnimatedPreviewProps {
  calculation: any;
  showBlades: boolean;
  borderColor: string;
}

export const AnimatedPreview = React.memo(
  ({ calculation, showBlades, borderColor }: AnimatedPreviewProps) => {
    // Shared values for Reanimated - ALL animations use native thread
    const printTranslateX = useSharedValue(0);
    const printTranslateY = useSharedValue(0);
    const printScaleX = useSharedValue(0);
    const printScaleY = useSharedValue(0);
    const bladeOpacity = useSharedValue(showBlades ? 1 : 0);
    const leftBladePosition = useSharedValue(0);
    const rightBladePosition = useSharedValue(0);
    const topBladePosition = useSharedValue(0);
    const bottomBladePosition = useSharedValue(0);

    // Get static dimensions for calculations
    const staticDimensions = useMemo(
      () => ({
        width: calculation?.previewWidth || 0,
        height: calculation?.previewHeight || 0,
      }),
      [calculation?.previewWidth, calculation?.previewHeight],
    );

    // Transform values calculation with performance monitoring
    const transformValues = useMemo(() => {
      if (!calculation) return null;

      const startTime = debugLogTiming("Reanimated Transform Calculation");

      const containerWidth = calculation.previewWidth || 0;
      const containerHeight = calculation.previewHeight || 0;

      const printScaleXValue = (calculation.printWidthPercent || 0) / 100;
      const printScaleYValue = (calculation.printHeightPercent || 0) / 100;

      const printWidth = printScaleXValue * containerWidth;
      const printHeight = printScaleYValue * containerHeight;

      const printCenterX =
        ((calculation.leftBorderPercent || 0) / 100) * containerWidth +
        printWidth / 2;
      const printCenterY =
        ((calculation.topBorderPercent || 0) / 100) * containerHeight +
        printHeight / 2;

      const printTranslateXValue = printCenterX - containerWidth / 2;
      const printTranslateYValue = printCenterY - containerHeight / 2;

      const result = {
        printTranslateX: printTranslateXValue,
        printTranslateY: printTranslateYValue,
        printScaleX: printScaleXValue,
        printScaleY: printScaleYValue,
        leftBorderPercent: calculation.leftBorderPercent || 0,
        rightBorderPercent: 100 - (calculation.rightBorderPercent || 0),
        topBorderPercent: calculation.topBorderPercent || 0,
        bottomBorderPercent: 100 - (calculation.bottomBorderPercent || 0),
      };

      if (startTime) {
        debugLogTiming("Reanimated Transform Calculation", startTime);
      }

      return result;
    }, [calculation]);

    // Update shared values when transform values change
    useEffect(() => {
      if (!transformValues) return;

      // Use withTiming for smooth 60fps animations on native thread
      const animationConfig = {
        duration: 150,
      };

      printTranslateX.value = withTiming(
        transformValues.printTranslateX,
        animationConfig,
      );
      printTranslateY.value = withTiming(
        transformValues.printTranslateY,
        animationConfig,
      );
      printScaleX.value = withTiming(
        transformValues.printScaleX,
        animationConfig,
      );
      printScaleY.value = withTiming(
        transformValues.printScaleY,
        animationConfig,
      );

      leftBladePosition.value = withTiming(
        transformValues.leftBorderPercent,
        animationConfig,
      );
      rightBladePosition.value = withTiming(
        transformValues.rightBorderPercent,
        animationConfig,
      );
      topBladePosition.value = withTiming(
        transformValues.topBorderPercent,
        animationConfig,
      );
      bottomBladePosition.value = withTiming(
        transformValues.bottomBorderPercent,
        animationConfig,
        (finished) => {
          if (finished) {
            // Simple completion log without object sharing issues
          }
        },
      );
    }, [
      transformValues,
      printTranslateX,
      printTranslateY,
      printScaleX,
      printScaleY,
      leftBladePosition,
      rightBladePosition,
      topBladePosition,
      bottomBladePosition,
    ]);

    // Update blade opacity
    useEffect(() => {
      bladeOpacity.value = withTiming(showBlades ? 1 : 0, { duration: 100 });
    }, [showBlades, bladeOpacity]);

    // Animated styles using worklets (runs on native thread)
    const printAnimatedStyle = useAnimatedStyle(() => {
      return {
        transform: [
          { translateX: printTranslateX.value },
          { translateY: printTranslateY.value },
          { scaleX: printScaleX.value },
          { scaleY: printScaleY.value },
        ],
      };
    });

    // Monitor performance using useAnimatedReaction with threshold to avoid floating point noise
    useAnimatedReaction(
      () => printTranslateX.value,
      (currentValue, previousValue) => {
        // Only log significant changes to avoid floating point noise
        if (
          previousValue !== null &&
          Math.abs(currentValue - previousValue) > 0.1
        ) {
          runOnJS(debugLog)();
        }
      },
    );

    return (
      <View
        style={{
          position: "relative",
          backgroundColor: "transparent",
          overflow: "hidden",
          width: staticDimensions.width,
          height: staticDimensions.height,
          borderColor,
          borderWidth: 1,
        }}
      >
        <View
          style={{
            position: "relative",
            backgroundColor: "white",
            overflow: "hidden",
            width: "100%",
            height: "100%",
            borderColor,
          }}
        >
          {/* Print area using Reanimated transforms */}
          <Animated.View
            style={[
              {
                position: "absolute",
                backgroundColor: "grey",
                left: 0,
                top: 0,
                width: staticDimensions.width,
                height: staticDimensions.height,
              },
              printAnimatedStyle,
            ]}
          />

          <AnimatedBlade
            orientation="vertical"
            position="left"
            bladePositionValue={leftBladePosition}
            opacity={bladeOpacity}
            thickness={calculation?.bladeThickness || 2}
            borderColor={borderColor}
            containerWidth={staticDimensions.width}
            containerHeight={staticDimensions.height}
          />
          <AnimatedBlade
            orientation="vertical"
            position="right"
            bladePositionValue={rightBladePosition}
            opacity={bladeOpacity}
            thickness={calculation?.bladeThickness || 2}
            borderColor={borderColor}
            containerWidth={staticDimensions.width}
            containerHeight={staticDimensions.height}
          />
          <AnimatedBlade
            orientation="horizontal"
            position="top"
            bladePositionValue={topBladePosition}
            opacity={bladeOpacity}
            thickness={calculation?.bladeThickness || 2}
            borderColor={borderColor}
            containerWidth={staticDimensions.width}
            containerHeight={staticDimensions.height}
          />
          <AnimatedBlade
            orientation="horizontal"
            position="bottom"
            bladePositionValue={bottomBladePosition}
            opacity={bladeOpacity}
            thickness={calculation?.bladeThickness || 2}
            borderColor={borderColor}
            containerWidth={staticDimensions.width}
            containerHeight={staticDimensions.height}
          />
        </View>
      </View>
    );
  },
);

AnimatedPreview.displayName = "AnimatedPreviewReanimated";
