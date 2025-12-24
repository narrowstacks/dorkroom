import type { Developer, Film } from '@dorkroom/api';

export interface RecipeUrlParams {
  film?: string;
  developer?: string;
  dilution?: string;
  iso?: string;
  recipe?: string;
  source?: 'share';
  view?: 'favorites' | 'custom';
}

export interface InitialUrlState {
  selectedFilm?: Film;
  selectedDeveloper?: Developer;
  dilutionFilter?: string;
  isoFilter?: string;
  recipeId?: string;
  fromUrl?: boolean;
  isSharedApiRecipe?: boolean;
  isDirectSelection?: boolean;
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
