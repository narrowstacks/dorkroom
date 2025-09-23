import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Text, VStack } from '@gluestack-ui/themed';
import { ChevronDown } from 'lucide-react-native';
import { useThemeColor } from '@/hooks/useThemeColor';
import type { Film, Developer } from '@/api/dorkroom/types';

interface MobileSelectButtonProps {
  label: string;
  selectedItem?: Film | Developer | null;
  selectedValue?: string;
  selectedLabel?: string;
  onPress: () => void;
  type: 'film' | 'developer' | 'dilution';
}

export function MobileSelectButton({
  label,
  selectedItem,
  selectedValue,
  selectedLabel,
  onPress,
  type,
}: MobileSelectButtonProps) {
  const textColor = useThemeColor({}, 'text');
  const cardBackground = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'borderColor');
  const developmentTint = useThemeColor({}, 'developmentRecipesTint');

  const getDisplayText = () => {
    if (type === 'dilution') {
      if (!selectedValue) return `Select ${label}`;
      return selectedLabel || selectedValue;
    }

    if (!selectedItem) return `Select ${label}`;

    if (type === 'film') {
      const film = selectedItem as Film;
      return `${film.brand} ${film.name}`;
    } else {
      const dev = selectedItem as Developer;
      return `${dev.manufacturer} ${dev.name}`;
    }
  };

  const hasSelection = type === 'dilution' ? !!selectedValue : !!selectedItem;

  return (
    <TouchableOpacity
      style={[
        styles.mobileSelectButton,
        {
          backgroundColor: cardBackground,
          borderColor: hasSelection ? developmentTint : borderColor,
          borderWidth: hasSelection ? 2 : 1,
        },
      ]}
      onPress={onPress}
    >
      <VStack space="xs" style={{ flex: 1 }}>
        <Text
          style={[styles.mobileSelectLabel, { color: textColor, opacity: 0.7 }]}
        >
          {label}
        </Text>
        <Text
          style={[
            styles.mobileSelectText,
            { color: hasSelection ? developmentTint : textColor },
          ]}
          numberOfLines={1}
        >
          {getDisplayText()}
        </Text>
      </VStack>
      <ChevronDown
        size={20}
        color={hasSelection ? developmentTint : textColor}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  mobileSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  mobileSelectLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  mobileSelectText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
