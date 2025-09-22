import { useCallback, useState } from "react";
import { Platform } from "react-native";
import * as Sharing from "expo-sharing";
import * as Clipboard from "expo-clipboard";
import type { CustomRecipe } from "@/types/customRecipeTypes";
import {
  encodeCustomRecipe,
  decodeCustomRecipe,
  createCustomRecipeFromEncoded,
  isValidCustomRecipeEncoding,
  type EncodedCustomRecipe,
} from "@/utils/recipeSharing";
import { debugLog } from "@/utils/debugLogger";

export interface CustomRecipeShareOptions {
  recipe: CustomRecipe;
  baseUrl?: string;
  includeSource?: boolean;
}

export interface CustomRecipeShareResult {
  success: boolean;
  error?: string;
  method?: "webShare" | "expo" | "clipboard";
  url?: string;
}

export interface ImportedCustomRecipe {
  recipe: Omit<CustomRecipe, "id" | "dateCreated" | "dateModified">;
  encodedData: string;
  isValid: boolean;
}

/**
 * Hook for custom recipe sharing and import functionality
 */
export const useCustomRecipeSharing = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastSharedUrl, setLastSharedUrl] = useState<string | null>(null);

  /**
   * Generate a shareable URL for a custom recipe using encoded data
   */
  const generateCustomRecipeShareUrl = useCallback(
    (options: CustomRecipeShareOptions): string | null => {
      const { recipe, baseUrl, includeSource = true } = options;

      try {
        setIsGenerating(true);
        debugLog(
          "🔧 [CUSTOM RECIPE SHARE] Generating share URL for recipe:",
          recipe.name,
        );

        // Encode the custom recipe
        const encodedData = encodeCustomRecipe(recipe);
        if (!encodedData) {
          debugLog("🔧 [CUSTOM RECIPE SHARE] Failed to encode recipe");
          return null;
        }

        // Get current base URL or construct it
        const base = baseUrl || getBaseUrl();

        // Build URL parameters
        const params = new URLSearchParams();
        params.set("recipe", encodedData);

        // Add source parameter to track shared links
        if (includeSource) {
          params.set("source", "share");
        }

        const shareUrl = `${base}/developmentRecipes?${params.toString()}`;
        debugLog("🔧 [CUSTOM RECIPE SHARE] Generated share URL:", shareUrl);

        setLastSharedUrl(shareUrl);
        return shareUrl;
      } catch (error) {
        debugLog("🔧 [CUSTOM RECIPE SHARE] Error generating share URL:", error);
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    [],
  );

  /**
   * Share a custom recipe using the most appropriate method for the platform
   */
  const shareCustomRecipe = useCallback(
    async (
      options: CustomRecipeShareOptions,
    ): Promise<CustomRecipeShareResult> => {
      try {
        const shareUrl = generateCustomRecipeShareUrl(options);
        if (!shareUrl) {
          return {
            success: false,
            error: "Failed to generate share URL",
          };
        }

        const { recipe } = options;

        // Create share content
        const title = `Custom Development Recipe: ${recipe.name}`;
        const message = `Check out this custom film development recipe: ${shareUrl}`;

        debugLog("🔧 [CUSTOM RECIPE SHARE] Attempting to share:", {
          title,
          message,
          shareUrl,
        });

        // Try Web Share API first (modern browsers and mobile)
        if (
          Platform.OS === "web" &&
          typeof navigator !== "undefined" &&
          navigator.share
        ) {
          try {
            await navigator.share({
              title,
              text: message,
              url: shareUrl,
            });
            return {
              success: true,
              method: "webShare",
              url: shareUrl,
            };
          } catch (webShareError) {
            // User cancelled or Web Share API failed, fallback to clipboard
            debugLog(
              "🔧 [CUSTOM RECIPE SHARE] Web Share API cancelled or failed:",
              webShareError,
            );
          }
        }

        // Use Expo Sharing for native platforms
        if (Platform.OS !== "web") {
          const isAvailable = await Sharing.isAvailableAsync();
          if (isAvailable) {
            await Sharing.shareAsync(shareUrl, {
              mimeType: "text/plain",
              dialogTitle: title,
            });
            return {
              success: true,
              method: "expo",
              url: shareUrl,
            };
          }
        }

        // Fallback to clipboard
        await Clipboard.setStringAsync(shareUrl);
        return {
          success: true,
          method: "clipboard",
          url: shareUrl,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to share custom recipe";
        debugLog("🔧 [CUSTOM RECIPE SHARE] Share error:", error);
        return { success: false, error: errorMessage };
      }
    },
    [generateCustomRecipeShareUrl],
  );

  /**
   * Copy custom recipe URL to clipboard
   */
  const copyCustomRecipeToClipboard = useCallback(
    async (
      options: CustomRecipeShareOptions,
    ): Promise<CustomRecipeShareResult> => {
      try {
        const shareUrl = generateCustomRecipeShareUrl(options);
        if (!shareUrl) {
          return {
            success: false,
            error: "Failed to generate share URL",
          };
        }

        await Clipboard.setStringAsync(shareUrl);
        return {
          success: true,
          method: "clipboard",
          url: shareUrl,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to copy to clipboard";
        return { success: false, error: errorMessage };
      }
    },
    [generateCustomRecipeShareUrl],
  );

  /**
   * Decode and validate a custom recipe from encoded data
   */
  const decodeSharedCustomRecipe = useCallback(
    (encodedData: string): ImportedCustomRecipe | null => {
      try {
        debugLog(
          "🔧 [CUSTOM RECIPE IMPORT] Attempting to decode:",
          encodedData.substring(0, 50) + "...",
        );

        if (!isValidCustomRecipeEncoding(encodedData)) {
          debugLog("🔧 [CUSTOM RECIPE IMPORT] Invalid encoding format");
          return null;
        }

        const decodedRecipe = decodeCustomRecipe(encodedData);
        if (!decodedRecipe) {
          debugLog("🔧 [CUSTOM RECIPE IMPORT] Failed to decode recipe");
          return null;
        }

        // Convert to custom recipe format
        const recipe = createCustomRecipeFromEncoded(decodedRecipe);

        debugLog(
          "🔧 [CUSTOM RECIPE IMPORT] Successfully decoded recipe:",
          recipe.name,
        );

        return {
          recipe,
          encodedData,
          isValid: true,
        };
      } catch (error) {
        debugLog("🔧 [CUSTOM RECIPE IMPORT] Error decoding recipe:", error);
        return null;
      }
    },
    [],
  );

  /**
   * Check if a string is likely an encoded custom recipe
   */
  const isCustomRecipeUrl = useCallback((recipeParam: string): boolean => {
    // If it's a UUID format, it's not a custom recipe
    if (
      recipeParam.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      )
    ) {
      return false;
    }

    // If it's longer than a typical UUID and base64-like, it's likely encoded custom recipe data
    return recipeParam.length > 50 && isValidCustomRecipeEncoding(recipeParam);
  }, []);

  /**
   * Get the appropriate sharing method description for UI
   */
  const getSharingMethodDescription = useCallback(async (): Promise<string> => {
    if (Platform.OS === "web") {
      if (
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function"
      ) {
        return "Share recipe";
      }
      return "Copy link";
    }

    const isAvailable = await Sharing.isAvailableAsync();
    return isAvailable ? "Share recipe" : "Copy link";
  }, []);

  /**
   * Check if native sharing is available
   */
  const isSharingAvailable = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === "web") {
      return typeof navigator !== "undefined" && !!navigator.share;
    }
    return await Sharing.isAvailableAsync();
  }, []);

  return {
    // Sharing functionality
    generateCustomRecipeShareUrl,
    shareCustomRecipe,
    copyCustomRecipeToClipboard,
    getSharingMethodDescription,
    isSharingAvailable,

    // Import functionality
    decodeSharedCustomRecipe,
    isCustomRecipeUrl,

    // State
    isGenerating,
    lastSharedUrl,
  };
};

/**
 * Get the base URL for the current environment
 */
function getBaseUrl(): string {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      return `${window.location.protocol}//${window.location.host}`;
    }
    // Fallback for SSR or when window is not available
    return "https://darkroom-recipes.app"; // Replace with your actual domain
  }

  // For native platforms, use a web fallback URL
  return "https://darkroom-recipes.app"; // Replace with your actual domain
}
