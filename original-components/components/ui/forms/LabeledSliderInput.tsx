import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { StyleSheet, Platform } from 'react-native';
import { Box, Text, Input, InputField } from '@gluestack-ui/themed';

// Use platform-specific slider to avoid React 19 compatibility issues
import Slider from '@react-native-community/slider';
import WebSlider from './Slider.web';
import * as Haptics from 'expo-haptics';

import { getPlatformFont } from '@/styles/common';
import {
  COMMON_INPUT_HEIGHT,
  COMMON_BORDER_RADIUS,
} from '@/constants/borderCalc';
import { throttle } from '@/utils/throttle';

interface LabeledSliderInputProps {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  onSliderChange?: (v: number) => void; // New optimized handler for slider values
  min: number;
  max: number;
  step: number;
  labels?: string[];
  textColor: string;
  borderColor: string;
  tintColor: string;
  warning?: boolean;
  inputWidth?: number;
  /**
   * If true, call `onChange` continuously while the user is sliding.
   * Otherwise, the value is committed only on slide end (default).
   */
  continuousUpdate?: boolean;
  /**
   * If true, render the slider above the input field.
   * Default is false (input field above slider).
   */
  sliderOnTop?: boolean;
}

// Platform-adaptive throttling - native needs less aggressive throttling
const SLIDER_THROTTLE_MS = Platform.OS === 'web' ? 16 : 8; // Web: ~60 FPS, Native: ~120 FPS
const CALCULATION_THROTTLE_MS = Platform.OS === 'web' ? 16 : 32; // Separate throttling for heavy calculations

