import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { GradientBackground } from '@/components/gradient-background';

export function Screen({ children }: { children: ReactNode }) {
  return (
    <View className="flex-1">
      <GradientBackground />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 16, gap: 16 }}
      >
        {children}
      </ScrollView>
    </View>
  );
}
