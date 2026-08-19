import type { Developer, Film } from '@dorkroom/api';
import type { CustomRecipeFilter } from '../schemas/development-recipes.schema';

export interface RecipeUrlParams {
  film?: string;
  developer?: string;
  dilution?: string;
  iso?: string;
  developerType?: string;
  recipeType?: CustomRecipeFilter;
  favorites?: string;
  recipe?: string;
  source?: 'share';
  /** @deprecated Use `favorites` and `recipeType` instead */
  view?: 'favorites' | 'custom';
}

export interface InitialUrlState {
  selectedFilm?: Film;
  selectedDeveloper?: Developer;
  dilutionFilter?: string;
  isoFilter?: string;
  developerTypeFilter?: string;
  customRecipeFilter?: CustomRecipeFilter;
  favoritesOnly?: boolean;
  recipeId?: string;
  fromUrl?: boolean;
  isSharedApiRecipe?: boolean;
  isDirectSelection?: boolean;
  /** @deprecated Kept for backward compat */
  view?: 'favorites' | 'custom';
}

export interface UrlValidationConfig {
  maxSlugLength: number;
  isoRange: {
    min: number;
    max: number;
  };
  dilutionPatterns: RegExp[];
}

export interface UrlValidationResult {
  isValid: boolean;
  sanitized: RecipeUrlParams;
  errors: string[];
}
