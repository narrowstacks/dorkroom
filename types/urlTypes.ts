/**
 * TypeScript type definitions for URL parameter handling in development recipes
 */

/**
 * URL parameters for development recipe filtering and sharing
 */
export interface RecipeUrlParams {
  /** Film slug for URL sharing (e.g., "tri-x-400") */
  film?: string;

  /** Developer slug for URL sharing (e.g., "d76") */
  developer?: string;

  /** Dilution value (e.g., "1+1", "stock", "1+9") */
  dilution?: string;

  /** ISO value as string (e.g., "400", "800") */
  iso?: string;

  /** Recipe UUID for database recipes, encoded data for custom recipes */
  recipe?: string;

  /** Indicates this is a shared link */
  source?: "share";
}

/**
 * Initial state derived from URL parameters for useDevelopmentRecipes hook
 */
export interface InitialUrlState {
  /** Film object resolved from URL slug */
  selectedFilm?: any; // Will use Film type from API when available

  /** Developer object resolved from URL slug */
  selectedDeveloper?: any; // Will use Developer type when available

  /** Dilution filter value */
  dilutionFilter?: string;

  /** ISO filter value */
  isoFilter?: string;

  /** Recipe UUID for direct recipe sharing */
  recipeId?: string;

  /** Indicates URL state was applied */
  fromUrl?: boolean;
}

/**
 * Configuration for URL parameter validation
 */
export interface UrlValidationConfig {
  /** Maximum length for slug parameters */
  maxSlugLength: number;

  /** Valid ISO value range */
  isoRange: {
    min: number;
    max: number;
  };

  /** Allowed dilution patterns */
  dilutionPatterns: RegExp[];
}

/**
 * Result of URL parameter validation
 */
export interface UrlValidationResult {
  /** Whether the parameters are valid */
  isValid: boolean;

  /** Sanitized parameters */
  sanitized: RecipeUrlParams;

  /** Validation errors if any */
  errors: string[];
}
