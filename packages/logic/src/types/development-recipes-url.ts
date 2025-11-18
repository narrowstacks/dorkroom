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
  selectedFilm?: unknown;
  selectedDeveloper?: unknown;
  dilutionFilter?: string;
  isoFilter?: string;
  recipeId?: string;
  fromUrl?: boolean;
  isSharedApiRecipe?: boolean;
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
