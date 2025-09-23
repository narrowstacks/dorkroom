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
} from '@gluestack-ui/themed';
import { ThemedSelect } from '@/components/ui/select/ThemedSelect';
import { DimensionInputGroup } from '@/components/ui/forms';
import { RotateCwSquare, Proportions } from 'lucide-react-native';
import { ASPECT_RATIOS, PAPER_SIZES } from '@/constants/border';

interface PaperSizeModalProps {
  isVisible: boolean;
  onClose: () => void;
  aspectRatio: string;
  setAspectRatio: (value: string) => void;
  customAspectWidth: number;
  setCustomAspectWidth: (value: string) => void;
  customAspectHeight: number;
  setCustomAspectHeight: (value: string) => void;
  paperSize: string;
  setPaperSize: (value: string) => void;
  customPaperWidth: number;
  setCustomPaperWidth: (value: string) => void;
  customPaperHeight: number;
  setCustomPaperHeight: (value: string) => void;
  isLandscape: boolean;
  setIsLandscape: (value: boolean) => void;
  isRatioFlipped: boolean;
  setIsRatioFlipped: (value: boolean) => void;
}

export const PaperSizeModal: React.FC<PaperSizeModalProps> = ({
  isVisible,
  onClose,
  aspectRatio,
  setAspectRatio,
  customAspectWidth,
  setCustomAspectWidth,
  customAspectHeight,
  setCustomAspectHeight,
  paperSize,
  setPaperSize,
  customPaperWidth,
  setCustomPaperWidth,
  customPaperHeight,
  setCustomPaperHeight,
  isLandscape,
  setIsLandscape,
  isRatioFlipped,
  setIsRatioFlipped,
}) => {
  return (
    <Modal isOpen={isVisible} onClose={onClose} size="lg">
      <ModalBackdrop />
      <ModalContent>
        <ModalHeader>
          <Heading size="lg">Paper & Image Size</Heading>
          <ModalCloseButton>
            <Icon as={CloseIcon} />
          </ModalCloseButton>
        </ModalHeader>

        <ModalBody>
          <VStack space="lg">
            {/* Aspect Ratio Section */}
            <VStack space="md">
              <ThemedSelect
                label="Aspect Ratio:"
                selectedValue={aspectRatio}
                onValueChange={setAspectRatio}
                items={ASPECT_RATIOS as any}
                placeholder="Select Aspect Ratio"
              />

              {aspectRatio === 'custom' && (
                <DimensionInputGroup
                  widthValue={String(customAspectWidth)}
                  onWidthChange={setCustomAspectWidth}
                  heightValue={String(customAspectHeight)}
                  onHeightChange={setCustomAspectHeight}
                  widthLabel="width:"
                  heightLabel="height:"
                  widthPlaceholder="Width"
                  heightPlaceholder="Height"
                  widthDefault="2"
                  heightDefault="3"
                />
              )}
            </VStack>

            {/* Paper Size Section */}
            <VStack space="md">
              <ThemedSelect
                label="Paper Size:"
                selectedValue={paperSize}
                onValueChange={setPaperSize}
                items={PAPER_SIZES as any}
                placeholder="Select Paper Size"
              />

              {paperSize === 'custom' && (
                <DimensionInputGroup
                  widthValue={String(customPaperWidth)}
                  onWidthChange={setCustomPaperWidth}
                  heightValue={String(customPaperHeight)}
                  onHeightChange={setCustomPaperHeight}
                  widthLabel="Width (inches):"
                  heightLabel="Height (inches):"
                  widthPlaceholder="Width"
                  heightPlaceholder="Height"
                  widthDefault="8"
                  heightDefault="10"
                />
              )}
            </VStack>

            {/* Orientation Controls */}
            <VStack space="sm">
              <Button
                onPress={() => setIsLandscape(!isLandscape)}
                variant="outline"
                action="primary"
                size="md"
              >
                <RotateCwSquare size={20} style={{ marginRight: 8 }} />
                <ButtonText>Flip Paper Orientation</ButtonText>
              </Button>

              <Button
                onPress={() => setIsRatioFlipped(!isRatioFlipped)}
                variant="outline"
                action="primary"
                size="md"
              >
                <Proportions size={20} style={{ marginRight: 8 }} />
                <ButtonText>Flip Aspect Ratio</ButtonText>
              </Button>
            </VStack>
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
