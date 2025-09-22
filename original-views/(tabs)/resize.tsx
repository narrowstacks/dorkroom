import React from "react";
import {
  Text,
  Link,
  LinkText,
  HStack,
  Alert,
  AlertIcon,
  AlertText,
  InfoIcon,
  Switch,
  FormControl,
  FormControlLabel,
  FormControlLabelText,
} from "@gluestack-ui/themed";
import { useResizeCalculator } from "@/hooks/useResizeCalculator";
import { NumberInput } from "@/components/ui/forms/NumberInput";
import { CalculatorLayout } from "@/components/ui/layout/CalculatorLayout";
import {
  ResultsSection,
  ResultRow,
} from "@/components/ui/calculator/ResultsSection";
import { FormSection, FormGroup } from "@/components/ui/forms/FormSection";
import {
  InfoSection,
  InfoText,
  InfoSubtitle,
  InfoList,
  InfoFormula,
} from "@/components/ui/calculator/InfoSection";

// --- Helper Components ---

const ModeToggle = ({
  isEnlargerHeightMode,
  setIsEnlargerHeightMode,
}: {
  isEnlargerHeightMode: boolean;
  setIsEnlargerHeightMode: (value: boolean) => void;
}) => (
  <FormControl>
    <HStack
      space="md"
      alignItems="center"
      justifyContent="flex-start"
      paddingTop={10}
    >
      <FormControlLabel>
        <FormControlLabelText>Print Size</FormControlLabelText>
      </FormControlLabel>
      <Switch
        value={isEnlargerHeightMode}
        onValueChange={setIsEnlargerHeightMode}
      />
      <FormControlLabel>
        <FormControlLabelText>Enlarger Height</FormControlLabelText>
      </FormControlLabel>
    </HStack>
  </FormControl>
);

const DimensionInputGroup = ({
  firstLabel,
  firstValue,
  onFirstChange,
  firstPlaceholder,
  secondLabel,
  secondValue,
  onSecondChange,
  secondPlaceholder,
  unit,
}: {
  firstLabel: string;
  firstValue: string;
  onFirstChange: (value: string) => void;
  firstPlaceholder: string;
  secondLabel: string;
  secondValue: string;
  onSecondChange: (value: string) => void;
  secondPlaceholder: string;
  unit: string;
}) => (
  <HStack space="sm">
    <HStack alignItems="center" space="sm">
      <Text w="$16" textAlign="right">
        {firstLabel}:
      </Text>
      <NumberInput
        value={firstValue}
        onChangeText={onFirstChange}
        placeholder={firstPlaceholder}
        inputTitle={`Enter ${firstLabel}`}
        step={0.1}
      />
      <Text minWidth={30} textAlign="left">
        {unit}
      </Text>
    </HStack>
    <HStack alignItems="center" space="sm">
      <Text w="$16" textAlign="right">
        {secondLabel}:
      </Text>
      <NumberInput
        value={secondValue}
        onChangeText={onSecondChange}
        placeholder={secondPlaceholder}
        inputTitle={`Enter ${secondLabel}`}
        step={0.1}
      />
      <Text minWidth={30} textAlign="left">
        {unit}
      </Text>
    </HStack>
  </HStack>
);

const HOW_TO_USE_PRINT = [
  "1. Choose your calculation method: Print Size or Enlarger Height",
  "2. Print size is easier to use, but enlarger height is more accurate",
  "3. Enter the width and height of your original print",
  "4. Enter the width and height of your desired new print size",
  "5. Enter the original exposure time in seconds",
  "6. The new exposure time will be calculated automatically",
];

const HOW_TO_USE_ENLARGER = [
  "1. Choose your calculation method: Print Size or Enlarger Height",
  "2. Print size is easier to use, but enlarger height is more accurate",
  "3. Enter the original and new enlarger heights (lens to paper distance)",
  "4. Enter the original exposure time in seconds",
  "5. The new exposure time will be calculated automatically",
];

const TIPS = [
  "• The results should only be treated as a best-guess estimate",
  "• Always make a test strip when resizing prints!",
  '• The "stops difference" shows exposure change in photographic stops',
  "• Positive stops = more exposure needed (larger print)",
  "• Negative stops = less exposure needed (smaller print)",
  "• Enlarger height method is more accurate when properly calibrated",
];

