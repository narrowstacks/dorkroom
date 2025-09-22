import React, { useCallback, useEffect } from "react";
import { View, Platform } from "react-native";

interface SliderProps {
  value: number;
  minimumValue: number;
  maximumValue: number;
  step?: number;
  onValueChange?: (value: number) => void;
  onSlidingStart?: (value: number) => void;
  onSlidingComplete?: (value: number) => void;
  minimumTrackTintColor?: string;
  maximumTrackTintColor?: string;
  thumbTintColor?: string;
  style?: any;
  disabled?: boolean;
}

const Slider: React.FC<SliderProps> = ({
  value,
  minimumValue,
  maximumValue,
  step = 1,
  onValueChange,
  onSlidingStart,
  onSlidingComplete,
  minimumTrackTintColor = "#007AFF",
  maximumTrackTintColor = "#D3D3D3",
  thumbTintColor = "#007AFF",
  style,
  disabled = false,
}) => {
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat(event.target.value);
      onValueChange?.(newValue);
    },
    [onValueChange],
  );

  const handleMouseDown = useCallback(() => {
    onSlidingStart?.(value);
  }, [onSlidingStart, value]);

  const handleMouseUp = useCallback(() => {
    onSlidingComplete?.(value);
  }, [onSlidingComplete, value]);

  // Add CSS styles for slider thumb
  useEffect(() => {
    if (Platform.OS === "web") {
      const style = document.createElement("style");
      style.textContent = `
        .custom-slider::-webkit-slider-thumb {
          appearance: none;
          -webkit-appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: ${thumbTintColor};
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        .custom-slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: ${thumbTintColor};
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `;
      document.head.appendChild(style);
      return () => {
        document.head.removeChild(style);
      };
    }
  }, [thumbTintColor]);

  // Web-specific slider using HTML input range
  if (Platform.OS === "web") {
    const percentage =
      ((value - minimumValue) / (maximumValue - minimumValue)) * 100;

    return (
      <View
        style={[{ width: "100%", height: 40, justifyContent: "center" }, style]}
      >
        <input
          type="range"
          min={minimumValue}
          max={maximumValue}
          step={step}
          value={value}
          onChange={handleChange}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseUp}
          disabled={disabled}
          style={{
            width: "100%",
            height: "6px",
            borderRadius: "3px",
            background: `linear-gradient(to right, ${minimumTrackTintColor} 0%, ${minimumTrackTintColor} ${percentage}%, ${maximumTrackTintColor} ${percentage}%, ${maximumTrackTintColor} 100%)`,
            outline: "none",
            appearance: "none",
            WebkitAppearance: "none",
            cursor: disabled ? "not-allowed" : "pointer",
          }}
          className="custom-slider"
        />
      </View>
    );
  }

  // For native platforms, this shouldn't be used
  return null;
};

export default Slider;
