import { useState, useEffect } from "react";
import * as Linking from "expo-linking";
import { decodePreset } from "@/utils/presetSharing";
import type { BorderPresetSettings } from "@/types/borderPresetTypes";
import { debugLog, debugError } from "@/utils/debugLogger";

export const useSharedPresetLoader = () => {
  const [loadedPreset, setLoadedPreset] = useState<{
    name: string;
    settings: BorderPresetSettings;
    isFromUrl?: boolean;
  } | null>(null);
  const url = Linking.useURL();

  // Add a method to clear the loaded preset after it's been processed
  const clearLoadedPreset = () => {
    debugLog("🔗 [PRESET LOADER] Clearing loaded preset");
    setLoadedPreset(null);
  };

  useEffect(() => {
    const handleUrl = (url: string | null) => {
      debugLog("🔗 [PRESET LOADER] URL received:", url);
      if (!url) {
        debugLog(
          "🔗 [PRESET LOADER] No URL provided, clearing any existing preset",
        );
        setLoadedPreset(null);
        return;
      }
      try {
        let encodedData: string | null = null;

        // Web: Check for hash fragment. This is the most common case for web sharing.
        const fragmentIndex = url.indexOf("#");
        if (fragmentIndex !== -1) {
          encodedData = url.substring(fragmentIndex + 1);
          debugLog("🔗 [PRESET LOADER] Found hash fragment:", encodedData);
        } else {
          // Native: If no fragment, parse as a deep link.
          const parsedUrl = Linking.parse(url);
          debugLog("🔗 [PRESET LOADER] Parsed URL:", parsedUrl);

          // Handle custom app scheme (production)
          if (
            parsedUrl.scheme === "dorkroom" &&
            parsedUrl.path?.startsWith("border")
          ) {
            debugLog("🔗 [PRESET LOADER] Detected dorkroom:// scheme");
            // Check for query parameter first
            if (parsedUrl.queryParams?.preset) {
              encodedData = parsedUrl.queryParams.preset as string;
              debugLog(
                "🔗 [PRESET LOADER] Found preset in query params:",
                encodedData,
              );
            }
            // Fallback to old path-based format for backwards compatibility
            else if (parsedUrl.path?.startsWith("border/s/")) {
              encodedData = parsedUrl.path.substring("border/s/".length);
              debugLog(
                "🔗 [PRESET LOADER] Found preset in path (legacy):",
                encodedData,
              );
            }
          }
          // Handle Expo Go development scheme
          else if (parsedUrl.scheme === "exp" && parsedUrl.path === "border") {
            debugLog("🔗 [PRESET LOADER] Detected exp:// scheme (Expo Go)");
            // Check for query parameter first
            if (parsedUrl.queryParams?.preset) {
              encodedData = parsedUrl.queryParams.preset as string;
              debugLog(
                "🔗 [PRESET LOADER] Found preset in query params:",
                encodedData,
              );
            }
            // Fallback to old path-based format for backwards compatibility
            else {
              const pathMatch = parsedUrl.path.match(/\/--\/border\/s\/(.+)$/);
              if (pathMatch) {
                encodedData = pathMatch[1];
                debugLog(
                  "🔗 [PRESET LOADER] Found preset in path (legacy):",
                  encodedData,
                );
              }
            }
          } else {
            debugLog(
              "🔗 [PRESET LOADER] URL scheme not recognized for preset loading. Scheme:",
              parsedUrl.scheme,
              "Path:",
              parsedUrl.path,
            );
          }
        }

        if (encodedData) {
          debugLog(
            "🔗 [PRESET LOADER] Attempting to decode preset data:",
            encodedData,
          );
          const decodedPreset = decodePreset(encodedData);
          if (decodedPreset) {
            debugLog(
              "🔗 [PRESET LOADER] Successfully decoded preset:",
              decodedPreset,
            );
            debugLog(
              "🔗 [PRESET LOADER] Setting loadedPreset state to:",
              decodedPreset,
            );
            setLoadedPreset({ ...decodedPreset, isFromUrl: true });
          } else {
            debugLog("🔗 [PRESET LOADER] Failed to decode preset data");
          }
        } else {
          debugLog("🔗 [PRESET LOADER] No encoded data found in URL");
        }
      } catch (error) {
        debugLog("🔗 [PRESET LOADER] Error handling shared URL:", error);
        debugError("Failed to handle shared URL:", error);
      }
    };

    handleUrl(url);
  }, [url]);

  return { loadedPreset, clearLoadedPreset };
};
