import { Text } from 'react-native';

export function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="text-xs font-semibold uppercase tracking-wide text-white/40">
      {children}
    </Text>
  );
}
