import React from "react";
import { HStack, Button, ButtonText, ButtonIcon } from "@gluestack-ui/themed";
import { Copy, Share2, Bookmark } from "lucide-react-native";

interface ActionButtonsProps {
  onCopyResults: () => void;
  onShare: () => void;
  onSavePreset: () => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  onCopyResults,
  onShare,
  onSavePreset,
}) => {
  return (
    <HStack
      space="md"
      style={{
        justifyContent: "space-between",
        width: "100%",
        paddingHorizontal: 4,
        marginTop: 16,
      }}
    >
      <Button
        onPress={onCopyResults}
        variant="solid"
        action="primary"
        size="md"
        style={{ flex: 1, maxWidth: 120 }}
      >
        <ButtonIcon as={Copy} size="sm" />
        <ButtonText style={{ fontSize: 14, marginLeft: 6 }}>Copy</ButtonText>
      </Button>

      <Button
        onPress={onShare}
        variant="solid"
        action="primary"
        size="md"
        style={{ flex: 1, maxWidth: 120 }}
      >
        <ButtonIcon as={Share2} size="sm" />
        <ButtonText style={{ fontSize: 14, marginLeft: 6 }}>Share</ButtonText>
      </Button>

      <Button
        onPress={onSavePreset}
        variant="solid"
        action="positive"
        size="md"
        style={{ flex: 1, maxWidth: 120 }}
      >
        <ButtonIcon as={Bookmark} size="sm" />
        <ButtonText style={{ fontSize: 14, marginLeft: 6 }}>Preset</ButtonText>
      </Button>
    </HStack>
  );
};
