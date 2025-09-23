import React, { useEffect } from 'react';
import {
  Select,
  SelectTrigger,
  SelectInput,
  SelectIcon,
  SelectPortal,
  SelectBackdrop,
  SelectContent,
  SelectItem,
  SelectScrollView,
} from '@/components/ui/select';
import { useThemeColor } from '@/hooks/useThemeColor';
import { ChevronDownIcon } from '@/components/ui/icon';
import { debugLog } from '@/utils/debugLogger';

interface StyledSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  items: { label: string; value: string }[];
  placeholder?: string;
}

export function StyledSelect({
  value,
  onValueChange,
  items,
  placeholder = 'Select an option',
}: StyledSelectProps) {
  // Get theme colors
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'borderColor');
  const placeholderTextColor = useThemeColor({}, 'tabIconDefault');

  // Dropdown specific background for better contrast
  const dropdownBackgroundColor = useThemeColor(
    { light: '#ffffff', dark: '#2c2c2c' },
    'cardBackground'
  );

  const selectedItem = items.find((item) => item.value === value);

  // Basic debug logging
  useEffect(() => {
    debugLog(
      '[StyledSelect] Gluestack Select mounted - value:',
      value,
      'items:',
      items.length
    );
  }, [value, items]);

  return (
    <Select
      selectedValue={value}
      onValueChange={(newValue) => {
        debugLog('[StyledSelect] Value changed to:', newValue);
        onValueChange(newValue);
      }}
    >
      <SelectTrigger
        variant="outline"
        size="md"
        style={{
          backgroundColor: backgroundColor,
          borderColor: borderColor,
        }}
      >
        <SelectInput
          placeholder={placeholder}
          value={selectedItem?.label || ''}
          style={{
            color: textColor,
          }}
          placeholderTextColor={placeholderTextColor}
        />
        <SelectIcon
          as={ChevronDownIcon}
          className="mr-3"
          color={textColor}
          size="sm"
        />
      </SelectTrigger>
      <SelectPortal>
        <SelectBackdrop />
        <SelectContent
          className="z-[10000]"
          style={{
            backgroundColor: dropdownBackgroundColor,
          }}
        >
          <SelectScrollView>
            {items.map((item) => (
              <SelectItem
                key={item.value}
                label={item.label}
                value={item.value}
              />
            ))}
          </SelectScrollView>
        </SelectContent>
      </SelectPortal>
    </Select>
  );
}
