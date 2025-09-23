import React, { ReactNode } from 'react';
import { StyleSheet, Platform } from 'react-native';
import { Box, Text } from '@gluestack-ui/themed';
import { useWindowDimensions } from '@/hooks/useWindowDimensions';
import { useThemeColor } from '@/hooks/useThemeColor';

interface ResultRowProps {
  label: string;
  value: string | ReactNode;
  isLast?: boolean;
}

interface ResultsSectionProps {
  title?: string;
  children: ReactNode;
  show?: boolean;
}

export function ResultRow({ label, value, isLast = false }: ResultRowProps) {
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const outline = useThemeColor({}, 'outline');
  const resultRowBackground = useThemeColor({}, 'resultRowBackground');

  return (
    <Box
      className={`w-full flex-row items-center justify-between gap-4 rounded-xl px-4 py-3 ${
        !isLast ? 'border-b' : ''
      }`}
      style={[
        styles.resultRow,
        !isLast && { borderBottomColor: outline },
        { backgroundColor: resultRowBackground },
      ]}
    >
      <Text
        className="text-base font-medium"
        style={[styles.resultLabel, { color: textSecondary }]}
      >
        {label}
      </Text>
      <Box className="flex-1 items-end">
        <Text
          className="text-lg font-semibold"
          style={[styles.resultValue, { color: textColor }]}
        >
          {value}
        </Text>
      </Box>
    </Box>
  );
}

export function ResultsSection({
  title = 'Result',
  children,
  show = true,
}: ResultsSectionProps) {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width > 768;
  const cardBackground = useThemeColor({}, 'cardBackground');
  const shadowColor = useThemeColor({}, 'shadowColor');

  if (!show) return null;

  return (
    <Box
      className="mb-8 w-full items-center gap-5 web:mb-0 web:flex-1 web:self-stretch"
      style={[
        // styles.resultsSection,
        Platform.OS === 'web' && isDesktop && styles.webResultsSection,
      ]}
    >
      <Text
        className="mb-2 text-center text-2xl font-semibold"
        style={styles.subtitle}
      >
        {title}
      </Text>

      <Box
        className="w-full max-w-lg items-center gap-4 rounded-2xl p-6 shadow-lg"
        style={[
          styles.resultContainer,
          {
            backgroundColor: cardBackground,
            shadowColor,
          },
        ]}
      >
        {children}
      </Box>
    </Box>
  );
}

const styles = StyleSheet.create({
  webResultsSection: {
    flex: 1,
    alignSelf: 'stretch',
    marginBottom: 0,
  },
  subtitle: {
    fontSize: 22,
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  resultContainer: {
    alignItems: 'center',
    gap: 16,
    width: '100%',
    maxWidth: 480,
    padding: 24,
    borderRadius: 16,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  resultRow: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  resultLabel: {
    fontSize: 16,
    fontWeight: '500',
    minWidth: 80,
  },
  resultValue: {
    fontSize: 18,
    textAlign: 'right',
    fontWeight: '600',
    flex: 1,
  },
});
