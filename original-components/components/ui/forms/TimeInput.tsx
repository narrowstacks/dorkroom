import React, { useState, useRef, useEffect } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
} from "react-native";
import { Text, HStack } from "@gluestack-ui/themed";
import { useThemeColor } from "@/hooks/useThemeColor";
import {
  useMobileInputDetection,
  MobileInputTrigger,
  MobileInputModal,
  modalInputStyles,
} from "./MobileInputShared";

interface TimeInputProps
  extends Omit<TextInputProps, "value" | "onChangeText"> {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  inputTitle?: string;
  error?: string;
  helpText?: string;
}

type TimeUnit = "s" | "m" | "h";

const TIME_UNITS: { value: TimeUnit; label: string; fullLabel: string }[] = [
  { value: "s", label: "secs", fullLabel: "Seconds" },
  { value: "m", label: "mins", fullLabel: "Minutes" },
  { value: "h", label: "hours", fullLabel: "Hours" },
];

// Unit selector buttons component
const UnitSelector: React.FC<{
  selectedUnit: TimeUnit;
  onUnitChange: (unit: TimeUnit) => void;
  isMobile?: boolean;
}> = ({ selectedUnit, onUnitChange, isMobile = false }) => {
  const textColor = useThemeColor({}, "text");
  const borderColor = useThemeColor({}, "borderColor");
  const tintColor = useThemeColor({}, "tint");
  const inputBackground = useThemeColor({}, "inputBackground");
  const backgroundColor = useThemeColor({}, "background");

  return (
    <HStack
      space="xs"
      style={isMobile ? styles.mobileUnitSelector : styles.unitSelector}
    >
      {TIME_UNITS.map((unit) => (
        <TouchableOpacity
          key={unit.value}
          onPress={() => onUnitChange(unit.value)}
          style={[
            isMobile ? styles.mobileUnitButton : styles.unitButton,
            {
              backgroundColor:
                selectedUnit === unit.value ? tintColor : inputBackground,
              borderColor:
                selectedUnit === unit.value ? tintColor : borderColor,
            },
          ]}
        >
          <Text
            style={[
              isMobile ? styles.mobileUnitButtonText : styles.unitButtonText,
              {
                color:
                  selectedUnit === unit.value ? backgroundColor : textColor,
              },
            ]}
          >
            {isMobile ? unit.fullLabel : unit.label}
          </Text>
        </TouchableOpacity>
      ))}
    </HStack>
  );
};

// Parse time input to extract numeric value and unit
const parseTimeInput = (input: string): { value: string; unit: TimeUnit } => {
  const trimmed = input.trim().toLowerCase();

  // Extract number and unit
  const match = trimmed.match(/^(\d*\.?\d*)\s*([smh]?)$/);

  if (match) {
    const [, value, unit] = match;
    return {
      value: value || "",
      unit: (unit as TimeUnit) || "s",
    };
  }

  // Fallback: treat as seconds if just a number
  const numberMatch = trimmed.match(/^\d*\.?\d*$/);
  if (numberMatch) {
    return { value: trimmed, unit: "s" };
  }

  return { value: "", unit: "s" };
};

// Combine numeric value and unit into time string
const combineTimeInput = (value: string, unit: TimeUnit): string => {
  if (!value) return "";
  return `${value}${unit}`;
};

