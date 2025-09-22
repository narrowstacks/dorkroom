import React from "react";
import { TouchableOpacity } from "react-native";
import { Text, VStack } from "@gluestack-ui/themed";
import { Filter } from "lucide-react-native";
import { FormGroup } from "@/components/ui/forms/FormSection";
import { StyledSelect } from "@/components/ui/select/StyledSelect";
import { useThemeColor } from "@/hooks/useThemeColor";
import { DEVELOPER_TYPES } from "@/constants/developmentRecipes";
import type { Film, Developer } from "@/api/dorkroom/types";

interface FiltersSectionProps {
  showFilters: boolean;
  onToggleFilters: () => void;
  selectedFilm: Film | null;
  selectedDeveloper: Developer | null;
  developerTypeFilter: string;
  dilutionFilter: string;
  isoFilter: string;
  onDeveloperTypeFilterChange: (value: string) => void;
  onDilutionFilterChange: (value: string) => void;
  onIsoFilterChange: (value: string) => void;
  getAvailableDilutions: () => { label: string; value: string }[];
  getAvailableISOs: () => { label: string; value: string }[];
}

export function FiltersSection({
  showFilters,
  onToggleFilters,
  selectedFilm,
  selectedDeveloper,
  developerTypeFilter,
  dilutionFilter,
  isoFilter,
  onDeveloperTypeFilterChange,
  onDilutionFilterChange,
  onIsoFilterChange,
  getAvailableDilutions,
  getAvailableISOs,
}: FiltersSectionProps) {
  const developmentTint = useThemeColor({}, "developmentRecipesTint");

  return (
    <>
      {/* Filter Toggle */}
      <TouchableOpacity
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 8,
          gap: 8,
        }}
        onPress={onToggleFilters}
      >
        <Filter size={16} color={developmentTint} />
        <Text
          style={[
            { fontSize: 14, fontWeight: "500" },
            { color: developmentTint },
          ]}
        >
          {showFilters ? "Hide Filters" : "Show Filters"}
        </Text>
      </TouchableOpacity>

      {/* Filters */}
      {showFilters && (
        <VStack space="sm">
          {/* Developer Type Filter - only show when no specific developer is selected */}
          {!selectedDeveloper && (
            <FormGroup label="Developer Type">
              <StyledSelect
                value={developerTypeFilter}
                onValueChange={onDeveloperTypeFilterChange}
                items={DEVELOPER_TYPES}
              />
            </FormGroup>
          )}

          {/* Dilution Filter - only show when developer is selected */}
          {selectedDeveloper && (
            <FormGroup label="Dilution">
              <StyledSelect
                value={dilutionFilter}
                onValueChange={onDilutionFilterChange}
                items={getAvailableDilutions()}
              />
            </FormGroup>
          )}

          {/* ISO Filter - only show when film is selected */}
          {selectedFilm && (
            <FormGroup label="Shooting ISO">
              <StyledSelect
                value={isoFilter}
                onValueChange={onIsoFilterChange}
                items={getAvailableISOs()}
              />
            </FormGroup>
          )}
        </VStack>
      )}
    </>
  );
}
