import React from "react";
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from "react-native";
import {
  Box,
  Text,
  VStack,
  HStack,
  Badge,
  BadgeText,
} from "@gluestack-ui/themed";
import {
  X,
  Beaker,
  Calendar,
  AlertTriangle,
  Clock,
  Shield,
  FileText,
  Droplets,
  Info,
  ExternalLink,
  Package,
  Layers,
} from "lucide-react-native";
import type { Developer } from "@/api/dorkroom/types";
import { useThemeColor } from "@/hooks/useThemeColor";
import {
  getBrandKey,
  getDeveloperTypeColor,
  getContrastingTextColor,
} from "@/constants/brands";
import { Colors } from "@/constants/Colors";

interface DeveloperDetailPanelProps {
  developer: Developer | null;
  onClose?: () => void;
}

export function DeveloperDetailPanel({
  developer,
  onClose,
}: DeveloperDetailPanelProps) {
  const cardBackground = useThemeColor({}, "cardBackground");
  const textColor = useThemeColor({}, "text");
  const textSecondary = useThemeColor({}, "textSecondary");
  const borderColor = useThemeColor({}, "borderColor");
  const infobaseTint = useThemeColor({}, "infobaseTint");
  const backgroundColor = useThemeColor({}, "background");

  if (!developer) {
    return (
      <Box
        style={[
          styles.container,
          { backgroundColor: cardBackground, borderLeftColor: borderColor },
        ]}
      >
        <Box style={styles.emptyState}>
          <Info size={48} color={textSecondary} />
          <Text style={[styles.emptyTitle, { color: textColor }]}>
            Select a Developer
          </Text>
          <Text style={[styles.emptySubtitle, { color: textSecondary }]}>
            Choose a developer from the list to view detailed information
          </Text>
        </Box>
      </Box>
    );
  }

  // Get brand color from theme
  const colorScheme = backgroundColor === "#fff" ? "light" : "dark";
  const brandKey = getBrandKey(developer.manufacturer);
  const brandColorKey = `${brandKey}BrandColor` as keyof typeof Colors.light;
  const brandColor =
    Colors[colorScheme][brandColorKey] || Colors[colorScheme].genericBrandColor;

  // Get type color
  const typeColor = getDeveloperTypeColor(developer.type);
  const typeTextColor = getContrastingTextColor(typeColor);

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

  const handleDatasheetPress = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error("Error opening datasheet URL:", error);
    }
  };

  return (
    <Box
      style={[
        styles.container,
        { backgroundColor: cardBackground, borderLeftColor: borderColor },
      ]}
    >
      {/* Header */}
      <Box style={[styles.header, { borderBottomColor: borderColor }]}>
        <HStack
          space="md"
          alignItems="flex-start"
          justifyContent="space-between"
        >
          <Box style={{ flex: 1 }}>
            <Text
              style={[styles.title, { color: textColor }]}
              numberOfLines={2}
            >
              {developer.name}
            </Text>
            <Text style={[styles.subtitle, { color: textSecondary }]}>
              {developer.manufacturer}
            </Text>
          </Box>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color={textSecondary} />
            </TouchableOpacity>
          )}
        </HStack>
      </Box>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand and Status */}
        <VStack space="md" style={styles.section}>
          <HStack space="sm" alignItems="center" style={{ flexWrap: "wrap" }}>
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

            <Badge style={[styles.typeBadge, { backgroundColor: typeColor }]}>
              <BadgeText style={[styles.typeText, { color: typeTextColor }]}>
                {developer.type}
              </BadgeText>
            </Badge>

            {developer.discontinued === 1 && (
              <Badge
                style={[
                  styles.discontinuedBadge,
                  { backgroundColor: "#ff6b6b" },
                ]}
              >
                <AlertTriangle size={12} color="#fff" />
                <BadgeText style={styles.discontinuedText}>
                  Discontinued
                </BadgeText>
              </Badge>
            )}
          </HStack>
        </VStack>

        {/* Basic Information */}
        <VStack space="md" style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            Basic Information
          </Text>

          <VStack space="sm">
            <HStack space="sm" alignItems="center">
              <Package size={16} color={textSecondary} />
              <Text style={[styles.detailLabel, { color: textSecondary }]}>
                Type:
              </Text>
              <Text style={[styles.detailValue, { color: textColor }]}>
                {developer.type}
              </Text>
            </HStack>

            <HStack space="sm" alignItems="center">
              <Beaker size={16} color={textSecondary} />
              <Text style={[styles.detailLabel, { color: textSecondary }]}>
                For:
              </Text>
              <Text style={[styles.detailValue, { color: textColor }]}>
                {developer.filmOrPaper}
              </Text>
            </HStack>

            <HStack space="sm" alignItems="center">
              <Calendar size={16} color={textSecondary} />
              <Text style={[styles.detailLabel, { color: textSecondary }]}>
                Date Added:
              </Text>
              <Text style={[styles.detailValue, { color: textColor }]}>
                {formatDate(developer.dateAdded)}
              </Text>
            </HStack>
          </VStack>
        </VStack>

        {/* Dilutions */}
        {developer.dilutions.length > 0 && (
          <VStack space="md" style={styles.section}>
            <HStack space="sm" alignItems="center">
              <Droplets size={16} color={textColor} />
              <Text style={[styles.sectionTitle, { color: textColor }]}>
                Available Dilutions
              </Text>
            </HStack>

            <VStack space="sm">
              {developer.dilutions.map((dilution, index) => (
                <Box
                  key={dilution.id}
                  style={[
                    styles.dilutionCard,
                    { backgroundColor: cardBackground, borderColor },
                  ]}
                >
                  <HStack
                    space="sm"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Text style={[styles.dilutionName, { color: textColor }]}>
                      {dilution.name}
                    </Text>
                    <Badge
                      style={[
                        styles.dilutionBadge,
                        { backgroundColor: infobaseTint },
                      ]}
                    >
                      <BadgeText
                        style={[styles.dilutionText, { color: "#fff" }]}
                      >
                        {dilution.dilution}
                      </BadgeText>
                    </Badge>
                  </HStack>
                </Box>
              ))}
            </VStack>
          </VStack>
        )}

        {/* Lifetime Information */}
        {(developer.workingLifeHours || developer.stockLifeMonths) && (
          <VStack space="md" style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              Lifetime Information
            </Text>

            <VStack space="sm">
              {developer.workingLifeHours && (
                <HStack space="sm" alignItems="center">
                  <Clock size={16} color={textSecondary} />
                  <Text style={[styles.detailLabel, { color: textSecondary }]}>
                    Working Life:
                  </Text>
                  <Text style={[styles.detailValue, { color: textColor }]}>
                    {formatLifetime(developer.workingLifeHours, "hour")}
                  </Text>
                </HStack>
              )}

              {developer.stockLifeMonths && (
                <HStack space="sm" alignItems="center">
                  <Shield size={16} color={textSecondary} />
                  <Text style={[styles.detailLabel, { color: textSecondary }]}>
                    Stock Life:
                  </Text>
                  <Text style={[styles.detailValue, { color: textColor }]}>
                    {formatLifetime(developer.stockLifeMonths, "month")}
                  </Text>
                </HStack>
              )}
            </VStack>
          </VStack>
        )}

        {/* Notes */}
        {developer.notes && (
          <VStack space="md" style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              Notes
            </Text>
            <Text style={[styles.description, { color: textSecondary }]}>
              {developer.notes}
            </Text>
          </VStack>
        )}

        {/* Mixing Instructions */}
        {developer.mixingInstructions && (
          <VStack space="md" style={styles.section}>
            <HStack space="sm" alignItems="center">
              <Layers size={16} color={textColor} />
              <Text style={[styles.sectionTitle, { color: textColor }]}>
                Mixing Instructions
              </Text>
            </HStack>
            <Box
              style={[
                styles.instructionCard,
                { backgroundColor: cardBackground, borderColor },
              ]}
            >
              <Text style={[styles.description, { color: textSecondary }]}>
                {developer.mixingInstructions}
              </Text>
            </Box>
          </VStack>
        )}

        {/* Safety Notes */}
        {developer.safetyNotes && (
          <VStack space="md" style={styles.section}>
            <HStack space="sm" alignItems="center">
              <Shield size={16} color="#ff6b6b" />
              <Text style={[styles.sectionTitle, { color: "#ff6b6b" }]}>
                Safety Information
              </Text>
            </HStack>
            <Box
              style={[
                styles.safetyCard,
                { backgroundColor: "#fff5f5", borderColor: "#ff6b6b" },
              ]}
            >
              <Text style={[styles.description, { color: "#dc2626" }]}>
                {developer.safetyNotes}
              </Text>
            </Box>
          </VStack>
        )}

        {/* Datasheets */}
        {developer.datasheetUrl && developer.datasheetUrl.length > 0 && (
          <VStack space="md" style={styles.section}>
            <HStack space="sm" alignItems="center">
              <FileText size={16} color={textColor} />
              <Text style={[styles.sectionTitle, { color: textColor }]}>
                Datasheets
              </Text>
            </HStack>

            <VStack space="sm">
              {developer.datasheetUrl.map((url, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.datasheetCard,
                    { backgroundColor: cardBackground, borderColor },
                  ]}
                  onPress={() => handleDatasheetPress(url)}
                >
                  <HStack
                    space="sm"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Text
                      style={[styles.datasheetText, { color: infobaseTint }]}
                    >
                      View Datasheet {index + 1}
                    </Text>
                    <ExternalLink size={14} color={infobaseTint} />
                  </HStack>
                </TouchableOpacity>
              ))}
            </VStack>
          </VStack>
        )}

        {/* Technical IDs */}
        <VStack space="md" style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            Technical Information
          </Text>
          <VStack space="sm">
            <HStack space="sm" alignItems="center">
              <Info size={16} color={textSecondary} />
              <Text style={[styles.detailLabel, { color: textSecondary }]}>
                UUID:
              </Text>
              <Text
                style={[
                  styles.detailValue,
                  { color: textColor, fontFamily: "monospace", fontSize: 12 },
                ]}
              >
                {developer.uuid}
              </Text>
            </HStack>
            <HStack space="sm" alignItems="center">
              <Info size={16} color={textSecondary} />
              <Text style={[styles.detailLabel, { color: textSecondary }]}>
                Slug:
              </Text>
              <Text
                style={[
                  styles.detailValue,
                  { color: textColor, fontFamily: "monospace", fontSize: 12 },
                ]}
              >
                {developer.slug}
              </Text>
            </HStack>
          </VStack>
        </VStack>
      </ScrollView>
    </Box>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderLeftWidth: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 22,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "500",
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  brandBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  brandText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 11,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  discontinuedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
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
  detailLabel: {
    fontSize: 13,
    fontWeight: "500",
    minWidth: 90,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "400",
    flex: 1,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  dilutionCard: {
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  dilutionName: {
    fontSize: 13,
    fontWeight: "500",
  },
  dilutionBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  dilutionText: {
    fontSize: 11,
    fontWeight: "600",
  },
  instructionCard: {
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  safetyCard: {
    padding: 10,
    borderRadius: 6,
    borderWidth: 2,
  },
  datasheetCard: {
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  datasheetText: {
    fontSize: 13,
    fontWeight: "500",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
