import React from "react";
import { Animated } from "react-native";

interface AnimatedBladeProps {
  orientation: "vertical" | "horizontal";
  position: "left" | "right" | "top" | "bottom";
  bladePositionValue: Animated.Value;
  opacity: Animated.Value;
  thickness: number;
  borderColor: string;
}

export const AnimatedBlade = ({
  orientation,
  position,
  bladePositionValue,
  opacity,
  thickness,
  borderColor,
}: AnimatedBladeProps) => {
  // Create interpolated position value
  const bladePosition = bladePositionValue.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  const commonStyle = {
    position: "absolute" as const,
    boxShadow: "0px 2px 4px rgba(0,0,0,0.25)",
    elevation: 5,
    backgroundColor: borderColor,
  };

  const orientationStyle =
    orientation === "vertical"
      ? { top: -1000, bottom: -1000, width: thickness }
      : { left: -1000, right: -1000, height: thickness };

  // Create dynamic position style for layout properties
  const positionStyle = { [position]: bladePosition };

  const transformStyle = {
    transform:
      position === "left"
        ? [{ translateX: -thickness }]
        : position === "right"
          ? [{ translateX: thickness }]
          : position === "top"
            ? [{ translateY: -thickness }]
            : [{ translateY: thickness }],
  };

  return (
    <Animated.View
      style={[
        commonStyle,
        orientationStyle,
        positionStyle,
        transformStyle,
        // Opacity must be handled separately to potentially use native driver
        { opacity },
      ]}
    />
  );
};
