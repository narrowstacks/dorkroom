import * as Haptics from 'expo-haptics';
import { useRef } from 'react';
import { Pressable, Text, View } from 'react-native';

interface StepperProps {
  value: string;
  onDecrement: () => void;
  onIncrement: () => void;
}

export function Stepper({ value, onDecrement, onIncrement }: StepperProps) {
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
    <View className="flex-row items-center justify-between rounded-xl bg-white/10 px-2 py-2">
      <Pressable
        onPressIn={start(onDecrement)}
        onPressOut={stop}
        accessibilityRole="button"
        accessibilityLabel="Decrease"
        className="h-10 w-12 items-center justify-center rounded-lg bg-white/10"
      >
        <Text className="text-xl text-white">−</Text>
      </Pressable>
      <Text className="text-base font-semibold text-white">{value}</Text>
      <Pressable
        onPressIn={start(onIncrement)}
        onPressOut={stop}
        accessibilityRole="button"
        accessibilityLabel="Increase"
        className="h-10 w-12 items-center justify-center rounded-lg bg-white/10"
      >
        <Text className="text-xl text-white">+</Text>
      </Pressable>
    </View>
  );
}
