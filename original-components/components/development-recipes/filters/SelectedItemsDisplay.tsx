import React from "react";
import { TouchableOpacity } from "react-native";
import { Box, Text, HStack } from "@gluestack-ui/themed";
import { X } from "lucide-react-native";
import { useThemeColor } from "@/hooks/useThemeColor";
import type { Film, Developer } from "@/api/dorkroom/types";

interface SelectedItemsDisplayProps {
  selectedFilm: Film | null;
  selectedDeveloper: Developer | null;
  onClearAll: () => void;
  onClearFilm: () => void;
  onClearDeveloper: () => void;
}

export function SelectedItemsDisplay({
  selectedFilm,
  selectedDeveloper,
  onClearAll,
  onClearFilm,
  onClearDeveloper,
}: SelectedItemsDisplayProps) {
  const textColor = useThemeColor({}, "text");
  const developmentTint = useThemeColor({}, "developmentRecipesTint");

  if (!selectedFilm && !selectedDeveloper) {
    return null;
  }

  return (
    <Box style={{ marginTop: 8 }}>
      <HStack
        space="sm"
        style={{
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <Text
          style={[
            { fontSize: 16, fontWeight: "600", marginBottom: 8 },
            { color: textColor },
          ]}
        >
          Selected:
        </Text>
        <TouchableOpacity onPress={onClearAll}>
          <Text
            style={[
              { fontSize: 14, fontWeight: "500" },
              { color: developmentTint },
            ]}
          >
            Clear All
          </Text>
        </TouchableOpacity>
      </HStack>

      {selectedFilm && (
        <Box
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            padding: 8,
            backgroundColor: "rgba(0,0,0,0.05)",
            borderRadius: 8,
            marginBottom: 4,
          }}
        >
          <Text style={[{ fontSize: 14, flex: 1 }, { color: textColor }]}>
            Film: {selectedFilm.brand} {selectedFilm.name}
          </Text>
          <TouchableOpacity onPress={onClearFilm}>
            <X size={16} color={textColor} />
          </TouchableOpacity>
        </Box>
      )}

      {selectedDeveloper && (
        <Box
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            padding: 8,
            backgroundColor: "rgba(0,0,0,0.05)",
            borderRadius: 8,
            marginBottom: 4,
          }}
        >
          <Text style={[{ fontSize: 14, flex: 1 }, { color: textColor }]}>
            Developer: {selectedDeveloper.manufacturer} {selectedDeveloper.name}
          </Text>
          <TouchableOpacity onPress={onClearDeveloper}>
            <X size={16} color={textColor} />
          </TouchableOpacity>
        </Box>
      )}
    </Box>
  );
}
