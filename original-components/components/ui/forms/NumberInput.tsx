import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
  Platform,
} from 'react-native';
import { Text, HStack } from '@gluestack-ui/themed';
import { Minus, Plus } from 'lucide-react-native';
import { ThemedText } from '@/components/ui/core/ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';
import {
  useMobileInputDetection,
  MobileInputTrigger,
  MobileInputModal,
  modalInputStyles,
} from './MobileInputShared';

interface NumberInputProps extends TextInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  inputTitle?: string; // Custom title for the modal
  step?: number; // Custom increment/decrement step
}

// Number input stepper buttons component for modal
const NumberStepperButtons: React.FC<{
  tempValue: string;
  step: number;
  onIncrement: () => void;
  onDecrement: () => void;
}> = ({ tempValue, step, onIncrement, onDecrement }) => {
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'icon');

  const formatStepLabel = (step: number) => {
    if (step < 1) {
      return `±${step.toFixed(1)}`;
    }
    return `±${step}`;
  };

  return (
    <HStack space="md" style={{ alignItems: 'center' }}>
      <TouchableOpacity
        onPress={onDecrement}
        style={[styles.stepperButton, { borderColor: borderColor }]}
      >
        <Minus size={20} color={textColor} />
      </TouchableOpacity>

      <Text style={[styles.stepperLabel, { color: textColor }]}>
        {formatStepLabel(step)}
      </Text>

      <TouchableOpacity
        onPress={onIncrement}
        style={[styles.stepperButton, { borderColor: borderColor }]}
      >
        <Plus size={20} color={textColor} />
      </TouchableOpacity>
    </HStack>
  );
};

export const NumberInput = ({
  value,
  onChangeText,
  placeholder,
  inputTitle = 'Enter Value',
  step = 0.1,
  ...rest
}: NumberInputProps) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'icon');
  const placeholderTextColor = useThemeColor({}, 'tabIconDefault');
  const inputBackground = useThemeColor({}, 'inputBackground');
  const inputRef = useRef<TextInput>(null);
  const isMobile = useMobileInputDetection();

  useEffect(() => {
    if (modalVisible) {
      setTempValue(value);
      // Auto-focus with slight delay for modal animation
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [modalVisible, value]);

  const increment = () => {
    let numValue = parseFloat(value);
    if (isNaN(numValue)) numValue = 0;
    const newValue = (numValue + step).toFixed(step < 1 ? 1 : 0);
    onChangeText(newValue);
  };

  const decrement = () => {
    let numValue = parseFloat(value);
    if (isNaN(numValue)) numValue = step;
    const newValue = (numValue - step).toFixed(step < 1 ? 1 : 0);
    if (parseFloat(newValue) >= 0) {
      onChangeText(newValue);
    } else {
      onChangeText('0' + (step < 1 ? '.0' : ''));
    }
  };

  const modalIncrement = () => {
    let numValue = parseFloat(tempValue);
    if (isNaN(numValue)) numValue = 0;
    const newValue = (numValue + step).toFixed(step < 1 ? 1 : 0);
    setTempValue(newValue);
  };

  const modalDecrement = () => {
    let numValue = parseFloat(tempValue);
    if (isNaN(numValue)) numValue = step;
    const newValue = (numValue - step).toFixed(step < 1 ? 1 : 0);
    if (parseFloat(newValue) >= 0) {
      setTempValue(newValue);
    } else {
      setTempValue('0' + (step < 1 ? '.0' : ''));
    }
  };

  const handleTextChange = (text: string) => {
    // Allow only numbers and a single decimal point
    // Allow empty string for clearing input
    if (text === '' || /^\d*\.?\d*$/.test(text)) {
      onChangeText(text);
    }
  };

  const handleModalTextChange = (text: string) => {
    // Allow only numbers and a single decimal point
    // Allow empty string for clearing input
    if (text === '' || /^\d*\.?\d*$/.test(text)) {
      setTempValue(text);
    }
  };

  const handleConfirm = () => {
    onChangeText(tempValue);
    setModalVisible(false);
  };

  const handleCancel = () => {
    setTempValue(value); // Reset to original value
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
          accessibilityLabel={`Current value: ${
            value || placeholder
          }. Tap to edit.`}
        />

        <MobileInputModal
          visible={modalVisible}
          inputTitle={inputTitle}
          onClose={handleCancel}
          onConfirm={handleConfirm}
          extraContent={
            <NumberStepperButtons
              tempValue={tempValue}
              step={step}
              onIncrement={modalIncrement}
              onDecrement={modalDecrement}
            />
          }
        >
          <TextInput
            ref={inputRef}
            style={[
              modalInputStyles.modalInput,
              {
                color: textColor,
                borderColor: borderColor,
              },
            ]}
            value={tempValue}
            onChangeText={handleModalTextChange}
            keyboardType="decimal-pad"
            placeholder={placeholder}
            placeholderTextColor={placeholderTextColor}
            selectTextOnFocus={true}
            returnKeyType="done"
            onSubmitEditing={handleConfirm}
          />
        </MobileInputModal>
      </>
    );
  }

  // Desktop Web: Show inline input with spinners (original behavior)
  return (
    <View style={styles.numberInputContainer}>
      <TextInput
        style={[styles.input, { color: textColor, borderColor: borderColor }]}
        value={value}
        onChangeText={handleTextChange}
        keyboardType="decimal-pad"
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor}
        {...rest}
      />
      <View
        style={[
          styles.spinnerButtons,
          { borderLeftColor: borderColor, backgroundColor: inputBackground },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.spinnerButton,
            Platform.OS === 'web' && { cursor: 'pointer' },
          ]}
          onPress={increment}
        >
          <ThemedText style={styles.spinnerButtonText}>▲</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.spinnerButton,
            Platform.OS === 'web' && { cursor: 'pointer' },
          ]}
          onPress={decrement}
        >
          <ThemedText style={styles.spinnerButtonText}>▼</ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  numberInputContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
    width: 120,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: 120,
    textAlign: 'center',
    paddingRight: 35,
    fontSize: 16,
    fontWeight: '500',
  },
  spinnerButtons: {
    position: 'absolute',
    right: 2,
    top: 2,
    bottom: 2,
    width: 28,
    justifyContent: 'space-evenly',
    alignItems: 'center',
    borderLeftWidth: 1,
    backgroundColor: 'transparent',
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  spinnerButton: {
    width: '100%',
    height: '50%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  spinnerButtonText: {
    fontSize: 12,
    lineHeight: 12,
    fontWeight: '600',
  },
  stepperButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperLabel: {
    fontSize: 14,
    fontWeight: '500',
    minWidth: 40,
    textAlign: 'center',
  },
});
