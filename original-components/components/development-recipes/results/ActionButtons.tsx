import React from "react";
import { Platform, TouchableOpacity } from "react-native";
import { Box, Text, HStack } from "@gluestack-ui/themed";
import { RefreshCw, Plus, Grid3X3, Table } from "lucide-react-native";
import { Spinner } from "@/components/ui/spinner";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useWindowDimensions } from "@/hooks/useWindowDimensions";

interface ActionButtonsProps {
  isLoading: boolean;
  customRecipesCount: number;
  showCustomRecipes: boolean;
  viewMode: "cards" | "table";
  onRefresh: () => void;
  onToggleCustomRecipes: () => void;
  onNewCustomRecipe: () => void;
  onToggleViewMode: () => void;
}

export function ActionButtons({
  isLoading,
  customRecipesCount,
  showCustomRecipes,
  viewMode,
  onRefresh,
  onToggleCustomRecipes,
  onNewCustomRecipe,
  onToggleViewMode,
}: ActionButtonsProps) {
  const developmentTint = useThemeColor({}, "developmentRecipesTint");
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width > 768;

  if (isDesktop) {
    return (
      <Box
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          zIndex: 1,
        }}
      >
        <HStack style={{ gap: 8, alignItems: "center" }}>
          <TouchableOpacity
            onPress={onToggleViewMode}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 8,
              borderRadius: 6,
              backgroundColor: "transparent",
              borderWidth: 1,
              borderColor: "currentColor",
              gap: 4,
            }}
          >
            {viewMode === "cards" ? (
              <Table size={14} color={developmentTint} />
            ) : (
              <Grid3X3 size={14} color={developmentTint} />
            )}
            <Text
              style={[
                {
                  fontSize: 12,
                  fontWeight: "500",
                },
                { color: developmentTint },
              ]}
            >
              {viewMode === "cards" ? "Table" : "Cards"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onRefresh}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 8,
              borderRadius: 6,
              backgroundColor: "transparent",
              borderWidth: 1,
              borderColor: "currentColor",
              gap: 4,
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              <Spinner size="small" color={developmentTint} />
            ) : (
              <RefreshCw size={14} color={developmentTint} />
            )}
            <Text
              style={[
                {
                  fontSize: 12,
                  fontWeight: "500",
                },
                {
                  color: developmentTint,
                  opacity: isLoading ? 0.5 : 1,
                },
              ]}
            >
              {isLoading ? "Loading..." : "Refresh"}
            </Text>
          </TouchableOpacity>

          {customRecipesCount > 0 && (
            <TouchableOpacity
              onPress={onToggleCustomRecipes}
              style={[
                {
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 8,
                  borderRadius: 6,
                  backgroundColor: showCustomRecipes
                    ? developmentTint
                    : "transparent",
                  borderWidth: 1,
                  borderColor: "currentColor",
                  gap: 4,
                },
              ]}
            >
              <Text
                style={[
                  {
                    fontSize: 12,
                    fontWeight: "500",
                  },
                  {
                    color: showCustomRecipes ? "#fff" : developmentTint,
                  },
                ]}
              >
                My Recipes
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={onNewCustomRecipe}
            style={[
              {
                flexDirection: "row",
                alignItems: "center",
                padding: 8,
                borderRadius: 6,
                backgroundColor: developmentTint,
                borderWidth: 1,
                borderColor: "currentColor",
                gap: 4,
              },
            ]}
          >
            <Plus size={14} color="#fff" />
            <Text
              style={[
                {
                  fontSize: 12,
                  fontWeight: "500",
                },
                { color: "#fff" },
              ]}
            >
              Add Recipe
            </Text>
          </TouchableOpacity>
        </HStack>
      </Box>
    );
  }

  // Mobile layout
  return (
    <Box
      style={{
        alignItems: "center",
        marginBottom: 16,
      }}
    >
      <HStack
        style={{
          gap: 12,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <TouchableOpacity
          onPress={onRefresh}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: "currentColor",
            gap: 6,
            minWidth: 120,
            justifyContent: "center",
          }}
          disabled={isLoading}
        >
          {isLoading ? (
            <Spinner size="small" color={developmentTint} />
          ) : (
            <RefreshCw size={16} color={developmentTint} />
          )}
          <Text
            style={[
              {
                fontSize: 14,
                fontWeight: "600",
              },
              {
                color: developmentTint,
                opacity: isLoading ? 0.5 : 1,
              },
            ]}
          >
            {isLoading ? "Loading..." : "Refresh"}
          </Text>
        </TouchableOpacity>

        {customRecipesCount > 0 && (
          <TouchableOpacity
            onPress={onToggleCustomRecipes}
            style={[
              {
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: "currentColor",
                gap: 6,
                minWidth: 120,
                justifyContent: "center",
                backgroundColor: showCustomRecipes
                  ? developmentTint
                  : "transparent",
              },
            ]}
          >
            <Text
              style={[
                {
                  fontSize: 14,
                  fontWeight: "600",
                },
                {
                  color: showCustomRecipes ? "#fff" : developmentTint,
                },
              ]}
            >
              My Recipes
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={onNewCustomRecipe}
          style={[
            {
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: "currentColor",
              gap: 6,
              minWidth: 120,
              justifyContent: "center",
              backgroundColor: developmentTint,
            },
          ]}
        >
          <Plus size={16} color="#fff" />
          <Text
            style={[
              {
                fontSize: 14,
                fontWeight: "600",
              },
              { color: "#fff" },
            ]}
          >
            Add Recipe
          </Text>
        </TouchableOpacity>
      </HStack>
    </Box>
  );
}
