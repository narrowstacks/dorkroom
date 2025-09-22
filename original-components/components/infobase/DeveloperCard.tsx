import React from "react";
import { Platform, StyleSheet, TouchableOpacity } from "react-native";
import {
  Box,
  Text,
  HStack,
  VStack,
  Badge,
  BadgeText,
} from "@gluestack-ui/themed";
import {
  Beaker,
  Calendar,
  AlertTriangle,
  Clock,
  Shield,
  FileText,
  Droplets,
} from "lucide-react-native";
import type { Developer } from "@/api/dorkroom/types";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useWindowDimensions } from "@/hooks/useWindowDimensions";
import {
  getBrandKey,
  getDeveloperTypeColor,
  getContrastingTextColor,
} from "@/constants/brands";
import { Colors } from "@/constants/Colors";

interface DeveloperCardProps {
  developer: Developer;
  onPress?: (developer: Developer) => void;
  variant?: "default" | "compact";
}

export function DeveloperCard({
  developer,
  onPress,
  variant = "default",
}: DeveloperCardProps) {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width > 768;

  const cardBackground = useThemeColor({}, "cardBackground");
  const textColor = useThemeColor({}, "text");
  const textSecondary = useThemeColor({}, "textSecondary");
  const borderColor = useThemeColor({}, "borderColor");
  const shadowColor = useThemeColor({}, "shadowColor");

  // Get brand color from theme
  const colorScheme =
    useThemeColor({}, "background") === "#fff" ? "light" : "dark";
  const brandKey = getBrandKey(developer.manufacturer);
  const brandColorKey = `${brandKey}BrandColor` as keyof typeof Colors.light;
  const brandColor =
    Colors[colorScheme][brandColorKey] || Colors[colorScheme].genericBrandColor;

  // Get type color
  const typeColor = getDeveloperTypeColor(developer.type);
  const typeTextColor = getContrastingTextColor(typeColor);

  const handlePress = () => {
    if (onPress) {
      onPress(developer);
    }
  };

  const cardStyle = {
    backgroundColor: cardBackground,
    borderColor,
    shadowColor,
    borderWidth: 1,
    borderRadius: 12,
    padding: variant === "compact" ? 12 : 16,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    ...(isDesktop && {
      maxWidth: variant === "compact" ? 280 : 320,
    }),
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return "N/A";
    }
  };

  const formatLifetime = (value: number | null | undefined, unit: string) => {
    if (!value) return "N/A";
    return `${value} ${unit}${value !== 1 ? "s" : ""}`;
  };

  const Component = onPress ? TouchableOpacity : Box;

  return (
    <Component
      style={cardStyle}
      onPress={onPress ? handlePress : undefined}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {/* Developer Name with Brand Badge */}
      <HStack space="sm" alignItems="center" style={styles.nameContainer}>
        <Box style={[styles.brandBadge, { backgroundColor: brandColor }]}>
          <Text
            style={[
              styles.brandText,
              { color: getContrastingTextColor(brandColor) },
            ]}
          >
            {developer.manufacturer}
          </Text>
        </Box>
        <Text
          style={[styles.developerName, { color: textColor }]}
          numberOfLines={1}
        >
          {developer.name}
        </Text>
        {developer.discontinued === 1 && (
          <Badge
            style={[styles.discontinuedBadge, { backgroundColor: "#ff6b6b" }]}
          >
            <AlertTriangle size={12} color="#fff" />
            <BadgeText style={styles.discontinuedText}>Discontinued</BadgeText>
          </Badge>
        )}
      </HStack>

      {/* Developer Details */}
      <VStack space="xs" style={styles.detailsContainer}>
        {/* Type and Film/Paper */}
        <HStack space="md" alignItems="center" style={styles.typeRow}>
          <Badge style={[styles.typeBadge, { backgroundColor: typeColor }]}>
            <BadgeText style={[styles.typeText, { color: typeTextColor }]}>
              {developer.type}
            </BadgeText>
          </Badge>

          <HStack space="xs" alignItems="center">
            <Beaker size={14} color={textSecondary} />
            <Text style={[styles.detailText, { color: textSecondary }]}>
              {developer.filmOrPaper}
            </Text>
          </HStack>
        </HStack>

        {/* Dilutions */}
        {developer.dilutions.length > 0 && (
          <HStack space="xs" alignItems="center">
            <Droplets size={12} color={textSecondary} />
            <Text style={[styles.smallDetailText, { color: textSecondary }]}>
              {developer.dilutions.length} dilution
              {developer.dilutions.length !== 1 ? "s" : ""} available
            </Text>
          </HStack>
        )}

        {/* Lifetimes */}
        {variant !== "compact" &&
          (developer.workingLifeHours || developer.stockLifeMonths) && (
            <VStack space="xs">
              {developer.workingLifeHours && (
                <HStack space="xs" alignItems="center">
                  <Clock size={12} color={textSecondary} />
                  <Text
                    style={[styles.smallDetailText, { color: textSecondary }]}
                  >
                    Working:{" "}
                    {formatLifetime(developer.workingLifeHours, "hour")}
                  </Text>
                </HStack>
              )}

              {developer.stockLifeMonths && (
                <HStack space="xs" alignItems="center">
                  <Shield size={12} color={textSecondary} />
                  <Text
                    style={[styles.smallDetailText, { color: textSecondary }]}
                  >
                    Stock: {formatLifetime(developer.stockLifeMonths, "month")}
                  </Text>
                </HStack>
              )}
            </VStack>
          )}

        {/* Notes */}
        {developer.notes && variant !== "compact" && (
          <Text
            style={[styles.description, { color: textSecondary }]}
            numberOfLines={2}
          >
            {developer.notes}
          </Text>
        )}

        {/* Date Added */}
        {variant !== "compact" && (
          <HStack space="xs" alignItems="center">
            <Calendar size={12} color={textSecondary} />
            <Text style={[styles.smallDetailText, { color: textSecondary }]}>
              Added {formatDate(developer.dateAdded)}
            </Text>
          </HStack>
        )}
      </VStack>

      {/* Additional Info Indicators */}
      <HStack space="md" style={styles.indicatorsRow}>
        {/* Safety Notes */}
        {developer.safetyNotes && (
          <HStack space="xs" alignItems="center">
            <Shield size={12} color="#ff6b6b" />
            <Text style={[styles.indicatorText, { color: "#ff6b6b" }]}>
              Safety
            </Text>
          </HStack>
        )}

        {/* Datasheet Available */}
        {developer.datasheetUrl && developer.datasheetUrl.length > 0 && (
          <HStack space="xs" alignItems="center">
            <FileText size={12} color={textSecondary} />
            <Text style={[styles.indicatorText, { color: textSecondary }]}>
              Datasheet
            </Text>
          </HStack>
        )}

        {/* Mixing Instructions */}
        {developer.mixingInstructions && (
          <HStack space="xs" alignItems="center">
            <Beaker size={12} color={textSecondary} />
            <Text style={[styles.indicatorText, { color: textSecondary }]}>
              Instructions
            </Text>
          </HStack>
        )}
      </HStack>
    </Component>
  );
}

const styles = StyleSheet.create({
  nameContainer: {
    marginBottom: 8,
  },
  brandBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexShrink: 1,
  },
  brandText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  discontinuedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  discontinuedText: {
    fontSize: 10,
    fontWeight: "500",
    color: "#fff",
  },
  developerName: {
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 20,
    flex: 1,
  },
  detailsContainer: {
    marginBottom: 8,
  },
  typeRow: {
    flexWrap: "wrap",
  },
  detailText: {
    fontSize: 13,
    fontWeight: "500",
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 11,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  smallDetailText: {
    fontSize: 11,
    fontWeight: "400",
  },
  indicatorsRow: {
    marginTop: 8,
    flexWrap: "wrap",
  },
  indicatorText: {
    fontSize: 10,
    fontWeight: "500",
  },
});

export default DeveloperCard;
