import React, { useState } from "react";
import { StyleSheet, TouchableOpacity, Text as RNText } from "react-native";
import {
  Box,
  HStack,
  VStack,
  Badge,
  BadgeText,
  Button,
  ButtonText,
  ButtonIcon,
} from "@gluestack-ui/themed";
import { ChevronDown, ChevronUp, Filter, X } from "lucide-react-native";
import { useThemeColor } from "@/hooks/useThemeColor";
import { ThemedSelect } from "@/components/ui/select/ThemedSelect";

export interface FilmFilters {
  brandFilter: string;
  typeFilter: string;
}

export interface DeveloperFilters {
  manufacturerFilter: string;
  typeFilter: string;
  filmOrPaperFilter: string;
}

interface InfobaseFiltersProps {
  variant: "films" | "developers";

  // Film props
  filmFilters?: FilmFilters;
  availableBrands?: string[];
  availableTypes?: string[];
  onFilmFiltersChange?: (filters: Partial<FilmFilters>) => void;

  // Developer props
  developerFilters?: DeveloperFilters;
  availableManufacturers?: string[];
  availableDeveloperTypes?: string[];
  availableFilmOrPaper?: string[];
  onDeveloperFiltersChange?: (filters: Partial<DeveloperFilters>) => void;

  // Common props
  onClearFilters?: () => void;
  disabled?: boolean;
}