export const TimeInput = ({
  value,
  onChangeText,
  placeholder = "e.g. 30, 1.5m, 2h",
  inputTitle = "Enter Time",
  error,
  helpText,
  ...rest
}: TimeInputProps) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  // Parse current value to get numeric part and unit
  const parsed = parseTimeInput(value);
  const [numericValue, setNumericValue] = useState(parsed.value);
  const [selectedUnit, setSelectedUnit] = useState<TimeUnit>(parsed.unit);

  const textColor = useThemeColor({}, "text");
  const borderColor = useThemeColor({}, "borderColor");
  const placeholderTextColor = useThemeColor({}, "tabIconDefault");
  const errorColor = useThemeColor({}, "errorColor");
  const textMuted = useThemeColor({}, "textMuted");
  const inputBackground = useThemeColor({}, "inputBackground");

  const inputRef = useRef<TextInput>(null);
  const isMobile = useMobileInputDetection();

  // Update parent when numeric value or unit changes
  useEffect(() => {
    const combined = combineTimeInput(numericValue, selectedUnit);
    if (combined !== value) {
      onChangeText(combined);
    }
  }, [numericValue, selectedUnit, value, onChangeText]);

  // Update local state when external value changes
  useEffect(() => {
    const newParsed = parseTimeInput(value);
    setNumericValue(newParsed.value);
    setSelectedUnit(newParsed.unit);
  }, [value]);

  useEffect(() => {
    if (modalVisible) {
      setTempValue(value);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [modalVisible, value]);

  const handleNumericChange = (text: string) => {
    // Allow only numbers and a single decimal point
    if (text === "" || /^\d*\.?\d*$/.test(text)) {
      setNumericValue(text);
    }
  };

  const handleUnitChange = (unit: TimeUnit) => {
    setSelectedUnit(unit);
  };

  const handleModalTextChange = (text: string) => {
    if (text === "" || /^\d*\.?\d*$/.test(text)) {
      const parsed = parseTimeInput(text);
      setTempValue(combineTimeInput(parsed.value, selectedUnit));
    }
  };

  const handleConfirm = () => {
    onChangeText(tempValue);
    setModalVisible(false);
  };

  const handleCancel = () => {
    setTempValue(value);
    setModalVisible(false);
  };

  // Mobile: Show button that opens modal
  if (isMobile) {
    return (
      <>
        <MobileInputTrigger
          value={value}
          placeholder={placeholder}
          onPress={() => setModalVisible(true)}
          accessibilityLabel={`Current time: ${value || placeholder}. Tap to edit.`}
        />

        <MobileInputModal
          visible={modalVisible}
          inputTitle={inputTitle}
          onClose={handleCancel}
          onConfirm={handleConfirm}
          extraContent={
            <UnitSelector
              selectedUnit={selectedUnit}
              onUnitChange={handleUnitChange}
              isMobile={true}
            />
          }
        >
          <TextInput
            ref={inputRef}
            style={[
              modalInputStyles.modalInput,
              {
                color: textColor,
                borderColor: error ? errorColor : borderColor,
              },
            ]}
            value={numericValue}
            onChangeText={handleModalTextChange}
            keyboardType="decimal-pad"
            placeholder="Enter time value"
            placeholderTextColor={placeholderTextColor}
            selectTextOnFocus={true}
            returnKeyType="done"
            onSubmitEditing={handleConfirm}
          />
        </MobileInputModal>
      </>
    );
  }

  // Desktop Web: Show inline input with unit selector
  return (
    <View style={styles.timeInputContainer}>
      <View style={styles.inputRow}>
        <TextInput
          style={[
            styles.input,
            {
              color: textColor,
              borderColor: error ? errorColor : borderColor,
              backgroundColor: inputBackground,
            },
          ]}
          value={numericValue}
          onChangeText={handleNumericChange}
          keyboardType="decimal-pad"
          placeholder="30"
          placeholderTextColor={placeholderTextColor}
          {...rest}
        />
        <UnitSelector
          selectedUnit={selectedUnit}
          onUnitChange={handleUnitChange}
        />
      </View>

      {/* Help text or error */}
      {(helpText || error) && (
        <Text
          style={[
            styles.helpText,
            {
              color: error ? errorColor : textMuted,
            },
          ]}
        >
          {error || helpText}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  timeInputContainer: {
    width: "100%",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    minWidth: 100,
    textAlign: "left",
  },
  unitSelector: {
    flexDirection: "row",
    gap: 4,
  },
  unitButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  unitButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  mobileUnitSelector: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 16,
  },
  mobileUnitButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  mobileUnitButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  helpText: {
    fontSize: 12,
    marginTop: 6,
    fontStyle: "italic",
  },
});
