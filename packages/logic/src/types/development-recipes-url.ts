export interface RecipeUrlParams {
  film?: string;
  developer?: string;
  dilution?: string;
  iso?: string;
  recipe?: string;
  source?: 'share';
}

export interface InitialUrlState {
  selectedFilm?: unknown;
  selectedDeveloper?: unknown;
  dilutionFilter?: string;
  isoFilter?: string;
  recipeId?: string;
  fromUrl?: boolean;
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
