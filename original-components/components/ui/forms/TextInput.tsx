import React, { useState, useRef, useEffect } from "react";
import {
  TextInput as RNTextInput,
  TextInputProps as RNTextInputProps,
} from "react-native";
import { Input, InputField } from "@gluestack-ui/themed";
import { useThemeColor } from "@/hooks/useThemeColor";
import {
  useMobileInputDetection,
  MobileInputTrigger,
  MobileInputModal,
  modalInputStyles,
} from "./MobileInputShared";

interface TextInputProps extends RNTextInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  inputTitle?: string; // Custom title for the modal
  maxLength?: number; // Maximum text length
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoCorrect?: boolean;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad" | "url";
}

export const TextInput = ({
  value,
  onChangeText,
  placeholder,
  inputTitle = "Enter Text",
  maxLength,
  autoCapitalize = "sentences",
  autoCorrect = true,
  keyboardType = "default",
  ...rest
}: TextInputProps) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const textColor = useThemeColor({}, "text");
  const borderColor = useThemeColor({}, "icon");
  const placeholderTextColor = useThemeColor({}, "tabIconDefault");
  const inputRef = useRef<RNTextInput>(null);
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

  const handleTextChange = (text: string) => {
    setTempValue(text);
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
          accessibilityLabel={`Current text: ${value || placeholder}. Tap to edit.`}
        />

        <MobileInputModal
          visible={modalVisible}
          inputTitle={inputTitle}
          onClose={handleCancel}
          onConfirm={handleConfirm}
        >
          <RNTextInput
            ref={inputRef}
            style={[
              modalInputStyles.modalInput,
              {
                color: textColor,
                borderColor: borderColor,
              },
            ]}
            value={tempValue}
            onChangeText={handleTextChange}
            keyboardType={keyboardType}
            placeholder={placeholder}
            placeholderTextColor={placeholderTextColor}
            selectTextOnFocus={true}
            returnKeyType="done"
            onSubmitEditing={handleConfirm}
            maxLength={maxLength}
            autoCapitalize={autoCapitalize}
            autoCorrect={autoCorrect}
            multiline={false}
            {...rest}
          />
        </MobileInputModal>
      </>
    );
  }

  // Desktop Web: Show inline input (original behavior)
  return (
    <Input variant="outline" size="md" style={{ borderColor: borderColor }}>
      <InputField
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        style={{ color: textColor }}
        {...rest}
      />
    </Input>
  );
};
