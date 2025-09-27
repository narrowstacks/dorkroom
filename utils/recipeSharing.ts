import { Buffer } from "buffer";
import type {
  CustomRecipe,
  CustomFilmData,
  CustomDeveloperData,
} from "@/types/customRecipeTypes";
import { debugLog, debugError } from "@/utils/debugLogger";

const CURRENT_RECIPE_SHARING_VERSION = 1;

export interface EncodedCustomRecipe {
  name: string;
  filmId: string;
  developerId: string;
  temperatureF: number;
  timeMinutes: number;
  shootingIso: number;
  pushPull: number;
  agitationSchedule?: string;
  notes?: string;
  dilutionId?: number;
  customDilution?: string;
  isCustomFilm: boolean;
  isCustomDeveloper: boolean;
  customFilm?: CustomFilmData;
  customDeveloper?: CustomDeveloperData;
  isPublic: boolean;
  version: number;
}

export const encodeCustomRecipe = (recipe: CustomRecipe): string => {
  try {
    // Create a clean recipe object without metadata that shouldn't be shared
    const encodedRecipe: EncodedCustomRecipe = {
      name: recipe.name,
      filmId: recipe.filmId,
      developerId: recipe.developerId,
      temperatureF: recipe.temperatureF,
      timeMinutes: recipe.timeMinutes,
      shootingIso: recipe.shootingIso,
      pushPull: recipe.pushPull,
      agitationSchedule: recipe.agitationSchedule,
      notes: recipe.notes,
      dilutionId: recipe.dilutionId,
      customDilution: recipe.customDilution,
      isCustomFilm: recipe.isCustomFilm,
      isCustomDeveloper: recipe.isCustomDeveloper,
      customFilm: recipe.customFilm,
      customDeveloper: recipe.customDeveloper,
      isPublic: recipe.isPublic,
      version: CURRENT_RECIPE_SHARING_VERSION,
    };

    // Convert to JSON string and encode to base64 URL-safe format
    const jsonString = JSON.stringify(encodedRecipe);
    const encoded = Buffer.from(jsonString, "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    return encoded;
  } catch (error) {
    debugError("Failed to encode custom recipe:", error);
    return "";
  }
};

export const decodeCustomRecipe = (
  encoded: string,
): EncodedCustomRecipe | null => {
  try {
    // Convert back from URL-safe base64
    let base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }

    // Decode from base64 to JSON string
    const jsonString = Buffer.from(base64, "base64").toString("utf8");

    // Parse JSON
    const recipe: EncodedCustomRecipe = JSON.parse(jsonString);

    // Validate required fields
    if (
      !recipe.name ||
      typeof recipe.temperatureF !== "number" ||
      typeof recipe.timeMinutes !== "number" ||
      typeof recipe.shootingIso !== "number"
    ) {
      throw new Error("Invalid recipe data: missing required fields");
    }

    // Validate version compatibility
    if (!recipe.version || recipe.version > CURRENT_RECIPE_SHARING_VERSION) {
      console.warn(
        "Recipe was created with a newer version and may not import correctly",
      );
    }

    // Validate custom film/developer data if present
    if (recipe.isCustomFilm && recipe.customFilm) {
      if (!recipe.customFilm.name || !recipe.customFilm.brand) {
        throw new Error("Invalid custom film data");
      }
    }

    if (recipe.isCustomDeveloper && recipe.customDeveloper) {
      if (
        !recipe.customDeveloper.name ||
        !recipe.customDeveloper.manufacturer
      ) {
        throw new Error("Invalid custom developer data");
      }
    }

    return recipe;
  } catch (error) {
    debugError("Failed to decode custom recipe:", error);
    return null;
  }
};

export const createCustomRecipeFromEncoded = (
  encodedRecipe: EncodedCustomRecipe,
): Omit<CustomRecipe, "id" | "dateCreated" | "dateModified"> => {
  const timestamp = Date.now();

  return {
    name: encodedRecipe.name,
    // For custom films/developers, generate new unique IDs to avoid conflicts
    // For API films/developers, preserve the original ID
    filmId: encodedRecipe.isCustomFilm
      ? `custom_film_${timestamp}`
      : encodedRecipe.filmId,
    developerId: encodedRecipe.isCustomDeveloper
      ? `custom_dev_${timestamp}`
      : encodedRecipe.developerId,
    temperatureF: encodedRecipe.temperatureF,
    timeMinutes: encodedRecipe.timeMinutes,
    shootingIso: encodedRecipe.shootingIso,
    pushPull: encodedRecipe.pushPull,
    agitationSchedule: encodedRecipe.agitationSchedule,
    notes: encodedRecipe.notes,
    dilutionId: encodedRecipe.dilutionId,
    customDilution: encodedRecipe.customDilution,
    isCustomFilm: encodedRecipe.isCustomFilm,
    isCustomDeveloper: encodedRecipe.isCustomDeveloper,
    customFilm: encodedRecipe.customFilm,
    customDeveloper: encodedRecipe.customDeveloper,
    isPublic: encodedRecipe.isPublic || false,
  };
};

export const isValidCustomRecipeEncoding = (encoded: string): boolean => {
  if (!encoded || typeof encoded !== "string") {
    return false;
  }

  // Basic validation: check if it looks like base64 URL-safe encoding
  const base64UrlSafePattern = /^[A-Za-z0-9_-]+$/;
  if (!base64UrlSafePattern.test(encoded)) {
    return false;
  }

  // Try to decode and validate structure
  const decoded = decodeCustomRecipe(encoded);
  return decoded !== null;
};
