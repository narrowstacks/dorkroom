import React from 'react';
import { Pressable, View } from 'react-native';
import { Circle } from 'lucide-react-native';
import { cn } from '@/lib/utils';
import { Text } from '@gluestack-ui/themed';

const RadioContext = React.createContext<{
  value?: string;
  onChange?: (value: string) => void;
  isReadOnly?: boolean;
} | null>(null);

const RadioValueContext = React.createContext<{
  isSelected: boolean;
} | null>(null);

interface RadioGroupProps {
  value?: string;
  onChange?: (value: string) => void;
  isReadOnly?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function RadioGroup({
  value,
  onChange,
  isReadOnly = false,
  children,
  className,
}: RadioGroupProps) {
  return (
    <RadioContext.Provider value={{ value, onChange, isReadOnly }}>
      <View className={cn('flex-col', className)}>{children}</View>
    </RadioContext.Provider>
  );
}

interface RadioProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  isDisabled?: boolean;
}

export function Radio({
  value,
  children,
  className,
  isDisabled = false,
}: RadioProps) {
  const context = React.useContext(RadioContext);

  if (!context) {
    throw new Error('Radio must be used within a RadioGroup');
  }

  const { value: groupValue, onChange, isReadOnly } = context;
  const isSelected = groupValue === value;
  const isInteractive = !isDisabled && !isReadOnly && onChange;

  const handlePress = () => {
    if (isInteractive) {
      onChange(value);
    }
  };

  return (
    <RadioValueContext.Provider value={{ isSelected }}>
      <Pressable
        onPress={handlePress}
        disabled={!isInteractive}
        className={cn(
          'flex-row items-center gap-2 py-1',
          isInteractive && 'cursor-pointer',
          isDisabled && 'opacity-50',
          className
        )}
      >
        {children}
      </Pressable>
    </RadioValueContext.Provider>
  );
}

interface RadioIndicatorProps {
  children: React.ReactNode;
  className?: string;
}

export function RadioIndicator({ children, className }: RadioIndicatorProps) {
  const context = React.useContext(RadioContext);
  const radioContext = React.useContext(RadioValueContext);

  if (!context) return null;

  const isSelected = radioContext?.isSelected || false;

  return (
    <View
      className={cn(
        'h-5 w-5 items-center justify-center rounded-full border-2',
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-300',
        className
      )}
    >
      {isSelected && children}
    </View>
  );
}

interface RadioIconProps {
  className?: string;
  as?: React.ComponentType<any>;
}

export function RadioIcon({
  className,
  as: IconComponent = Circle,
}: RadioIconProps) {
  const context = React.useContext(RadioContext);
  if (!context) return null;

  return <IconComponent size={12} className={cn('text-blue-500', className)} />;
}

interface RadioLabelProps {
  children: React.ReactNode;
  className?: string;
}

export function RadioLabel({ children, className }: RadioLabelProps) {
  return (
    <Text className={cn('text-base text-gray-700', className)}>{children}</Text>
  );
}
