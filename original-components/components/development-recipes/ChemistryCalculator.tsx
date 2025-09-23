import React from 'react';
import { StyleSheet } from 'react-native';
import {
  Box,
  Text,
  VStack,
  HStack,
  Button,
  ButtonText,
} from '@gluestack-ui/themed';
import { Beaker, RotateCcw } from 'lucide-react-native';

import { FormGroup } from '@/components/ui/forms/FormSection';
import { TextInput } from '@/components/ui/forms';
import { StyledSelect } from '@/components/ui/select/StyledSelect';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useChemistryCalculator } from '@/hooks/useChemistryCalculator';

interface ChemistryCalculatorProps {
  availableDilutions?: { label: string; value: string }[];
  defaultDilution?: string;
}

export function ChemistryCalculator({
  availableDilutions = [{ label: 'Stock', value: 'Stock' }],
  defaultDilution,
}: ChemistryCalculatorProps) {
  const textColor = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const developmentTint = useThemeColor({}, 'developmentRecipesTint');
  const cardBackground = useThemeColor({}, 'cardBackground');
  const outline = useThemeColor({}, 'outline');

  const chemistry = useChemistryCalculator();

  // Set default dilution when component mounts
  React.useEffect(() => {
    if (defaultDilution && !chemistry.selectedDilution) {
      chemistry.setSelectedDilution(defaultDilution);
    }
  }, [defaultDilution, chemistry]);

  const volumeUnits = [
    { label: 'Milliliters (ml)', value: 'ml' },
    { label: 'Fluid Ounces (fl oz)', value: 'oz' },
    { label: 'Number of Rolls', value: 'rolls' },
  ];

  const filmFormats = [
    { label: '35mm (300ml per roll)', value: '35mm' },
    { label: '120 (500ml per roll)', value: '120' },
  ];

  return (
    <Box
      style={[
        styles.container,
        { backgroundColor: cardBackground, borderColor: outline },
      ]}
    >
      <HStack space="sm" style={styles.header}>
        <Beaker size={20} color={developmentTint} />
        <Text style={[styles.title, { color: textColor }]}>
          Developer Chemistry Calculator
        </Text>
      </HStack>

      <VStack space="md" style={styles.content}>
        <FormGroup label="Volume Unit">
          <StyledSelect
            value={chemistry.unit}
            onValueChange={(value) => chemistry.setUnit(value as any)}
            items={volumeUnits}
          />
        </FormGroup>

        {chemistry.unit === 'rolls' ? (
          <>
            <FormGroup label="Film Format">
              <StyledSelect
                value={chemistry.filmFormat}
                onValueChange={(value) => chemistry.setFilmFormat(value as any)}
                items={filmFormats}
              />
            </FormGroup>

            <FormGroup label="Number of Rolls">
              <TextInput
                value={chemistry.numberOfRolls}
                onChangeText={chemistry.setNumberOfRolls}
                placeholder="1"
                keyboardType="numeric"
                inputTitle="Enter Number of Rolls"
              />
            </FormGroup>
          </>
        ) : (
          <FormGroup label={`Total Volume (${chemistry.unit})`}>
            <TextInput
              value={chemistry.totalVolume}
              onChangeText={chemistry.setTotalVolume}
              placeholder={chemistry.unit === 'ml' ? '500' : '16.9'}
              keyboardType="numeric"
              inputTitle={`Enter Total Volume (${chemistry.unit})`}
            />
          </FormGroup>
        )}

        <FormGroup label="Dilution Ratio">
          <StyledSelect
            value={chemistry.selectedDilution || ''}
            onValueChange={(value) =>
              chemistry.setSelectedDilution(value || null)
            }
            items={availableDilutions}
          />
        </FormGroup>

        {/* Results */}
        {chemistry.calculation && (
          <Box style={[styles.calculationResults, { borderColor: outline }]}>
            <Text style={[styles.resultsTitle, { color: textColor }]}>
              Mixing Recipe:
            </Text>

            <VStack space="xs">
              <HStack style={styles.resultRow}>
                <Text style={[styles.resultLabel, { color: textSecondary }]}>
                  Total Volume:
                </Text>
                <Text style={[styles.resultValue, { color: textColor }]}>
                  {chemistry.calculation.totalVolumeDisplay}
                </Text>
              </HStack>

              <HStack style={styles.resultRow}>
                <Text style={[styles.resultLabel, { color: textSecondary }]}>
                  Developer:
                </Text>
                <Text style={[styles.resultValue, { color: developmentTint }]}>
                  {chemistry.calculation.developerVolumeDisplay}
                </Text>
              </HStack>

              <HStack style={styles.resultRow}>
                <Text style={[styles.resultLabel, { color: textSecondary }]}>
                  Water:
                </Text>
                <Text style={[styles.resultValue, { color: textColor }]}>
                  {chemistry.calculation.waterVolumeDisplay}
                </Text>
              </HStack>
            </VStack>
          </Box>
        )}

        {/* Errors */}
        {chemistry.errors.length > 0 && (
          <Box style={styles.errorContainer}>
            {chemistry.errors.map((error, index) => (
              <Text key={index} style={styles.errorText}>
                {error}
              </Text>
            ))}
          </Box>
        )}

        <Button
          variant="outline"
          onPress={chemistry.reset}
          style={styles.resetButton}
        >
          <RotateCcw size={14} color={textSecondary} />
          <ButtonText
            style={[styles.resetButtonText, { color: textSecondary }]}
          >
            Reset Calculator
          </ButtonText>
        </Button>
      </VStack>
    </Box>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 16,
  },
  header: {
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  input: {
    borderRadius: 8,
  },
  calculationResults: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  resultsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  resultRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  resultValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  errorContainer: {
    padding: 8,
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderRadius: 6,
  },
  errorText: {
    fontSize: 12,
    color: '#d32f2f',
  },
  resetButton: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resetButtonText: {
    fontSize: 12,
  },
});
