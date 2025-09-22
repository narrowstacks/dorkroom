import React from "react";
import { Platform } from "react-native";
import { Text } from "@gluestack-ui/themed";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useWindowDimensions } from "@/hooks/useWindowDimensions";

interface ResultsHeaderProps {
  totalItems: number;
  currentPage: number;
  totalPages: number;
  customRecipesCount: number;
  showCustomRecipes: boolean;
}

export function ResultsHeader({
  totalItems,
  currentPage,
  totalPages,
  customRecipesCount,
  showCustomRecipes,
}: ResultsHeaderProps) {
  const textColor = useThemeColor({}, "text");
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width > 768;

  return (
    <Text
      style={[
        {
          fontSize: 18,
          fontWeight: "600",
          marginBottom: 12,
          textAlign: isDesktop ? "left" : "center",
        },
        { color: textColor },
      ]}
    >
      {totalItems} Development Recipe
      {totalItems !== 1 ? "s" : ""}
      {totalPages > 1 && (
        <Text
          style={{
            fontSize: 14,
            fontWeight: "normal",
            color: textColor,
            opacity: 0.7,
          }}
        >
          {" "}
          (Page {currentPage} of {totalPages})
        </Text>
      )}
      {customRecipesCount > 0 && showCustomRecipes && (
        <Text
          style={{
            fontSize: 14,
            fontWeight: "normal",
            color: textColor,
            opacity: 0.7,
          }}
        >
          {" "}
          ({customRecipesCount} custom)
        </Text>
      )}
    </Text>
  );
}
