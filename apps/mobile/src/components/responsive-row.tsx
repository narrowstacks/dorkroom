import { Children, type ReactNode } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { isLargeTextScale } from '@/lib/dynamic-type';

interface ResponsiveRowProps {
  children: ReactNode;
  className?: string;
}

/**
 * Lays children out side by side with equal widths, and stacks them in a
 * column at large Dynamic Type sizes where two columns would clip or wrap
 * every word.
 */
export function ResponsiveRow({ children, className }: ResponsiveRowProps) {
  const { fontScale } = useWindowDimensions();
  const stacked = isLargeTextScale(fontScale);
  return (
    <View
      className={`${stacked ? 'gap-3' : 'flex-row gap-3'} ${className ?? ''}`}
    >
      {Children.map(children, (child) =>
        stacked ? child : <View className="flex-1">{child}</View>
      )}
    </View>
  );
}
