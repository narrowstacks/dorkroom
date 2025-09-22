import React from "react";
import { Platform, StyleSheet } from "react-native";
import { Button, ButtonText, Box, Text } from "@gluestack-ui/themed";
import { useReciprocityCalculator } from "@/hooks/useReciprocityCalculator";
import { FILM_TYPES, EXPOSURE_PRESETS } from "@/constants/reciprocity";
import { useThemeColor } from "@/hooks/useThemeColor";
import { fonts } from "@/styles/common";
import { CalculatorLayout } from "@/components/ui/layout/CalculatorLayout";
import { ResultRow } from "@/components/ui/calculator/ResultsSection";
import { InfoSection, InfoText } from "@/components/ui/calculator/InfoSection";
import { StyledSelect } from "@/components/ui/select/StyledSelect";
import { TimeInput, NumberInput } from "@/components/ui/forms";

export default function ReciprocityCalculator() {
  const textColor = useThemeColor({}, "text");
  const borderColor = useThemeColor({}, "borderColor");
  const tintColor = useThemeColor({}, "tint");
  const inputBackground = useThemeColor({}, "inputBackground");
  const textSecondary = useThemeColor({}, "textSecondary");
  const textMuted = useThemeColor({}, "textMuted");
  const surfaceVariant = useThemeColor({}, "surfaceVariant");

  const {
    filmType,
    setFilmType,
    meteredTime,
    setMeteredTime,
    setMeteredTimeDirectly,
    customFactor,
    setCustomFactor,
    formattedTime,
    timeFormatError,
    calculation,
    formatTime,
  } = useReciprocityCalculator();

  const infoSection = (
    <>
      <InfoSection title="How to Use This Calculator">
        <InfoText>
          Follow these simple steps to calculate reciprocity compensation:
        </InfoText>
        <InfoText>
          <Text style={{ fontWeight: "600" }}>
            1. Select Your Film Type{"\n"}
          </Text>
          Choose from common film stocks or select "Custom" to enter your own
          reciprocity factor.
        </InfoText>
        <InfoText>
          <Text style={{ fontWeight: "600" }}>
            2. Enter Metered Exposure Time{"\n"}
          </Text>
          Input the exposure time your light meter recommends.
        </InfoText>
        <InfoText>
          <Text style={{ fontWeight: "600" }}>3. Read Your Results{"\n"}</Text>
          The calculator shows your adjusted exposure time and the percentage
          increase needed to compensate for reciprocity failure.
        </InfoText>
      </InfoSection>

      <InfoSection title="What is Reciprocity Failure?">
        <InfoText>
          <Text style={{ fontWeight: "600" }}>The Reciprocity Law{"\n"}</Text>
          Under normal conditions, film follows a simple rule: if you double the
          exposure time, you can halve the light intensity and achieve the same
          exposure. This is called the reciprocity law.
        </InfoText>
        <InfoText>
          <Text style={{ fontWeight: "600" }}>When It Breaks Down{"\n"}</Text>
          This relationship fails during very long exposures (typically longer
          than 1 second) or very short ones (shorter than 1/1000th of a second).
          During long exposures, film becomes progressively less responsive to
          light.
        </InfoText>
        <InfoText>
          <Text style={{ fontWeight: "600" }}>Why It Happens{"\n"}</Text>
          The silver halide crystals in film need a minimum rate of light to
          trigger chemical reactions. When photons arrive slowly over long
          periods, the photochemical processes become less efficient, resulting
          in underexposure.
        </InfoText>
        <InfoText>
          <Text style={{ fontWeight: "600" }}>
            Film-Specific Behavior{"\n"}
          </Text>
          Each film stock has unique reciprocity characteristics:
          {"\n"}• Some films work well up to 10-second exposures
          {"\n"}• Others show failure at just 2-3 seconds
          {"\n"}• The reciprocity factor tells you how much extra time you need
        </InfoText>
        <InfoText>
          <Text style={{ fontWeight: "600" }}>Common Applications{"\n"}</Text>
          This primarily affects long-exposure photography including night
          scenes, astrophotography, and architectural interiors where
          understanding reciprocity failure is essential for proper exposure.
        </InfoText>
      </InfoSection>
    </>
  );

  return (
    <CalculatorLayout title="Reciprocity Calculator" infoSection={infoSection}>
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
          {/* Film Type */}
          <Box className="w-full gap-2">
            <Text
              className="text-base font-medium"
              style={[styles.inputLabel, { color: textColor }]}
            >
              Film Type
            </Text>
            <StyledSelect
              value={filmType}
              onValueChange={setFilmType}
              items={FILM_TYPES}
            />
          </Box>

          {/* Custom Factor (conditional) */}
          {filmType === "custom" && (
            <Box className="w-full gap-2">
              <Text
                className="text-base font-medium"
                style={[styles.inputLabel, { color: textColor }]}
              >
                Reciprocity Factor
              </Text>
              <NumberInput
                value={customFactor}
                onChangeText={setCustomFactor}
                placeholder="1.3"
                inputTitle="Enter Reciprocity Factor"
                step={0.1}
              />
              <Text
                className="text-xs italic"
                style={[styles.infoText, { color: textMuted }]}
              >
                Higher values mean more compensation needed
              </Text>
            </Box>
          )}

          {/* Metered Time */}
          <Box className="w-full gap-2">
            <Text
              className="text-base font-medium"
              style={[styles.inputLabel, { color: textColor }]}
            >
              Metered Exposure Time
            </Text>
            <TimeInput
              value={meteredTime}
              onChangeText={setMeteredTime}
              placeholder="e.g. 30, 1.5m, 2h"
              inputTitle="Enter Exposure Time"
              error={timeFormatError || undefined}
              helpText={
                formattedTime && formattedTime !== meteredTime
                  ? `Parsed as: ${formattedTime}`
                  : undefined
              }
            />
          </Box>
        </Box>

        {/* Results Section (conditional) */}
        {calculation && (
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
              <ResultRow
                label="Adjusted Time"
                value={formatTime(calculation.adjustedTime)}
                isLast
              />
              <ResultRow
                label="Increase"
                value={`${Math.round(calculation.percentageIncrease)}%`}
              />
              <ResultRow
                label="Formula"
                value={
                  <Text style={[styles.formulaContainer, { color: textColor }]}>
                    <Text style={styles.formulaBase}>
                      {calculation.originalTime}
                    </Text>
                    <Text
                      style={[styles.formulaExponent, { color: tintColor }]}
                    >
                      {calculation.factor.toFixed(2)}
                    </Text>
                    <Text style={styles.formulaBase}>{" = "}</Text>
                    <Text style={styles.formulaResult}>
                      {Math.round(calculation.adjustedTime * 10) / 10}
                    </Text>
                  </Text>
                }
              />
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
    width: "100%",
    maxWidth: 672, // max-w-2xl equivalent (42rem * 16px)
  },
  inputSection: {
    gap: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  divider: {
    height: 1,
    width: "100%",
    marginVertical: 24,
  },
  resultsSection: {
    gap: 16,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  formulaContainer: {
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 22,
    fontFamily: Platform.select({
      ios: fonts.ios.primary,
      android: fonts.android.primary,
      web: fonts.web.primary,
    }),
  },
  formulaBase: {
    fontSize: 18,
    fontWeight: "600",
  },
  formulaExponent: {
    fontSize: 11,
    fontWeight: "700",
    textAlignVertical: "top",
    lineHeight: 11,
    ...Platform.select({
      ios: {
        textAlignVertical: "top",
        transform: [{ translateY: -6 }],
      },
      android: {
        textAlignVertical: "top",
        includeFontPadding: false,
      },
      web: {
        verticalAlign: "super",
        fontSize: 11,
      },
    }),
  },
  formulaResult: {
    fontSize: 18,
    fontWeight: "700",
  },
  helpText: {
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 6,
  },
  errorText: {
    fontSize: 12,
    marginTop: 6,
    fontWeight: "500",
  },
  infoText: {
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 6,
  },
});
