import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { useExposureCalculator } from '@/hooks/useExposureCalculator';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Button, ButtonText, HStack, Box, Text } from '@gluestack-ui/themed';
import { CalculatorLayout } from '@/components/ui/layout/CalculatorLayout';
import { ResultRow } from '@/components/ui/calculator/ResultsSection';
import { NumberInput } from '@/components/ui/forms';
import {
  InfoSection,
  InfoText,
  InfoSubtitle,
} from '@/components/ui/calculator/InfoSection';

export default function ExposureCalculator() {
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'borderColor');
  const surfaceVariant = useThemeColor({}, 'surfaceVariant');
  const inputBackground = useThemeColor({}, 'inputBackground');

  const {
    originalTime,
    setOriginalTime,
    newTime,
    stops,
    setStops,
    adjustStops,
  } = useExposureCalculator();

  const renderStopButton = (label: string, increment: number) => (
    <Button
      onPress={() => adjustStops(increment)}
      variant="outline"
      size="xs"
      className="items-center justify-center rounded-lg px-1 py-1"
      style={{
        backgroundColor: inputBackground,
        borderColor,
        minWidth: 40,
      }}
    >
      <ButtonText
        className={`text-sm ${Platform.OS === 'web' ? 'select-none' : ''}`}
        style={{ color: textColor }}
      >
        {label}
      </ButtonText>
    </Button>
  );

  const infoSection = (
    <InfoSection title="About This Tool">
      <InfoText>
        The exposure calculator helps you adjust your exposure time by stops.
        Each stop represents a doubling or halving of the light reaching the
        paper. This is handy when you are changing your aperture or doing f-stop
        printing when darkroom printing.
      </InfoText>

      <InfoSubtitle>How to Use:</InfoSubtitle>
      <InfoText>1. Enter your original exposure time in seconds</InfoText>
      <InfoText>2. Use the buttons to adjust the exposure by stops</InfoText>
      <InfoText>
        3. The new exposure time will be calculated automatically
      </InfoText>

      <InfoSubtitle>Tips:</InfoSubtitle>
      <InfoText>• Each stop doubles or halves the exposure time</InfoText>
      <InfoText>• Use 1/3 and 1/2 stop adjustments for fine-tuning</InfoText>
      <InfoText>• Use 1 stop adjustments for significant changes</InfoText>
      <InfoText>
        • Worth noting: Because exposure is logarithmic, half stops are not
        exactly half the exposure time
      </InfoText>
    </InfoSection>
  );

  return (
    <CalculatorLayout title="Exposure Calculator" infoSection={infoSection}>
      {/* Unified Calculator Section */}
      <Box
        className="w-full max-w-2xl rounded-2xl p-6"
        style={[
          styles.unifiedContainer,
          {
            backgroundColor: surfaceVariant,
            borderColor,
          },
        ]}
      >
        {/* Input Section */}
        <Box className="w-full gap-6" style={styles.inputSection}>
          {/* Original Exposure Time */}
          <Box className="w-full items-center gap-2">
            <Text
              className="text-base font-medium"
              style={[
                styles.inputLabel,
                { color: textColor, textAlign: 'center' },
              ]}
            >
              Original Exposure Time (seconds)
            </Text>
            <Box className="w-full flex-row items-center justify-center">
              <NumberInput
                value={originalTime}
                onChangeText={setOriginalTime}
                placeholder="Enter time"
                inputTitle="Enter Original Exposure Time"
                step={0.1}
              />
            </Box>
          </Box>

          {/* Stop Adjustment */}
          <Box className="w-full items-center gap-2">
            <Text
              className="text-base font-medium"
              style={[
                styles.inputLabel,
                { color: textColor, textAlign: 'center' },
              ]}
            >
              Stop Adjustment
            </Text>
            <Box
              className="w-full gap-3"
              style={styles.stopAdjustmentContainer}
            >
              {/* Negative Adjustments */}
              <HStack
                space="sm"
                className="items-center justify-center gap-2"
                alignItems="center"
                justifyContent="center"
              >
                {renderStopButton('-1', -1)}
                {renderStopButton('-1/2', -0.5)}
                {renderStopButton('-1/3', -1 / 3)}
              </HStack>

              {/* Manual Input */}
              <Box
                className="w-full items-center"
                style={styles.inputContainer}
              >
                <NumberInput
                  value={stops}
                  onChangeText={setStops}
                  placeholder="1"
                  inputTitle="Enter Stop Adjustment"
                  step={0.1}
                />
              </Box>

              {/* Positive Adjustments */}
              <HStack
                space="sm"
                className="items-center justify-center gap-2"
                alignItems="center"
                justifyContent="center"
              >
                {renderStopButton('+1/3', 1 / 3)}
                {renderStopButton('+1/2', 0.5)}
                {renderStopButton('+1', 1)}
              </HStack>
            </Box>
          </Box>
        </Box>

        {/* Results Section (conditional) */}
        {newTime && (
          <>
            {/* Divider */}
            <Box
              className="my-6 h-px w-full"
              style={[styles.divider, { backgroundColor: `${borderColor}40` }]}
            />

            {/* Results */}
            <Box className="w-full gap-4" style={styles.resultsSection}>
              <Text
                className="text-lg font-semibold"
                style={[styles.resultsTitle, { color: textColor }]}
              >
                Calculation Results
              </Text>

              {originalTime && newTime && (
                <ResultRow
                  label={
                    parseFloat(newTime) > parseFloat(originalTime)
                      ? 'Add'
                      : 'Remove'
                  }
                  value={`${Math.abs(
                    parseFloat(newTime) - parseFloat(originalTime)
                  ).toFixed(2)} seconds`}
                />
              )}
              <ResultRow label="New Time" value={`${newTime} seconds`} isLast />
            </Box>
          </>
        )}
      </Box>
    </CalculatorLayout>
  );
}

const styles = StyleSheet.create({
  unifiedContainer: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 672, // max-w-2xl equivalent (42rem * 16px)
  },
  inputSection: {
    gap: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  stopAdjustmentContainer: {
    width: '100%',
    gap: 12,
    alignItems: 'center',
  },
  inputContainer: {
    width: '100%',
    maxWidth: 200,
    alignItems: 'center',
  },
  divider: {
    height: 1,
    width: '100%',
    marginVertical: 24,
  },
  resultsSection: {
    gap: 16,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
});
