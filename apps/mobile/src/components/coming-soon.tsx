import { Text, View } from 'react-native';
import { GradientBackground } from '@/components/gradient-background';

export function ComingSoon({ title }: { title: string }) {
  return (
    <View className="flex-1 items-center justify-center">
      <GradientBackground />
      <Text className="text-lg font-semibold text-white">{title}</Text>
      <Text className="mt-2 px-8 text-center text-white/50">
        Coming soon to mobile.
      </Text>
    </View>
  );
}
