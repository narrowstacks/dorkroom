import React from "react";
import { Box, Text, HStack, VStack } from "@gluestack-ui/themed";
import { useThemeColor } from "@/hooks/useThemeColor";
import type { BorderCalculation } from "@/types/borderTypes";

interface BladeResultsDisplayProps {
  calculation: BorderCalculation;
  paperSize: string;
  aspectRatio: string;
}

interface BladeResultBoxProps {
  label: string;
  value: number;
  tintColor: string;
  textColor: string;
}

const BladeResultBox: React.FC<BladeResultBoxProps> = ({
  label,
  value,
  tintColor,
  textColor,
}) => (
  <Box
    style={{
      flex: 1,
      backgroundColor: `${tintColor}15`,
      borderColor: tintColor,
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      alignItems: "center",
    }}
  >
    <Text
      style={{
        fontSize: 20,
        fontWeight: "800",
        color: textColor,
        marginBottom: 8,
      }}
    >
      {label}
    </Text>
    <Text style={{ fontSize: 16, fontWeight: "bold", color: textColor }}>
      {value.toFixed(2)}&quot;
    </Text>
  </Box>
);

export const BladeResultsDisplay: React.FC<BladeResultsDisplayProps> = ({
  calculation,
  paperSize,
  aspectRatio,
}) => {
  const cardBackground = useThemeColor({}, "cardBackground");
  const textColor = useThemeColor({}, "text");
  const outline = useThemeColor({}, "outline");
  const shadowColor = useThemeColor({}, "shadowColor");
  const tintColor = useThemeColor({}, "tint");

  return (
    <Box
      style={{
        backgroundColor: cardBackground,
        borderColor: outline,
        shadowColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderRadius: 16,
        padding: 10,
        marginBottom: 4,
        width: "100%",
      }}
    >
      {/* Header with image info */}
      <VStack space="sm" style={{ alignItems: "center", marginBottom: 20 }}>
        <Text style={{ fontSize: 20, fontWeight: "600", color: textColor }}>
          Blade Positions
        </Text>
        <Text style={{ fontSize: 16, color: textColor, textAlign: "center" }}>
          {calculation.printWidth.toFixed(2)}&quot; ×{" "}
          {calculation.printHeight.toFixed(2)}&quot; image on {paperSize}
        </Text>
      </VStack>

      {/* Blade position grid */}
      <VStack space="md">
        <HStack space="md" style={{ justifyContent: "space-between" }}>
          <BladeResultBox
            label="← L"
            value={calculation.leftBladeReading}
            tintColor={tintColor}
            textColor={textColor}
          />
          <BladeResultBox
            label="↑ T"
            value={calculation.topBladeReading}
            tintColor={tintColor}
            textColor={textColor}
          />
          <BladeResultBox
            label="B ↓"
            value={calculation.bottomBladeReading}
            tintColor={tintColor}
            textColor={textColor}
          />
          <BladeResultBox
            label="R →"
            value={calculation.rightBladeReading}
            tintColor={tintColor}
            textColor={textColor}
          />
        </HStack>
      </VStack>

      {/* Non-standard paper size warning */}
      {calculation.isNonStandardPaperSize && (
        <Box
          style={{
            borderWidth: 1,
            borderColor: tintColor,
            backgroundColor: `${tintColor}20`,
            borderRadius: 8,
            padding: 16,
            marginTop: 16,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              textAlign: "center",
              marginBottom: 8,
              fontWeight: "600",
              color: textColor,
            }}
          >
            Non-Standard Paper Size
          </Text>
          <Text style={{ fontSize: 14, textAlign: "center", color: textColor }}>
            Position paper in the {calculation.easelSizeLabel} slot all the way
            to the left.
          </Text>
        </Box>
      )}
    </Box>
  );
};