export const LabeledSliderInput: React.FC<LabeledSliderInputProps> = ({
  label,
  value,
  onChange,
  onSliderChange,
  min,
  max,
  step,
  labels = [],
  textColor,
  borderColor,
  tintColor,
  warning = false,
  inputWidth,
  continuousUpdate = false,
  sliderOnTop = false,
}) => {
  // Convert the incoming value to a number for Slider compatibility
  const numericValue = Number(value) || 0;

  // Separate throttling strategies for visual updates vs heavy calculations
  const onChangeThrottled = useMemo(
    () =>
      throttle(onChange, CALCULATION_THROTTLE_MS, {
        leading: true,
        trailing: true,
      }),
    [onChange]
  );

  const onSliderChangeThrottled = useMemo(
    () =>
      onSliderChange
        ? throttle(onSliderChange, SLIDER_THROTTLE_MS, {
            leading: true,
            trailing: true,
          })
        : null,
    [onSliderChange]
  );

  // Immediate visual feedback for slider value (no throttling on native)
  const onVisualUpdateThrottled = useMemo(
    () =>
      Platform.OS === 'web'
        ? throttle(onChange, SLIDER_THROTTLE_MS, {
            leading: true,
            trailing: true,
          })
        : onChange, // No throttling on native for immediate visual feedback
    [onChange]
  );

  // Velocity-based haptic feedback to prevent overwhelming the Taptic Engine
  const lastHapticValue = useRef<number>(0);
  const lastHapticTime = useRef<number>(0);
  const hapticThrottled = useMemo(
    () =>
      throttle(
        () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        150
      ), // Increased from 100ms
    []
  );

  // Cleanup throttled functions on unmount
  useEffect(() => {
    return () => {
      onChangeThrottled.cancel();
      onSliderChangeThrottled?.cancel();
      onVisualUpdateThrottled?.cancel?.();
      hapticThrottled.cancel();
    };
  }, [
    onChangeThrottled,
    onSliderChangeThrottled,
    onVisualUpdateThrottled,
    hapticThrottled,
  ]);

  // Handlers -------------------------------------------------
  const handleValueChange = useCallback(
    (v: number) => {
      const now = Date.now();

      // Velocity-based haptic feedback - consider both value change and time since last feedback
      const valueDelta = Math.abs(v - lastHapticValue.current);
      const timeDelta = now - lastHapticTime.current;
      const velocity = timeDelta > 0 ? valueDelta / timeDelta : 0;

      // Trigger haptics based on velocity - prevents excessive haptics during rapid sliding
      if (valueDelta >= step && (timeDelta > 150 || velocity < 0.1)) {
        lastHapticValue.current = v;
        lastHapticTime.current = now;
        hapticThrottled();
      }

      // Always provide immediate visual feedback
      onVisualUpdateThrottled(v.toString());

      if (continuousUpdate) {
        // Use throttled calculations for expensive operations
        if (onSliderChangeThrottled) {
          onSliderChangeThrottled(v);
        } else {
          onChangeThrottled(v.toString());
        }
      }
    },
    [
      continuousUpdate,
      onChangeThrottled,
      onSliderChangeThrottled,
      onVisualUpdateThrottled,
      step,
      hapticThrottled,
    ]
  );

  const handleSlidingComplete = useCallback(
    (v: number) => {
      // Always ensure final visual state is updated immediately
      onChange(v.toString());

      if (!continuousUpdate) {
        // For non-continuous mode, this is where we do the heavy calculation
        if (onSliderChange) {
          onSliderChange(v);
        }
      } else {
        // For continuous mode, ensure final value calculation is not throttled
        // Cancel any pending throttled calls and execute immediately
        onSliderChangeThrottled?.cancel?.();
        onChangeThrottled.cancel();
        if (onSliderChange) {
          onSliderChange(v);
        }
      }
    },
    [
      continuousUpdate,
      onChange,
      onSliderChange,
      onSliderChangeThrottled,
      onChangeThrottled,
    ]
  );

  // Memoized components for better performance
  const inputField = useMemo(
    () => (
      <Input
        variant="outline"
        size="md"
        isDisabled={false}
        isInvalid={warning}
        isReadOnly={false}
        style={[
          styles.inputContainer,
          { borderColor: warning ? '#FFA500' : borderColor, width: inputWidth },
          warning && styles.inputWarning,
          sliderOnTop && styles.inputWithTopMargin,
        ]}
      >
        <InputField
          style={[styles.inputText, { color: textColor }]}
          value={String(value)}
          onChangeText={onChange}
          keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
          placeholder="0"
          placeholderTextColor={borderColor}
        />
      </Input>
    ),
    [warning, borderColor, inputWidth, sliderOnTop, textColor, value, onChange]
  );

  const slider = useMemo(() => {
    const SliderComponent = Platform.OS === 'web' ? WebSlider : Slider;

    return (
      <Box style={styles.sliderWrapper}>
        <SliderComponent
          style={styles.slider}
          value={numericValue}
          minimumValue={min}
          maximumValue={max}
          step={step}
          minimumTrackTintColor={tintColor}
          maximumTrackTintColor={borderColor}
          thumbTintColor={tintColor}
          onValueChange={handleValueChange}
          onSlidingComplete={handleSlidingComplete}
        />
      </Box>
    );
  }, [
    numericValue,
    min,
    max,
    step,
    tintColor,
    borderColor,
    handleValueChange,
    handleSlidingComplete,
  ]);

  const sliderLabels = useMemo(
    () =>
      labels.length > 0 ? (
        <Box style={styles.sliderLabels}>
          {labels.map((lbl) => (
            <Text key={lbl} style={[styles.sliderLabel, { color: textColor }]}>
              {lbl}&quot;{/* inches symbol */}
            </Text>
          ))}
        </Box>
      ) : null,
    [labels, textColor]
  );

  //----------------------------------------------------------
  return (
    <Box style={styles.container}>
      {/* Label */}
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>

      {sliderOnTop ? (
        <>
          {/* Slider first, then input */}
          {slider}
          {sliderLabels}
          {inputField}
        </>
      ) : (
        <>
          {/* Input first, then slider (default) */}
          {inputField}
          {slider}
          {sliderLabels}
        </>
      )}
    </Box>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, gap: 4 },
  label: { fontSize: 16, fontFamily: getPlatformFont() },
  inputContainer: {
    // Style for the Gluestack Input container
    height: COMMON_INPUT_HEIGHT,
    borderRadius: COMMON_BORDER_RADIUS, // Gluestack Input typically handles its own border radius via variants
    borderWidth: 1, // Gluestack Input handles its own border width
  },
  inputText: {
    // Style for the Gluestack InputField (the text part)
    fontSize: 16,
    // paddingHorizontal: 12, // Gluestack InputField has its own padding
    // marginBottom: 4, // Spacing handled by container gap or Gluestack Slider mt
  },
  inputWarning: {
    borderColor: '#FFA500', // This will be overridden by Input's isInvalid prop or sx prop
    borderWidth: 2, // This might need specific handling if Gluestack Input variant doesn't allow direct borderWidth override easily
  },
  inputWithTopMargin: {
    marginTop: 16, // Add extra spacing when slider is positioned above input
  },
  sliderWrapper: {
    width: '100%',
    marginTop: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: 8, // Increased margin for better spacing
  },
  sliderLabel: {
    fontSize: 12,
    textAlign: 'center',
    fontFamily: getPlatformFont(),
  },
});
