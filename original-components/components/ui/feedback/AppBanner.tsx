import React from "react";
import {
  Box,
  Text,
  Button,
  ButtonText,
  ButtonIcon,
  HStack,
  VStack,
} from "@gluestack-ui/themed";
import { Smartphone, X } from "lucide-react-native";
import { useThemeColor } from "@/hooks/useThemeColor";

interface AppBannerProps {
  message: string;
  onOpenApp: () => void;
  onDismiss: () => void;
  isVisible: boolean;
}

export const AppBanner: React.FC<AppBannerProps> = ({
  message,
  onOpenApp,
  onDismiss,
  isVisible,
}) => {
  const backgroundColor = useThemeColor({}, "tint");
  const textColor = useThemeColor({}, "background");

  if (!isVisible) return null;

  return (
    <Box
      style={{
        backgroundColor,
        padding: 12,
        margin: 16,
        borderRadius: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}
    >
      <HStack
        space="md"
        style={{ alignItems: "center", justifyContent: "space-between" }}
      >
        <HStack space="sm" style={{ alignItems: "center", flex: 1 }}>
          <ButtonIcon as={Smartphone} size="sm" style={{ color: textColor }} />
          <VStack style={{ flex: 1 }}>
            <Text
              style={{
                color: textColor,
                fontSize: 14,
                fontWeight: "600",
                flexWrap: "wrap",
              }}
            >
              {message}
            </Text>
          </VStack>
        </HStack>

        <HStack space="xs">
          <Button
            onPress={onOpenApp}
            variant="outline"
            size="xs"
            style={{
              borderColor: textColor,
              backgroundColor: "transparent",
            }}
          >
            <ButtonText style={{ color: textColor, fontSize: 12 }}>
              Open App
            </ButtonText>
          </Button>

          <Button
            onPress={onDismiss}
            variant="outline"
            size="xs"
            style={{
              borderColor: textColor,
              backgroundColor: "transparent",
              minWidth: 32,
              paddingHorizontal: 8,
            }}
          >
            <ButtonIcon as={X} size="xs" style={{ color: textColor }} />
          </Button>
        </HStack>
      </HStack>
    </Box>
  );
};
