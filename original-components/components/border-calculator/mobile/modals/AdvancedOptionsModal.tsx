import React from 'react';
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Heading,
  Icon,
  CloseIcon,
  Button,
  ButtonText,
  HStack,
  VStack,
  Text,
} from '@gluestack-ui/themed';
import { ToggleSwitch } from '@/components/ui/forms';
import { useThemeColor } from '@/hooks/useThemeColor';

interface AdvancedOptionsModalProps {
  isVisible: boolean;
  onClose: () => void;
  showBlades: boolean;
  setShowBlades: (value: boolean) => void;
}

export const AdvancedOptionsModal: React.FC<AdvancedOptionsModalProps> = ({
  isVisible,
  onClose,
  showBlades,
  setShowBlades,
}) => {
  const textColor = useThemeColor({}, 'text');

  return (
    <Modal isOpen={isVisible} onClose={onClose} size="lg">
      <ModalBackdrop />
      <ModalContent>
        <ModalHeader>
          <Heading size="lg">Advanced Options</Heading>
          <ModalCloseButton>
            <Icon as={CloseIcon} />
          </ModalCloseButton>
        </ModalHeader>

        <ModalBody>
          <VStack space="lg">
            <Text
              style={{ fontSize: 16, color: textColor, textAlign: 'center' }}
            >
              Configure advanced display and behavior options
            </Text>

            <ToggleSwitch
              label="Show Easel Blades:"
              value={showBlades}
              onValueChange={setShowBlades}
            />
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack space="md" style={{ justifyContent: 'flex-end' }}>
            <Button
              variant="outline"
              size="sm"
              action="secondary"
              onPress={onClose}
            >
              <ButtonText>Done</ButtonText>
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
