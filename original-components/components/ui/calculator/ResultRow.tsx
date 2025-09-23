import React from 'react';
import { Box, Text } from '@gluestack-ui/themed';
import { getPlatformFont } from '@/styles/common';

interface ResultRowProps {
  label: string;
  value: string;
}

export const ResultRow = ({ label, value }: ResultRowProps) => (
  <Box
    sx={{
      flexDirection: 'row',
      width: '100%',
      justifyContent: 'space-between',
      gap: 16,
    }}
  >
    <Text
      sx={{
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'right',
        fontFamily: getPlatformFont(),
        flex: 1,
      }}
    >
      {label}
    </Text>
    <Text
      sx={{
        fontSize: 16,
        textAlign: 'left',
        fontFamily: getPlatformFont(),
        flex: 1,
      }}
    >
      {value}
    </Text>
  </Box>
);
