import React from "react";
import { Text } from "@gluestack-ui/themed";
import { LabeledSliderInput } from "@/components/ui/forms";
import { WarningAlert } from "@/components/ui/feedback";
import { useThemeColor } from "@/hooks/useThemeColor";
import { SectionWrapper } from "./SectionWrapper";
import {
  SLIDER_MIN_BORDER,
  SLIDER_MAX_BORDER,
  SLIDER_STEP_BORDER,
  BORDER_SLIDER_LABELS,
} from "@/constants/borderCalc";

interface BorderSizeSectionProps {
  onClose: () => void;
  minBorder: number;
  setMinBorder: (value: number) => void;
  minBorderWarning: string | null;
}

export const BorderSizeSection: React.FC<BorderSizeSectionProps> = ({
  onClose,
  minBorder,
  setMinBorder,
  minBorderWarning,
}) => {
  const textColor = useThemeColor({}, "text");
  const iconColor = useThemeColor({}, "icon");
  const tintColor = useThemeColor({}, "tint");

  return (
    <SectionWrapper title="Border Size" onClose={onClose}>
      <Text style={{ fontSize: 16, color: textColor, textAlign: "center" }}>
        Set the minimum border size for your print
      </Text>

      <LabeledSliderInput
        label="Minimum Border (inches):"
        value={minBorder}
        onChange={(v) => {
          const parsed = parseFloat(v);
          setMinBorder(isNaN(parsed) ? 0 : parsed);
        }}
        onSliderChange={setMinBorder}
        min={SLIDER_MIN_BORDER}
        max={SLIDER_MAX_BORDER}
        step={SLIDER_STEP_BORDER}
        labels={BORDER_SLIDER_LABELS}
        textColor={textColor}
        borderColor={iconColor}
        tintColor={tintColor}
        continuousUpdate={true}
      />

      {minBorderWarning && (
        <WarningAlert message={minBorderWarning} action="error" />
      )}
    </SectionWrapper>
  );
};
