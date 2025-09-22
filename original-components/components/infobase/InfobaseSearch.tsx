import React from "react";
import {
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { Box } from "@gluestack-ui/themed";
import { Search, X } from "lucide-react-native";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useWindowDimensions } from "@/hooks/useWindowDimensions";

interface InfobaseSearchProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
  disabled?: boolean;
}

export function InfobaseSearch({
  value,
  onChangeText,
  placeholder = "Search...",
  onClear,
  disabled = false,
}: InfobaseSearchProps) {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width > 768;

  const textColor = useThemeColor({}, "text");
  const textSecondary = useThemeColor({}, "textSecondary");
  const inputBackground = useThemeColor({}, "inputBackground");
  const borderColor = useThemeColor({}, "borderColor");
  const cardBackground = useThemeColor({}, "cardBackground");

  const handleClear = () => {
    onChangeText("");
    if (onClear) {
      onClear();
    }
  };

  const containerStyle = {
    backgroundColor: cardBackground,
    borderColor,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 4,
    paddingVertical: 4,
    ...(disabled && {
      opacity: 0.6,
    }),
  };

  const inputStyle = {
    flex: 1,
    height: isDesktop ? 44 : 48,
    backgroundColor: inputBackground,
    borderRadius: 8,
    paddingLeft: 40,
    paddingRight: value ? 40 : 12,
    fontSize: isDesktop ? 14 : 16,
    color: textColor,
    borderWidth: 0,
    outline: "none" as any, // Web-specific
  };

  const iconStyle = {
    position: "absolute" as const,
    left: 12,
    top: "50%" as any, // Web-specific percentage positioning
    transform: [{ translateY: -10 }],
    zIndex: 1,
  };

  const clearButtonStyle = {
    position: "absolute" as const,
    right: 8,
    top: "50%" as any, // Web-specific percentage positioning
    transform: [{ translateY: -12 }],
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.1)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    zIndex: 1,
  };

  return (
    <Box style={containerStyle}>
      <Box style={styles.searchInputContainer}>
        {/* Search Icon */}
        <Box style={iconStyle}>
          <Search size={20} color={textSecondary} />
        </Box>

        {/* Text Input */}
        <TextInput
          style={inputStyle}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={textSecondary}
          editable={!disabled}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="never" // We'll handle this ourselves
        />

        {/* Clear Button */}
        {value.length > 0 && !disabled && (
          <TouchableOpacity
            style={clearButtonStyle}
            onPress={handleClear}
            activeOpacity={0.7}
          >
            <X size={14} color={textSecondary} />
          </TouchableOpacity>
        )}
      </Box>
    </Box>
  );
}

const styles = StyleSheet.create({
  searchInputContainer: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
  },
});

export default InfobaseSearch;
