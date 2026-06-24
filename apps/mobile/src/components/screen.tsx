import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { GradientBackground } from '@/components/gradient-background';

export function Screen({ children }: { children: ReactNode }) {
  return (
    <View className="flex-1">
      <GradientBackground />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        // Inset for the keyboard so a focused text field scrolls into view
        // instead of being covered (e.g. Notes on the shot/roll forms).
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 16 }}
      >
        {children}
      </ScrollView>
    </View>
  );
}
