import type { Developer, Film } from '@dorkroom/api';
import type { CustomRecipeFilter } from '../schemas/development-recipes.schema';

export interface RecipeUrlParams {
  /** Free-text recipe search. */
  q?: string;
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
  /**
   * Free-text search seed. Read once at mount through
   * `readRecipeUrlSearchQuery` (it needs no catalogue data, so it does not wait
   * for the films/developers load the rest of this state does). The URL hook's
   * derived `initialUrlState` deliberately leaves it out, so the one-shot
   * applier cannot overwrite what was typed while data was loading.
   */
  searchQuery?: string;
  selectedFilm?: Film;
  selectedDeveloper?: Developer;
  dilutionFilter?: string;
  isoFilter?: string;
  developerTypeFilter?: string;
  customRecipeFilter?: CustomRecipeFilter;
  favoritesOnly?: boolean;
  recipeId?: string;
  fromUrl?: boolean;
  /**
   * The URL carried `source=share`, i.e. a link another user handed over.
   * Distinct from `isSharedApiRecipe`, which additionally requires the film and
   * developer slugs; a share link missing those is still a share.
   */
  fromShare?: boolean;
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
