import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  handleStepperAction,
  STEPPER_ACCESSIBILITY_ACTIONS,
  stepperAccessibilityValue,
} from '@/lib/stepper-a11y';

interface StepperProps {
  /** Spoken field name, e.g. "Minutes". Required so VoiceOver can tell steppers apart. */
  label: string;
  value: string;
  onDecrement: () => void;
  onIncrement: () => void;
}

export function Stepper({
  label,
  value,
  onDecrement,
  onIncrement,
}: StepperProps) {
  const delay = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeat = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = () => {
    if (delay.current) {
      clearTimeout(delay.current);
      delay.current = null;
    }
    if (repeat.current) {
      clearInterval(repeat.current);
      repeat.current = null;
    }
  };

  // Clear any live timers if the component unmounts mid-hold
  useEffect(
    () => () => {
      if (delay.current) clearTimeout(delay.current);
      if (repeat.current) clearInterval(repeat.current);
    },
    []
  );

  const start = (fn: () => void) => () => {
    Haptics.selectionAsync();
    fn();
    delay.current = setTimeout(() => {
      repeat.current = setInterval(() => {
        Haptics.selectionAsync();
        fn();
      }, 120);
    }, 350);
  };

  return (
    // One adjustable element for VoiceOver: `accessible` groups the children so
    // the inner buttons and value are not separate focus stops. Touch handling
    // on the Pressables is unaffected.
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={stepperAccessibilityValue(value)}
      accessibilityActions={[...STEPPER_ACCESSIBILITY_ACTIONS]}
      onAccessibilityAction={(event) => {
        handleStepperAction(
          event.nativeEvent.actionName,
          onDecrement,
          onIncrement
        );
      }}
      className="flex-row items-center justify-between rounded-xl bg-white/10 p-2"
    >
      <Pressable
        onPressIn={start(onDecrement)}
        onPressOut={stop}
        className="h-10 w-12 items-center justify-center rounded-lg bg-white/10"
      >
        <Text className="text-xl text-white">−</Text>
      </Pressable>
      <Text className="text-base font-semibold text-white">{value}</Text>
      <Pressable
        onPressIn={start(onIncrement)}
        onPressOut={stop}
        className="h-10 w-12 items-center justify-center rounded-lg bg-white/10"
      >
        <Text className="text-xl text-white">+</Text>
      </Pressable>
    </View>
  );
}
