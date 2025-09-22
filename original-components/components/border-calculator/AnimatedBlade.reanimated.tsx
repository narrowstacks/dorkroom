import React, { useMemo } from "react";
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  SharedValue,
} from "react-native-reanimated";
import { debugLog, debugLogPerformance } from "@/utils/debugLogger";

interface AnimatedBladeProps {
  orientation: "vertical" | "horizontal";
  position: "left" | "right" | "top" | "bottom";
  bladePositionValue: SharedValue<number>;
  opacity: SharedValue<number>;
  thickness: number;
  borderColor: string;
  containerWidth?: number;
  containerHeight?: number;
}

export const AnimatedBlade = React.memo(
  ({
    orientation,
    position,
    bladePositionValue,
    opacity,
    thickness,
    borderColor,
    containerWidth = 100,
    containerHeight = 100,
  }: AnimatedBladeProps) => {
    // Memoize common styles to prevent object recreation
    const commonStyle = useMemo(
      () => ({
        position: "absolute" as const,
        backgroundColor: borderColor,
        // Native shadow properties for iOS
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        // Android elevation
        elevation: 5,
      }),
      [borderColor],
    );

    // Memoize orientation-specific styles
    const orientationStyle = useMemo(() => {
      const style =
        orientation === "vertical"
          ? {
              top: -1000,
              bottom: -1000,
              width: thickness,
              left: 0, // Base position, will be overridden by transform
            }
          : {
              left: -1000,
              right: -1000,
              height: thickness,
              top: 0, // Base position, will be overridden by transform
            };

      debugLogPerformance(`Blade Style ${orientation} ${position}`, {
        thickness,
        containerWidth,
        containerHeight,
      });

      return style;
    }, [orientation, thickness, position, containerWidth, containerHeight]);

    // Animated style using worklets (runs on native thread)
    const animatedStyle = useAnimatedStyle(() => {
      // Interpolate position value to pixel coordinates
      const transformValue = interpolate(
        bladePositionValue.value,
        [0, 100],
        [0, orientation === "vertical" ? containerWidth : containerHeight],
        Extrapolation.CLAMP,
      );

      // Position-specific offset adjustments so blades are adjacent to print area
      const transforms = [];
      switch (position) {
        case "left":
          transforms.push({ translateX: transformValue - thickness });
          break;
        case "right":
          transforms.push({ translateX: transformValue });
          break;
        case "top":
          transforms.push({ translateY: transformValue - thickness });
          break;
        case "bottom":
          transforms.push({ translateY: transformValue });
          break;
      }

      return {
        opacity: opacity.value,
        transform: transforms,
      };
    }, [containerWidth, containerHeight, thickness, position]);

    return (
      <Animated.View style={[commonStyle, orientationStyle, animatedStyle]} />
    );
  },
);

AnimatedBlade.displayName = "AnimatedBladeReanimated";
