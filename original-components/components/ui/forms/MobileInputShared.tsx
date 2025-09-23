import React, { ReactNode } from 'react';
import { View, TouchableOpacity, Platform, SafeAreaView } from 'react-native';
import {
  Text,
  Button,
  ButtonText,
  ButtonIcon,
  HStack,
  VStack,
  Modal as GluestackModal,
  ModalBackdrop,
  ModalContent,
} from '@gluestack-ui/themed';
import { X, Check } from 'lucide-react-native';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useWindowDimensions } from '@/hooks/useWindowDimensions';

// Hook for detecting if mobile input should be used
export const useMobileInputDetection = () => {
  const { width } = useWindowDimensions();
  return Platform.OS !== 'web' || width < 768;
};

// Mobile input trigger button component
interface MobileInputTriggerProps {
  value: string;
  placeholder: string;
  onPress: () => void;
  style?: any;
  accessibilityLabel?: string;
}

export const MobileInputTrigger: React.FC<MobileInputTriggerProps> = ({
  value,
  placeholder,
  onPress,
  style,
  accessibilityLabel,
}) => {
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'icon');
  const placeholderTextColor = useThemeColor({}, 'tabIconDefault');

  const triggerStyles = [
    {
      borderWidth: 1,
      borderRadius: 5,
      paddingVertical: 8,
      paddingHorizontal: 10,
      minWidth: 65,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      borderColor: borderColor,
    },
    style,
  ];

  return (
    <TouchableOpacity
      style={triggerStyles}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel ||
        `Current value: ${value || placeholder}. Tap to edit.`
      }
    >
      <Text
        style={{
          fontSize: 14,
          textAlign: 'center' as const,
          color: value ? textColor : placeholderTextColor,
        }}
      >
        {value || placeholder}
      </Text>
    </TouchableOpacity>
  );
};

// Mobile input modal wrapper component
interface MobileInputModalProps {
  visible: boolean;
  inputTitle: string;
  onClose: () => void;
  onConfirm: () => void;
  children: ReactNode;
  extraContent?: ReactNode; // For number input steppers, etc.
}

export const MobileInputModal: React.FC<MobileInputModalProps> = ({
  visible,
  inputTitle,
  onClose,
  onConfirm,
  children,
  extraContent,
}) => {
  const textColor = useThemeColor({}, 'text');
  const cardBackground = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'icon');

  return (
    <GluestackModal isOpen={visible} onClose={onClose}>
      <ModalBackdrop />
      <ModalContent
        style={{
          backgroundColor: cardBackground,
          margin: 20,
          maxWidth: 400,
          width: '90%',
          alignSelf: 'center',
        }}
      >
        <SafeAreaView>
          <VStack space="lg" style={{ padding: 24 }}>
            {/* Header */}
            <View style={{ position: 'relative', alignItems: 'center' }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '600',
                  textAlign: 'center',
                  color: textColor,
                }}
              >
                {inputTitle}
              </Text>
              <TouchableOpacity
                onPress={onClose}
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  padding: 4,
                }}
              >
                <X size={20} color={textColor} />
              </TouchableOpacity>
            </View>

            {/* Input Section */}
            <VStack space="md" style={{ alignItems: 'center' }}>
              {children}
              {extraContent}
            </VStack>

            {/* Action Buttons */}
            <HStack space="md" style={{ justifyContent: 'center' }}>
              <Button
                variant="outline"
                onPress={onClose}
                style={{ borderColor: borderColor, flex: 1 }}
              >
                <ButtonText style={{ color: textColor }}>Cancel</ButtonText>
              </Button>
              <Button className="p-3" style={{ flex: 3 }} onPress={onConfirm}>
                <ButtonIcon as={Check} size="lg" />
                <ButtonText>Confirm</ButtonText>
              </Button>
            </HStack>
          </VStack>
        </SafeAreaView>
      </ModalContent>
    </GluestackModal>
  );
};

// Shared modal input styles
export const modalInputStyles = {
  modalInput: {
    borderWidth: 2,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 24,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
    minWidth: 120,
    backgroundColor: 'transparent',
  },
};
