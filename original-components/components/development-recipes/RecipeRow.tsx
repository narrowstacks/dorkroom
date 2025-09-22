import React from "react";
import { StyleSheet, TouchableOpacity, Platform } from "react-native";
import { Box, Text } from "@gluestack-ui/themed";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useWindowDimensions } from "@/hooks/useWindowDimensions";
import { formatTime } from "@/constants/developmentRecipes";
import { formatDilution } from "@/utils/dilutionUtils";
import { debugLog } from "@/utils/debugLogger";
import type { Film, Developer, Combination } from "@/api/dorkroom/types";

interface RecipeRowProps {
  combination: Combination;
  film: Film | undefined;
  developer: Developer | undefined;
  onPress: () => void;
  isEven: boolean;
}

export function RecipeRow({
  combination,
  film,
  developer,
  onPress,
  isEven,
}: RecipeRowProps) {
  const textColor = useThemeColor({}, "text");
  const developmentTint = useThemeColor({}, "developmentRecipesTint");
  const rowBackground = useThemeColor(
    {},
    isEven ? "cardBackground" : "background",
  );
  const { width } = useWindowDimensions();
  const isMobile = Platform.OS !== "web" || width <= 768;

  const filmName = film
    ? isMobile
      ? film.name
      : `${film.brand} ${film.name}`
    : "Unknown Film";

  // Get push/pull value
  const pushPullValue = combination.pushPull ?? 0;

  // Format push/pull value if present
  const pushPullDisplay =
    pushPullValue !== 0
      ? ` ${pushPullValue > 0 ? `+${pushPullValue}` : pushPullValue}`
      : null;

  const developerName = developer
    ? isMobile
      ? developer.name
      : `${developer.manufacturer} ${developer.name}`
    : "Unknown Developer";

  // Get dilution info
  const dilutionInfo = formatDilution(
    combination.customDilution ||
      developer?.dilutions.find((d) => d.id === combination.dilutionId)
        ?.dilution ||
      "Stock",
  );

  // Format temperature more compactly
  const isNonStandardTemp = combination.temperatureF !== 68;
  const tempDisplay = `${combination.temperatureF}°F${isNonStandardTemp ? " ⚠" : ""}`;

  // Debug logging for temperature display
  debugLog(
    "[RecipeRow] Rendering row for combination:",
    JSON.stringify({
      id: combination.id,
      temperatureF: combination.temperatureF,
      tempDisplay,
      isNonStandardTemp,
      uuid: combination.uuid,
    }),
  );

  return (
    <TouchableOpacity onPress={onPress}>
      <Box style={[styles.tableRow, { backgroundColor: rowBackground }]}>
        <Box style={styles.filmCell}>
          <Text
            style={[styles.filmText, { color: textColor }]}
            numberOfLines={1}
          >
            {filmName}
            {pushPullDisplay && (
              <Text style={{ color: developmentTint }}>{pushPullDisplay}</Text>
            )}
          </Text>
        </Box>

        <Box style={styles.developerCell}>
          <Text
            style={[styles.developerText, { color: textColor }]}
            numberOfLines={1}
          >
            {developerName}
          </Text>
        </Box>

        <Box style={styles.dilutionCell}>
          <Text
            style={[styles.paramText, { color: textColor }]}
            numberOfLines={1}
          >
            {dilutionInfo}
          </Text>
        </Box>

        <Box style={styles.tempCell}>
          <Text
            style={[
              styles.paramText,
              {
                color: isNonStandardTemp ? developmentTint : textColor,
              },
            ]}
          >
            {tempDisplay}
          </Text>
        </Box>

        <Box style={styles.isoCell}>
          <Text style={[styles.paramText, { color: textColor }]}>
            {combination.shootingIso}
          </Text>
        </Box>

        <Box style={styles.timeCell}>
          <Text style={[styles.paramText, { color: textColor }]}>
            {formatTime(combination.timeMinutes)}
          </Text>
        </Box>
      </Box>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Platform.OS === "web" ? 12 : 8,
    paddingHorizontal: Platform.OS === "web" ? 8 : 4,
    minHeight: Platform.OS === "web" ? 48 : 40,
  },
  filmCell: {
    flex: 2.5,
    paddingRight: 8,
  },
  filmText: {
    fontSize: Platform.OS === "web" ? 14 : 12,
    fontWeight: "600",
  },
  developerCell: {
    flex: 2,
    paddingRight: 8,
  },
  developerText: {
    fontSize: Platform.OS === "web" ? 13 : 11,
    fontWeight: "500",
  },
  timeCell: {
    flex: 1,
    paddingRight: 8,
    alignItems: "center",
  },
  tempCell: {
    flex: 1,
    paddingRight: 8,
    alignItems: "center",
  },
  isoCell: {
    flex: 0.8,
    paddingRight: 8,
    alignItems: "center",
  },
  dilutionCell: {
    flex: 1.2,
    paddingRight: 8,
    alignItems: "center",
  },
  paramText: {
    fontSize: Platform.OS === "web" ? 13 : 11,
    fontWeight: "500",
    textAlign: "center",
  },
});
