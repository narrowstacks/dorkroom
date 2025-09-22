import React from "react";
import { StyleSheet, TouchableOpacity, Platform } from "react-native";
import { Text } from "@gluestack-ui/themed";
import { ChevronUp, ChevronDown } from "lucide-react-native";
import { useThemeColor } from "@/hooks/useThemeColor";

interface TableHeaderProps {
  title: string;
  sortKey: string;
  currentSort: string;
  sortDirection: "asc" | "desc";
  onSort: (sortKey: string) => void;
}

export function TableHeader({
  title,
  sortKey,
  currentSort,
  sortDirection,
  onSort,
}: TableHeaderProps) {
  const textColor = useThemeColor({}, "text");
  const developmentTint = useThemeColor({}, "developmentRecipesTint");
  const isActive = currentSort === sortKey;

  // Define flex values to match the row cells
  const getHeaderStyle = () => {
    switch (sortKey) {
      case "filmName":
        return { flex: 2.5 };
      case "developerName":
        return { flex: 2 };
      case "timeMinutes":
        return { flex: 1 };
      case "temperatureF":
        return { flex: 1 };
      case "shootingIso":
        return { flex: 0.8 };
      case "dilution":
        return { flex: 1.2 };
      default:
        return { flex: 1 };
    }
  };

  return (
    <TouchableOpacity
      style={[styles.tableHeader, getHeaderStyle()]}
      onPress={() => onSort(sortKey)}
    >
      <Text
        style={[
          styles.tableHeaderText,
          { color: isActive ? developmentTint : textColor },
        ]}
      >
        {title}
      </Text>
      {isActive &&
        (sortDirection === "asc" ? (
          <ChevronUp
            size={12}
            color={developmentTint}
            style={styles.sortIcon}
          />
        ) : (
          <ChevronDown
            size={12}
            color={developmentTint}
            style={styles.sortIcon}
          />
        ))}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Platform.OS === "web" ? 8 : 4,
    paddingVertical: 4,
    justifyContent: "center",
  },
  tableHeaderText: {
    fontSize: Platform.OS === "web" ? 14 : 12,
    fontWeight: "600",
    marginRight: 4,
    textAlign: "center",
  },
  sortIcon: {
    marginLeft: 2,
  },
});
