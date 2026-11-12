import { Children, type ReactNode } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { isLargeTextScale } from '@/lib/dynamic-type';

interface ResponsiveRowProps {
  children: ReactNode;
  /** A fixed-size control (e.g. a flip button) kept at the end of the row. */
  trailing?: ReactNode;
  className?: string;
}

/**
 * Lays children out side by side with equal widths, and stacks them in a
 * column at large Dynamic Type sizes where two columns would clip or wrap
 * every word. `trailing` keeps its natural size and bottom-aligns in a row,
 * and sits at the end of the column when stacked.
 */
export function ResponsiveRow({
  children,
  trailing,
  className,
}: ResponsiveRowProps) {
  const { fontScale } = useWindowDimensions();
  const stacked = isLargeTextScale(fontScale);
  return (
    <View
      className={`${stacked ? 'gap-3' : `flex-row gap-3 ${trailing ? 'items-end' : ''}`} ${className ?? ''}`}
    >
      {Children.map(children, (child) =>
        stacked ? child : <View className="flex-1">{child}</View>
      )}
      {trailing ? (
        <View className={stacked ? 'items-end' : undefined}>{trailing}</View>
      ) : null}
    </View>
  );
}
