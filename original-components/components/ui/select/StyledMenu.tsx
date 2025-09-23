import { useState } from 'react';
import {
  Button,
  ButtonText,
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalBody,
  VStack,
  Pressable,
  Text,
  Icon,
} from '@gluestack-ui/themed';
import { ChevronDownIcon } from '@/components/ui/icon';

interface StyledMenuProps {
  value: string;
  onValueChange: (value: string) => void;
  items: { label: string; value: string }[];
  placeholder?: string;
}

export function StyledMenu({
  value,
  onValueChange,
  items,
  placeholder = 'Select an option',
}: StyledMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedItem = items.find((item) => item.value === value);

  const handleItemSelect = (itemValue: string) => {
    onValueChange(itemValue);
    setIsOpen(false);
  };

  return (
    <>
      <Button
        variant="outline"
        onPress={() => setIsOpen(true)}
        className="h-12 justify-between px-4"
        style={{ minHeight: 48 }}
      >
        <ButtonText className="flex-1 text-left">
          {selectedItem?.label || placeholder}
        </ButtonText>
        <Icon as={ChevronDownIcon} size="sm" />
      </Button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <ModalBackdrop />
        <ModalContent className="max-h-[400px]">
          <ModalBody className="p-0">
            <VStack space="sm" className="w-full">
              {items.map((item) => (
                <Pressable
                  key={item.value}
                  onPress={() => handleItemSelect(item.value)}
                  className="p-4 hover:bg-gray-100 active:bg-gray-200"
                  style={{
                    backgroundColor:
                      item.value === value ? '#f3f4f6' : 'transparent',
                  }}
                >
                  <Text className="text-base">{item.label}</Text>
                </Pressable>
              ))}
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