const InfoSectionContent = ({
  isEnlargerHeightMode,
}: {
  isEnlargerHeightMode: boolean;
}) => {
  const inverseSquareLawUrl =
    "https://en.wikipedia.org/wiki/Inverse-square_law";

  return (
    <InfoSection title="About This Tool">
      <InfoText>
        The print resize calculator helps you determine the correct exposure
        time when enlarging or reducing the size of your darkroom prints.
      </InfoText>

      <InfoSubtitle>How to Use:</InfoSubtitle>
      <InfoList
        items={isEnlargerHeightMode ? HOW_TO_USE_ENLARGER : HOW_TO_USE_PRINT}
      />

      <InfoSubtitle>How It Works:</InfoSubtitle>
      <InfoText>
        When you change the size of a print, the light is spread across a
        different area, affecting the exposure needed. This is caused by the{" "}
        <Link href={inverseSquareLawUrl} isExternal>
          <LinkText>inverse-square law</LinkText>
        </Link>
        .
      </InfoText>

      <InfoText>The formula used depends on your selected mode:</InfoText>

      <InfoFormula>
        {isEnlargerHeightMode
          ? "New Time = Original Time × (New Height)² ÷ (Original Height)²"
          : "New Time = Original Time × (New Area ÷ Original Area)"}
      </InfoFormula>

      <InfoSubtitle>Tips:</InfoSubtitle>
      <InfoList items={TIPS.slice(0, isEnlargerHeightMode ? 6 : 5)} />
    </InfoSection>
  );
};

export default function ResizeScreen() {
  const {
    isEnlargerHeightMode,
    setIsEnlargerHeightMode,
    originalWidth,
    setOriginalWidth,
    originalLength,
    setOriginalLength,
    newWidth,
    setNewWidth,
    newLength,
    setNewLength,
    originalTime,
    setOriginalTime,
    newTime,
    stopsDifference,
    isAspectRatioMatched,
    originalHeight,
    setOriginalHeight,
    newHeight,
    setNewHeight,
  } = useResizeCalculator();

  return (
    <CalculatorLayout
      title="Print Resize Calculator"
      infoSection={
        <InfoSectionContent isEnlargerHeightMode={isEnlargerHeightMode} />
      }
    >
      <ResultsSection show={!!newTime}>
        <ResultRow label="New Time" value={`${newTime} seconds`} />
        <ResultRow
          label="Difference"
          value={`${stopsDifference} stops`}
          isLast
        />
      </ResultsSection>

      <FormSection>
        <FormGroup label="Calculation Method">
          <ModeToggle
            isEnlargerHeightMode={isEnlargerHeightMode}
            setIsEnlargerHeightMode={setIsEnlargerHeightMode}
          />
        </FormGroup>

        {!isEnlargerHeightMode ? (
          <>
            <FormGroup label="Initial Image Size">
              <DimensionInputGroup
                firstLabel="Width"
                firstValue={originalWidth}
                onFirstChange={setOriginalWidth}
                firstPlaceholder="4"
                secondLabel="Height"
                secondValue={originalLength}
                onSecondChange={setOriginalLength}
                secondPlaceholder="6"
                unit="in"
              />
            </FormGroup>

            <FormGroup label="New Image Size">
              <DimensionInputGroup
                firstLabel="Width"
                firstValue={newWidth}
                onFirstChange={setNewWidth}
                firstPlaceholder="6"
                secondLabel="Height"
                secondValue={newLength}
                onSecondChange={setNewLength}
                secondPlaceholder="9"
                unit="in"
              />
            </FormGroup>
          </>
        ) : (
          <FormGroup label="Enlarger Heights">
            <DimensionInputGroup
              firstLabel="Original"
              firstValue={originalHeight}
              onFirstChange={setOriginalHeight}
              firstPlaceholder="500"
              secondLabel="New"
              secondValue={newHeight}
              onSecondChange={setNewHeight}
              secondPlaceholder="600"
              unit="cm"
            />
          </FormGroup>
        )}

        {!isEnlargerHeightMode && !isAspectRatioMatched && (
          <Alert action="warning" variant="outline" mb="$4" width="100%">
            <AlertIcon as={InfoIcon} size="lg" mr="$3" />
            <AlertText>
              The aspect ratios of the initial and new sizes don&apos;t match!
            </AlertText>
          </Alert>
        )}

        <FormGroup label="Original Exposure Time">
          <HStack alignItems="center" space="sm">
            <NumberInput
              value={originalTime}
              onChangeText={setOriginalTime}
              placeholder="10"
              inputTitle="Enter Exposure Time"
              step={0.5}
            />
            <Text minWidth={60} textAlign="left">
              seconds
            </Text>
          </HStack>
        </FormGroup>
      </FormSection>
    </CalculatorLayout>
  );
}
