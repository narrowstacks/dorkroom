import React from 'react';
import {
  Select,
  SelectTrigger,
  SelectInput,
  SelectIcon,
  ChevronDownIcon,
  SelectPortal,
  SelectBackdrop,
  SelectContent,
  SelectDragIndicatorWrapper,
  SelectDragIndicator,
  SelectItem,
  Text, // Using Gluestack Text for label
  Box, // Using Gluestack Box for layout
  Divider,
} from '@gluestack-ui/themed';
import { useThemeColor } from '@/hooks/useThemeColor';

interface Item {
  label: string;
  value: string;
}

type ItemInput = string | Item;

interface ThemedSelectProps {
  label?: string;
  selectedValue: string;
  onValueChange: (value: string) => void;
  items: ItemInput[];
  placeholder?: string;
  testID?: string;
}

export function ThemedSelect({
  label,
  selectedValue,
  onValueChange,
  items,
  placeholder = 'Select an option',
  testID,
}: ThemedSelectProps) {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'icon'); // Using icon color for border as per original styles
  const selectedItemBackground = useThemeColor({}, 'selectedItemBackground'); // Get the new color

  // Specific colors for the dropdown content to ensure good contrast
  const dropdownBackgroundColor = useThemeColor(
    { light: '#f5f5f5', dark: '#2c2c2c' },
    'background'
  );
  const dropdownTextColor = useThemeColor(
    { light: '#000000', dark: '#ffffff' },
    'text'
  );

  // Normalize items to { label: string, value: string } format
  const normalizedItems: Item[] = items.map((item) =>
    typeof item === 'string' ? { label: item, value: item } : item
  );

  // Find the label for the currently selected value
  const selectedLabel =
    normalizedItems.find((item) => item.value === selectedValue)?.label ||
    placeholder;

  return (
    <Box mb="$2">
      {label && (
        <Text size="md" mb="$1" color={textColor}>
          {label}
        </Text>
      )}
      <Select selectedValue={selectedValue} onValueChange={onValueChange}>
        <SelectTrigger
          variant="outline"
          size="md"
          borderColor={borderColor}
          borderRadius="$md" // Using Gluestack tokens
          backgroundColor={backgroundColor}
          testID={testID}
        >
          <SelectInput
            placeholder={placeholder}
            color={textColor}
            // Display the selected *label* not the value
            // Gluestack SelectInput doesn't directly show the selected label by default
            // We display it manually, but it won't update visually without extra state if placeholder is used.
            // For simplicity, we let the Select manage its internal display.
            // If visual update is crucial *while using placeholder*, more complex state management might be needed.
            // Or, avoid using placeholder and rely on initial selectedValue.
            value={selectedLabel} // Attempt to show label; might just show placeholder if initial value matches none
            placeholderTextColor={borderColor}
          />
          <SelectIcon as={ChevronDownIcon} mr="$3" color={textColor} />
        </SelectTrigger>
        <SelectPortal>
          <SelectBackdrop />
          <SelectContent bg={dropdownBackgroundColor}>
            <SelectDragIndicatorWrapper>
              <SelectDragIndicator />
            </SelectDragIndicatorWrapper>
            {normalizedItems.map((item) => {
              if (item.value === '__divider__') {
                return <Divider my="$1" key="divider" />;
              }

              const isSelected = item.value === selectedValue;

              return (
                <SelectItem
                  key={item.value}
                  label={item.label}
                  value={item.value}
                  bg={isSelected ? selectedItemBackground : undefined}
                >
                  <Text color={dropdownTextColor}>{item.label}</Text>
                </SelectItem>
              );
            })}
          </SelectContent>
        </SelectPortal>
      </Select>
    </Box>
  );
}
