import React from "react";
import { ScrollView } from "react-native";
import { Box } from "@gluestack-ui/themed";
import { TableHeader } from "@/components/ui/table/TableHeader";
import { RecipeRow } from "@/components/development-recipes/RecipeRow";
import type { Film, Developer, Combination } from "@/api/dorkroom/types";
import type { CustomRecipe } from "@/types/customRecipeTypes";

interface TableViewProps {
  paginatedCombinations: Combination[];
  customRecipes: CustomRecipe[];
  sortBy: string;
  sortDirection: "asc" | "desc";
  onSort: (sortKey: string) => void;
  onRowPress: (combination: Combination, isCustom: boolean) => void;
  getFilmById: (filmId: string) => Film | undefined;
  getDeveloperById: (developerId: string) => Developer | undefined;
  getCustomRecipeFilm: (recipeId: string) => Film | undefined;
  getCustomRecipeDeveloper: (recipeId: string) => Developer | undefined;
}

export function TableView({
  paginatedCombinations,
  customRecipes,
  sortBy,
  sortDirection,
  onSort,
  onRowPress,
  getFilmById,
  getDeveloperById,
  getCustomRecipeFilm,
  getCustomRecipeDeveloper,
}: TableViewProps) {
  return (
    <Box
      style={{
        flex: 1,
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: "transparent",
      }}
    >
      <Box
        style={{
          flexDirection: "row",
          borderBottomWidth: 2,
          paddingVertical: 12,
          paddingHorizontal: 8,
        }}
      >
        <TableHeader
          title="Film"
          sortKey="filmName"
          currentSort={sortBy}
          sortDirection={sortDirection}
          onSort={onSort}
        />
        <TableHeader
          title="Developer"
          sortKey="developerName"
          currentSort={sortBy}
          sortDirection={sortDirection}
          onSort={onSort}
        />
        <TableHeader
          title="Dilution"
          sortKey="dilution"
          currentSort={sortBy}
          sortDirection={sortDirection}
          onSort={onSort}
        />
        <TableHeader
          title="Temp"
          sortKey="temperatureF"
          currentSort={sortBy}
          sortDirection={sortDirection}
          onSort={onSort}
        />
        <TableHeader
          title="ISO"
          sortKey="shootingIso"
          currentSort={sortBy}
          sortDirection={sortDirection}
          onSort={onSort}
        />
        <TableHeader
          title="Time"
          sortKey="timeMinutes"
          currentSort={sortBy}
          sortDirection={sortDirection}
          onSort={onSort}
        />
      </Box>

      <ScrollView style={{ flex: 1 }}>
        {paginatedCombinations.map((combination, index) => {
          const isCustom = customRecipes.some((r) => r.id === combination.id);
          const film = isCustom
            ? getCustomRecipeFilm(combination.id)
            : getFilmById(combination.filmStockId);
          const developer = isCustom
            ? getCustomRecipeDeveloper(combination.id)
            : getDeveloperById(combination.developerId);

          return (
            <RecipeRow
              key={combination.uuid}
              combination={combination}
              film={film}
              developer={developer}
              onPress={() => onRowPress(combination, isCustom)}
              isEven={index % 2 === 0}
            />
          );
        })}
      </ScrollView>
    </Box>
  );
}
