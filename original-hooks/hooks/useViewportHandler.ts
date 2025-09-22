import { useEffect } from "react";
import { Platform } from "react-native";
import { useWindowDimensions } from "./useWindowDimensions";

/**
 * Custom hook for handling viewport height issues on mobile web, particularly iOS Safari.
 * This hook leverages the React Native Dimensions API recommendations and handles
 * dynamic viewport changes that occur when the browser UI shows/hides.
 */
export const useViewportHandler = () => {
  const { width, height } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isMobileWeb = isWeb && width <= 768;

  useEffect(() => {
    if (!isWeb || typeof window === "undefined") return;

    // Debug logging for iOS viewport issues (simplified)
    if (isMobileWeb) {
      console.log("Viewport info:", {
        windowInner: `${window.innerWidth}x${window.innerHeight}`,
        visualViewport: window.visualViewport
          ? `${window.visualViewport.width}x${window.visualViewport.height}`
          : "not supported",
        reactNativeDimensions: `${width}x${height}`,
        supportsDVH: CSS.supports("height", "110vh"),
      });
    }
  }, [width, height, isWeb, isMobileWeb]);

  return {
    width,
    height,
    isWeb,
    isMobileWeb,
    isDesktopWeb: isWeb && width > 768,
  };
};
