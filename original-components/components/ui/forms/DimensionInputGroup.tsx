import React from 'react';
import { Platform } from 'react-native';
import { Box, Text } from '@gluestack-ui/themed';
import { TextInput } from './TextInput';

interface DimensionInputGroupProps {
  widthValue: string;
  onWidthChange: (text: string) => void;
  heightValue: string;
  onHeightChange: (text: string) => void;
  widthLabel: string;
  heightLabel: string;
  widthPlaceholder: string;
  heightPlaceholder: string;
  widthDefault: string;
  heightDefault: string;
}

export const DimensionInputGroup = ({
  widthValue,
  onWidthChange,
  heightValue,
  onHeightChange,
  widthLabel,
  heightLabel,
  widthPlaceholder,
  heightPlaceholder,
  widthDefault,
  heightDefault,
}: DimensionInputGroupProps) => (
  <Box sx={{ gap: 8 }}>
    <Box sx={{ flexDirection: 'row', alignItems: 'center', gap: 16, mt: 8 }}>
      <Box sx={{ flex: 1, gap: 4 }}>
        <Text sx={{ fontSize: 16, mb: Platform.OS === 'web' ? 0 : 4 }}>
          {widthLabel}
        </Text>
        <TextInput
          value={widthValue}
          onChangeText={onWidthChange}
          placeholder={widthPlaceholder}
          defaultValue={widthDefault}
          inputTitle={`Enter ${widthLabel}`}
        />
      </Box>
      <Box sx={{ flex: 1, gap: 4 }}>
        <Text sx={{ fontSize: 16, mb: Platform.OS === 'web' ? 0 : 4 }}>
          {heightLabel}
        </Text>
        <TextInput
          value={heightValue}
          onChangeText={onHeightChange}
          placeholder={heightPlaceholder}
          defaultValue={heightDefault}
          inputTitle={`Enter ${heightLabel}`}
        />
      </Box>
    </Box>
  </Box>
);
