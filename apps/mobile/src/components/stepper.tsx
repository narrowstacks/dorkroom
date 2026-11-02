import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { createStepperRepeat } from '@/components/stepper-repeat';
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
  const [repeater] = useState(() =>
    createStepperRepeat(() => {
      Haptics.selectionAsync();
    })
  );

  // Every render hands over fresh handlers, so a held button keeps stepping
  // from the latest value instead of replaying the press-in closure (#317).
  useEffect(() => {
    repeater.update({ value, onDecrement, onIncrement });
  });

  // Clear any live timers if the component unmounts mid-hold
  useEffect(() => () => repeater.release(), [repeater]);

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
        onPressIn={() => repeater.press('decrement')}
        onPressOut={repeater.release}
        className="h-10 w-12 items-center justify-center rounded-lg bg-white/10"
      >
        <Text className="text-xl text-white">−</Text>
      </Pressable>
      <Text className="text-base font-semibold text-white">{value}</Text>
      <Pressable
        onPressIn={() => repeater.press('increment')}
        onPressOut={repeater.release}
        className="h-10 w-12 items-center justify-center rounded-lg bg-white/10"
      >
        <Text className="text-xl text-white">+</Text>
      </Pressable>
    </View>
  );
}