export function InfobaseFilters({
  variant,
  filmFilters,
  availableBrands,
  availableTypes,
  onFilmFiltersChange,
  developerFilters,
  availableManufacturers,
  availableDeveloperTypes,
  availableFilmOrPaper,
  onDeveloperFiltersChange,
  onClearFilters,
  disabled = false,
}: InfobaseFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const cardBackground = useThemeColor({}, "cardBackground");
  const textColor = useThemeColor({}, "text");
  const textSecondary = useThemeColor({}, "textSecondary");
  const borderColor = useThemeColor({}, "borderColor");
  const infobaseTint = useThemeColor({}, "infobaseTint");

  // Count active filters
  const getActiveFiltersCount = () => {
    if (variant === "films" && filmFilters) {
      return [filmFilters.brandFilter, filmFilters.typeFilter].filter(Boolean)
        .length;
    }
    if (variant === "developers" && developerFilters) {
      return [
        developerFilters.manufacturerFilter,
        developerFilters.typeFilter,
        developerFilters.filmOrPaperFilter,
      ].filter(Boolean).length;
    }
    return 0;
  };

  const activeFiltersCount = getActiveFiltersCount();

  const containerStyle = {
    backgroundColor: cardBackground,
    borderColor,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    ...(disabled && {
      opacity: 0.6,
    }),
  };

  const renderFilmFilters = () => {
    if (!filmFilters || !onFilmFiltersChange) return null;

    const brandItems =
      availableBrands?.map((brand) => ({ label: brand, value: brand })) || [];
    const typeItems =
      availableTypes?.map((type) => ({ label: type, value: type })) || [];

    return (
      <VStack space="md">
        <HStack space="md" style={styles.filterRow}>
          <Box style={[styles.filterItem, { flex: 1 }]}>
            <ThemedSelect
              label="Brand:"
              selectedValue={filmFilters.brandFilter}
              onValueChange={(value) =>
                onFilmFiltersChange({ brandFilter: value })
              }
              items={[{ label: "All Brands", value: "" }, ...brandItems]}
              placeholder="All Brands"
            />
          </Box>

          <Box style={[styles.filterItem, { flex: 1 }]}>
            <ThemedSelect
              label="Type:"
              selectedValue={filmFilters.typeFilter}
              onValueChange={(value) =>
                onFilmFiltersChange({ typeFilter: value })
              }
              items={[{ label: "All Types", value: "" }, ...typeItems]}
              placeholder="All Types"
            />
          </Box>
        </HStack>
      </VStack>
    );
  };

  const renderDeveloperFilters = () => {
    if (!developerFilters || !onDeveloperFiltersChange) return null;

    const manufacturerItems =
      availableManufacturers?.map((manufacturer) => ({
        label: manufacturer,
        value: manufacturer,
      })) || [];

    const typeItems =
      availableDeveloperTypes?.map((type) => ({
        label: type,
        value: type,
      })) || [];

    const filmOrPaperItems =
      availableFilmOrPaper?.map((item) => ({
        label: item,
        value: item,
      })) || [];

    return (
      <VStack space="md">
        <HStack space="md" style={styles.filterRow}>
          <Box style={[styles.filterItem, { flex: 1 }]}>
            <ThemedSelect
              label="Manufacturer:"
              selectedValue={developerFilters.manufacturerFilter}
              onValueChange={(value) =>
                onDeveloperFiltersChange({ manufacturerFilter: value })
              }
              items={[
                { label: "All Manufacturers", value: "" },
                ...manufacturerItems,
              ]}
              placeholder="All Manufacturers"
            />
          </Box>

          <Box style={[styles.filterItem, { flex: 1 }]}>
            <ThemedSelect
              label="Type:"
              selectedValue={developerFilters.typeFilter}
              onValueChange={(value) =>
                onDeveloperFiltersChange({ typeFilter: value })
              }
              items={[{ label: "All Types", value: "" }, ...typeItems]}
              placeholder="All Types"
            />
          </Box>
        </HStack>

        <Box style={styles.filterItem}>
          <ThemedSelect
            label="For:"
            selectedValue={developerFilters.filmOrPaperFilter}
            onValueChange={(value) =>
              onDeveloperFiltersChange({ filmOrPaperFilter: value })
            }
            items={[{ label: "Film & Paper", value: "" }, ...filmOrPaperItems]}
            placeholder="Film & Paper"
          />
        </Box>
      </VStack>
    );
  };

  return (
    <Box style={containerStyle}>
      {/* Filter Header */}
      <TouchableOpacity
        style={styles.filterHeader}
        onPress={() => setIsExpanded(!isExpanded)}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <HStack space="sm" alignItems="center" style={styles.headerContent}>
          <Filter size={18} color={infobaseTint} />
          <RNText style={[styles.filterTitle, { color: textColor }]}>
            Filters
          </RNText>

          {activeFiltersCount > 0 && (
            <Badge
              style={[
                styles.activeFiltersBadge,
                { backgroundColor: infobaseTint },
              ]}
            >
              <BadgeText style={styles.activeFiltersText}>
                {activeFiltersCount}
              </BadgeText>
            </Badge>
          )}

          <Box style={styles.spacer} />

          {isExpanded ? (
            <ChevronUp size={20} color={textSecondary} />
          ) : (
            <ChevronDown size={20} color={textSecondary} />
          )}
        </HStack>
      </TouchableOpacity>

      {/* Filter Content */}
      {isExpanded && (
        <VStack space="md" style={styles.filterContent}>
          {variant === "films" ? renderFilmFilters() : renderDeveloperFilters()}

          {/* Clear Filters Button */}
          {activeFiltersCount > 0 && (
            <Button
              onPress={onClearFilters}
              variant="outline"
              size="sm"
              action="secondary"
              style={[styles.clearButton, { borderColor: infobaseTint }]}
              disabled={disabled}
            >
              <ButtonIcon
                as={X}
                size="sm"
                color={infobaseTint}
                style={{ marginRight: 4 }}
              />
              <ButtonText>Clear Filters</ButtonText>
            </Button>
          )}
        </VStack>
      )}
    </Box>
  );
}

const styles = StyleSheet.create({
  filterHeader: {
    paddingVertical: 4,
  },
  headerContent: {
    flex: 1,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  activeFiltersBadge: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: "center",
  },
  activeFiltersText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  spacer: {
    flex: 1,
  },
  filterContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  filterRow: {
    flexWrap: "wrap",
  },
  filterItem: {
    minWidth: 200,
  },
  clearButton: {
    alignSelf: "flex-start",
    marginTop: 8,
    borderRadius: 12,
  },
});

export default InfobaseFilters;
