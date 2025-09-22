import React from "react";
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
} from "@gluestack-ui/themed";
import { LabeledSliderInput } from "@/components/ui/forms";
import { WarningAlert } from "@/components/ui/feedback";
import { useThemeColor } from "@/hooks/useThemeColor";
import {
  SLIDER_MIN_BORDER,
  SLIDER_MAX_BORDER,
  SLIDER_STEP_BORDER,
  BORDER_SLIDER_LABELS,
} from "@/constants/borderCalc";

interface BorderSizeModalProps {
  isVisible: boolean;
  onClose: () => void;
  minBorder: number;
  setMinBorder: (value: number) => void;
  minBorderWarning: string | null;
}

export const BorderSizeModal: React.FC<BorderSizeModalProps> = ({
  isVisible,
  onClose,
  minBorder,
  setMinBorder,
  minBorderWarning,
}) => {
  const textColor = useThemeColor({}, "text");
  const borderColor = useThemeColor({}, "icon");
  const tintColor = useThemeColor({}, "tint");

  return (
    <Modal isOpen={isVisible} onClose={onClose} size="lg">
      <ModalBackdrop />
      <ModalContent>
        <ModalHeader>
          <Heading size="lg">Border Size</Heading>
          <ModalCloseButton>
            <Icon as={CloseIcon} />
          </ModalCloseButton>
        </ModalHeader>

        <ModalBody>
          <VStack space="lg">
            <Text
              style={{ fontSize: 16, color: textColor, textAlign: "center" }}
            >
              Set the minimum border size for your print
            </Text>

            <LabeledSliderInput
              label="Minimum Border (inches):"
              value={minBorder}
              onChange={(v) => {
                const parsed = parseFloat(v);
                setMinBorder(isNaN(parsed) ? 0 : parsed);
              }}
              min={SLIDER_MIN_BORDER}
              max={SLIDER_MAX_BORDER}
              step={SLIDER_STEP_BORDER}
              labels={BORDER_SLIDER_LABELS}
              textColor={textColor}
              borderColor={borderColor}
              tintColor={tintColor}
              continuousUpdate={true}
            />

            {minBorderWarning && (
              <WarningAlert message={minBorderWarning} action="error" />
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack space="md" style={{ justifyContent: "flex-end" }}>
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
