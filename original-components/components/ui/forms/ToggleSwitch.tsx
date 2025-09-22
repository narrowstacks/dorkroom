import React from "react";
import { Platform, Switch } from "react-native";
import { HStack, Text } from "@gluestack-ui/themed";
import { useThemeColor } from "@/hooks/useThemeColor";

interface ToggleSwitchProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export const ToggleSwitch = ({
  label,
  value,
  onValueChange,
}: ToggleSwitchProps) => {
  const borderColor = useThemeColor({}, "icon");
  const tintColor = useThemeColor({}, "tint");

  return (
    <HStack sx={{ flexDirection: "row", alignItems: "center", gap: 16, mt: 8 }}>
      <Text sx={{ fontSize: 14, mb: Platform.OS === "web" ? 0 : 4 }}>
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: borderColor, true: tintColor }}
        thumbColor={value ? tintColor : "#f4f3f4"}
      />
    </HStack>
  );
};
