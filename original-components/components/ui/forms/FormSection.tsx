import React, { ReactNode } from 'react';
import { StyleSheet, Platform } from 'react-native';
import { Box, Text } from '@gluestack-ui/themed';
import { useWindowDimensions } from '@/hooks/useWindowDimensions';

interface FormGroupProps {
  label: string;
  children: ReactNode;
}

interface FormSectionProps {
  children: ReactNode;
}

export function FormGroup({ label, children }: FormGroupProps) {
  return (
    <Box className="gap-3" style={styles.formGroup}>
      <Text className="mb-1 text-base font-medium" style={styles.label}>
        {label}:
      </Text>
      {children}
    </Box>
  );
}

export function FormSection({ children }: FormSectionProps) {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width > 768;

  return (
    <Box
      className="w-full gap-5 web:max-w-lg web:flex-1"
      style={[
        styles.form,
        Platform.OS === 'web' && isDesktop && styles.webForm,
      ]}
    >
      {children}
    </Box>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 20,
    width: '100%',
  },
  webForm: {
    flex: 1,
    maxWidth: 480,
  },
  formGroup: {
    gap: 12,
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
});
