import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';

export function Screen({ children }: { children: ReactNode }) {
  return (
    <View className="flex-1 bg-[#0b0b0c]">
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          padding: 16,
          gap: 16,
        }}
      >
        {children}
      </ScrollView>
    </View>
  );
}
