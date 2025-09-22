import React, { useMemo } from "react";
import { Animated } from "react-native";

interface AnimatedBladeProps {
  orientation: "vertical" | "horizontal";
  position: "left" | "right" | "top" | "bottom";
  bladePositionValue: Animated.Value;
  opacity: Animated.Value;
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
    // Optimized transform that minimizes interpolation overhead
    const transformValue = useMemo(() => {
      return bladePositionValue.interpolate({
        inputRange: [0, 100],
        outputRange: [
          0,
          orientation === "vertical" ? containerWidth : containerHeight,
        ],
        extrapolate: "clamp", // Prevent values outside bounds
      });
    }, [bladePositionValue, orientation, containerWidth, containerHeight]);

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
    const orientationStyle = useMemo(
      () =>
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
            },
      [orientation, thickness],
    );

    // Memoize transform calculation to prevent recalculation on every render
    const transform = useMemo(() => {
      // Position-specific offset adjustments so blades are adjacent to print area
      const offsetTranslation =
        position === "left"
          ? [{ translateX: -thickness }] // Left blade: move left so right edge touches print area left edge
          : position === "right"
            ? [{ translateX: 0 }] // Right blade: no offset so left edge touches print area right edge
            : position === "top"
              ? [{ translateY: -thickness }] // Top blade: move up so bottom edge touches print area top edge
              : [{ translateY: 0 }]; // Bottom blade: no offset so top edge touches print area bottom edge

      // Combine position transform with offset transform
      if (orientation === "vertical") {
        return [{ translateX: transformValue }, ...offsetTranslation];
      } else {
        return [{ translateY: transformValue }, ...offsetTranslation];
      }
    }, [orientation, position, thickness, transformValue]);

    return (
      <Animated.View
        style={[
          commonStyle,
          orientationStyle,
          {
            opacity, // Animated opacity value
            transform,
          },
        ]}
      />
    );
  },
);

AnimatedBlade.displayName = "AnimatedBlade";
