import { Children, isValidElement, type ReactNode } from 'react';
import { Text, View } from 'react-native';

interface InsetGroupProps {
  children: ReactNode;
  className?: string;
}

/**
 * An inset grouped list: one rounded surface whose children are separated by
 * hairline dividers. The standard container for inputs on the answer-first
 * calculator screens.
 */
export function InsetGroup({ children, className }: InsetGroupProps) {
  const items = Children.toArray(children).filter(isValidElement);
  return (
    <View
      className={`overflow-hidden rounded-2xl border border-edge bg-surface-inset ${className ?? ''}`}
    >
      {items.map((child, index) => (
        <View
          key={child.key}
          className={index > 0 ? 'border-t border-edge' : ''}
        >
          {child}
        </View>
      ))}
    </View>
  );
}

interface InsetRowProps {
  label: string;
  /** Plain text for the right side, shown semibold. */
  value?: string;
  /** A control for the right side instead of `value`. */
  children?: ReactNode;
  className?: string;
}

/** A row in an `InsetGroup`: label left, value or content right, at least 44pt tall. */
export function InsetRow({ label, value, children, className }: InsetRowProps) {
  return (
    <View
      className={`min-h-11 flex-row items-center justify-between gap-3 px-4 py-3 ${className ?? ''}`}
    >
      <Text className="text-base text-white">{label}</Text>
      {value === undefined ? null : (
        <Text className="text-base font-semibold text-white">{value}</Text>
      )}
      {children}
    </View>
  );
}
