import React from "react";
import { Box } from "@gluestack-ui/themed";
import { RecipeCard } from "@/components/development-recipes";
import type { Film, Developer, Combination } from "@/api/dorkroom/types";
import type { CustomRecipe } from "@/types/customRecipeTypes";

interface CardsViewProps {
  paginatedCombinations: Combination[];
  customRecipes: CustomRecipe[];
  onCardPress: (combination: Combination, isCustom: boolean) => void;
  getFilmById: (filmId: string) => Film | undefined;
  getDeveloperById: (developerId: string) => Developer | undefined;
  getCustomRecipeFilm: (recipeId: string) => Film | undefined;
  getCustomRecipeDeveloper: (recipeId: string) => Developer | undefined;
}

export function CardsView({
  paginatedCombinations,
  customRecipes,
  onCardPress,
  getFilmById,
  getDeveloperById,
  getCustomRecipeFilm,
  getCustomRecipeDeveloper,
}: CardsViewProps) {
  return (
    <Box
      style={{
        flex: 1,
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        paddingVertical: 8,
      }}
    >
      {paginatedCombinations.map((combination) => {
        const isCustom = customRecipes.some((r) => r.id === combination.id);
        const film = isCustom
          ? getCustomRecipeFilm(combination.id)
          : getFilmById(combination.filmStockId);
        const developer = isCustom
          ? getCustomRecipeDeveloper(combination.id)
          : getDeveloperById(combination.developerId);

        return (
          <RecipeCard
            key={combination.uuid}
            combination={combination}
            film={film}
            developer={developer}
            onPress={() => onCardPress(combination, isCustom)}
            isCustomRecipe={isCustom}
          />
        );
      })}
    </Box>
  );
}
