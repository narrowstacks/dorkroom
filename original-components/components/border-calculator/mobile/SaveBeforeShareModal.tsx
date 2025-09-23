import React, { useState } from 'react';
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Heading,
  Text,
  Button,
  ButtonText,
  HStack,
  VStack,
  Icon,
  CloseIcon,
  useToast,
  Toast,
  ToastTitle,
  VStack as ToastVStack,
} from '@gluestack-ui/themed';
import { TextInput } from '@/components/ui/forms/TextInput';
import type { BorderPresetSettings } from '@/types/borderPresetTypes';

interface SaveBeforeShareModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSaveAndShare: (presetName: string) => void;
  currentSettings: BorderPresetSettings;
}

export const SaveBeforeShareModal: React.FC<SaveBeforeShareModalProps> = ({
  isVisible,
  onClose,
  onSaveAndShare,
  currentSettings,
}) => {
  const [presetName, setPresetName] = useState('');
  const toast = useToast();

  const handleSaveAndShare = () => {
    if (!presetName.trim()) {
      toast.show({
        placement: 'top',
        render: ({ id }) => (
          <Toast nativeID={`toast-${id}`} action="error" variant="solid">
            <ToastVStack space="xs">
              <ToastTitle>Please enter a name for the preset.</ToastTitle>
            </ToastVStack>
          </Toast>
        ),
      });
      return;
    }

    onSaveAndShare(presetName.trim());
    setPresetName('');
    onClose();
  };

  const handleClose = () => {
    setPresetName('');
    onClose();
  };

  return (
    <Modal isOpen={isVisible} onClose={handleClose}>
      <ModalBackdrop />
      <ModalContent>
        <ModalHeader>
          <Heading size="lg">Save Preset to Share</Heading>
          <ModalCloseButton>
            <Icon as={CloseIcon} />
          </ModalCloseButton>
        </ModalHeader>
        <ModalBody>
          <VStack space="md">
            <Text>
              To share these settings, you must first save them as a named
              preset.
            </Text>
            <TextInput
              value={presetName}
              onChangeText={setPresetName}
              placeholder="Enter preset name"
              inputTitle="Preset Name"
            />
          </VStack>
        </ModalBody>
        <ModalFooter>
          <HStack space="sm" style={{ justifyContent: 'flex-end' }}>
            <Button variant="outline" onPress={handleClose}>
              <ButtonText>Cancel</ButtonText>
            </Button>
            <Button
              variant="solid"
              action="positive"
              onPress={handleSaveAndShare}
            >
              <ButtonText>Save & Share</ButtonText>
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
