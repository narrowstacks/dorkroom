import React from "react";
import { TouchableOpacity } from "react-native";
import { Box, HStack, Text } from "@gluestack-ui/themed";
import { ChevronRight } from "lucide-react-native";
import { useThemeColor } from "@/hooks/useThemeColor";

interface SettingsButtonProps {
  label?: string | null;
  value?: string | null;
  onPress: () => void;
  icon?: React.ComponentType<any>;
  showChevron?: boolean;
  centerLabel?: boolean;
}

export const SettingsButton: React.FC<SettingsButtonProps> = ({
  label,
  value,
  onPress,
  icon: IconComponent,
  showChevron = true,
  centerLabel = false,
}) => {
  const cardBackground = useThemeColor({}, "cardBackground");
  const textColor = useThemeColor({}, "text");
  const outline = useThemeColor({}, "outline");
  const tintColor = useThemeColor({}, "tint");

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Box
        style={{
          backgroundColor: cardBackground,
          borderColor: outline,
          borderWidth: 1,
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
          minHeight: 56,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <HStack
          style={{
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
          }}
        >
          {/* Left side - Icon */}
          {IconComponent && (
            <IconComponent
              size={20}
              color={tintColor}
              style={{ marginRight: 12 }}
            />
          )}

          {/* Center - Label and Value */}
          <HStack
            style={{
              flex: 1,
              paddingHorizontal: centerLabel ? 0 : 8,
              justifyContent: centerLabel ? "center" : "space-between",
              alignItems: "center",
            }}
          >
            {label && (
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "500",
                  color: textColor,
                  textAlign: centerLabel ? "center" : "left",
                  lineHeight: 20,
                  flex: centerLabel ? 1 : 1,
                  flexShrink: 1,
                }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {label}
              </Text>
            )}
            {value && !centerLabel && (
              <Text
                style={{
                  fontSize: 14,
                  color: tintColor,
                  fontWeight: "500",
                  textAlign: "right",
                  lineHeight: 16,
                  marginLeft: 8,
                  flexShrink: 0,
                  minWidth: 60,
                }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {value}
              </Text>
            )}
          </HStack>

          {/* Right side - Chevron */}
          {showChevron && (
            <ChevronRight
              size={20}
              color={tintColor}
              style={{ marginLeft: 12 }}
            />
          )}
        </HStack>
      </Box>
    </TouchableOpacity>
  );
};
