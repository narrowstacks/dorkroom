import React from "react";
import { Platform, TextInput } from "react-native";
import { useThemeColor } from "@/hooks/useThemeColor";

type StyledTextInputProps = React.ComponentProps<typeof TextInput>;

export const StyledTextInput = (props: StyledTextInputProps) => {
  const textColor = useThemeColor({}, "text");
  const borderColor = useThemeColor({}, "icon");

  return (
    <TextInput
      style={{
        height: 40,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        fontSize: 16,
        marginBottom: 4,
        color: textColor,
        borderColor,
      }}
      placeholderTextColor={borderColor}
      keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
      {...props}
    />
  );
};
