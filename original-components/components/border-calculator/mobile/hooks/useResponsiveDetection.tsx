import { Platform } from "react-native";
import { useWindowDimensions } from "@/hooks/useWindowDimensions";
import { DESKTOP_BREAKPOINT } from "@/constants/borderCalc";

export const useResponsiveDetection = () => {
  const { width, height } = useWindowDimensions();

  const isMobile = Platform.OS === "ios" || Platform.OS === "android";
  const isMobileWeb = Platform.OS === "web" && width < DESKTOP_BREAKPOINT;

  return {
    shouldUseMobileLayout: isMobile || isMobileWeb,
    screenSize: { width, height },
    isNative: isMobile,
    isWeb: Platform.OS === "web",
  };
};
