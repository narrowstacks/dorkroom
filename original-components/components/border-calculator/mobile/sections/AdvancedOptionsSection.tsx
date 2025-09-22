import React from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  ButtonIcon,
} from "@gluestack-ui/themed";
import { ToggleSwitch } from "@/components/ui/forms";
import { useThemeColor } from "@/hooks/useThemeColor";
import { X } from "lucide-react-native";

interface AdvancedOptionsSectionProps {
  onClose: () => void;
  showBlades: boolean;
  setShowBlades: (value: boolean) => void;
}

export const AdvancedOptionsSection: React.FC<AdvancedOptionsSectionProps> = ({
  onClose,
  showBlades,
  setShowBlades,
}) => {
  const backgroundColor = useThemeColor({}, "background");
  const borderColor = useThemeColor({}, "outline");
  const textColor = useThemeColor({}, "text");

  return (
    <Box
      style={{
        backgroundColor,
        borderTopWidth: 1,
        borderTopColor: borderColor,
        padding: 16,
        borderRadius: 8,
        marginTop: 16,
      }}
    >
      {/* Header with close button */}
      <HStack
        style={{
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <Heading size="lg">Advanced Options</Heading>
        <Button onPress={onClose} variant="outline" size="sm">
          <ButtonIcon as={X} />
        </Button>
      </HStack>

      <VStack space="lg">
        <Text style={{ fontSize: 16, color: textColor, textAlign: "center" }}>
          Configure advanced display and behavior options
        </Text>

        <ToggleSwitch
          label="Show Easel Blades:"
          value={showBlades}
          onValueChange={setShowBlades}
        />
      </VStack>
    </Box>
  );
};
