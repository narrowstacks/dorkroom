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
import { LabeledSliderInput, ToggleSwitch } from '@/components/ui/forms';
import { WarningAlert } from '@/components/ui/feedback';
import { useThemeColor } from '@/hooks/useThemeColor';
import {
  OFFSET_SLIDER_MIN,
  OFFSET_SLIDER_MAX,
  OFFSET_SLIDER_STEP,
  OFFSET_SLIDER_LABELS,
} from '@/constants/borderCalc';

interface PositionOffsetsModalProps {
  isVisible: boolean;
  onClose: () => void;
  enableOffset: boolean;
  setEnableOffset: (value: boolean) => void;
  ignoreMinBorder: boolean;
  setIgnoreMinBorder: (value: boolean) => void;
  horizontalOffset: number;
  setHorizontalOffset: (value: number) => void;
  verticalOffset: number;
  setVerticalOffset: (value: number) => void;
  offsetWarning: string | null;
}

export const PositionOffsetsModal: React.FC<PositionOffsetsModalProps> = ({
  isVisible,
  onClose,
  enableOffset,
  setEnableOffset,
  ignoreMinBorder,
  setIgnoreMinBorder,
  horizontalOffset,
  setHorizontalOffset,
  verticalOffset,
  setVerticalOffset,
  offsetWarning,
}) => {
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'icon');
  const tintColor = useThemeColor({}, 'tint');

  return (
    <Modal isOpen={isVisible} onClose={onClose} size="lg">
      <ModalBackdrop />
      <ModalContent>
        <ModalHeader>
          <Heading size="lg">Position & Offsets</Heading>
          <ModalCloseButton>
            <Icon as={CloseIcon} />
          </ModalCloseButton>
        </ModalHeader>

        <ModalBody>
          <VStack space="lg">
            <Text
              style={{ fontSize: 16, color: textColor, textAlign: 'center' }}
            >
              Control image positioning and offset behavior
            </Text>

            {/* Enable Offsets Toggle */}
            <ToggleSwitch
              label="Enable Offsets:"
              value={enableOffset}
              onValueChange={setEnableOffset}
            />

            {enableOffset && (
              <VStack space="lg">
                {/* Ignore Min Border */}
                <VStack space="sm">
                  <ToggleSwitch
                    label="Ignore Min Border:"
                    value={ignoreMinBorder}
                    onValueChange={setIgnoreMinBorder}
                  />
                  {ignoreMinBorder && (
                    <Text
                      style={{ fontSize: 14, color: textColor, lineHeight: 20 }}
                    >
                      Print can be positioned freely but will stay within paper
                      edges
                    </Text>
                  )}
                </VStack>

                {/* Offset Controls */}
                <VStack space="md">
                  <LabeledSliderInput
                    label="Horizontal Offset:"
                    value={horizontalOffset}
                    onChange={(v) => {
                      const parsed = parseFloat(v);
                      setHorizontalOffset(isNaN(parsed) ? 0 : parsed);
                    }}
                    min={OFFSET_SLIDER_MIN}
                    max={OFFSET_SLIDER_MAX}
                    step={OFFSET_SLIDER_STEP}
                    labels={OFFSET_SLIDER_LABELS}
                    textColor={textColor}
                    borderColor={borderColor}
                    tintColor={tintColor}
                    warning={!!offsetWarning}
                    continuousUpdate={true}
                  />

                  <LabeledSliderInput
                    label="Vertical Offset:"
                    value={verticalOffset}
                    onChange={(v) => {
                      const parsed = parseFloat(v);
                      setVerticalOffset(isNaN(parsed) ? 0 : parsed);
                    }}
                    min={OFFSET_SLIDER_MIN}
                    max={OFFSET_SLIDER_MAX}
                    step={OFFSET_SLIDER_STEP}
                    labels={OFFSET_SLIDER_LABELS}
                    textColor={textColor}
                    borderColor={borderColor}
                    tintColor={tintColor}
                    warning={!!offsetWarning}
                    continuousUpdate={true}
                  />
                </VStack>

                {offsetWarning && (
                  <WarningAlert message={offsetWarning} action="warning" />
                )}
              </VStack>
            )}
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
