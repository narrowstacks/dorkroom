import { useColorScheme } from "react-native";
import { Colors } from "@/constants/Colors";

// Ensure type is inferred from both light and dark themes
type ColorKeys = keyof (typeof Colors)["light"] & keyof (typeof Colors)["dark"];

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: ColorKeys,
) {
  const theme = useColorScheme() ?? "light";
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  }
  return Colors[theme][colorName];
}

export default useThemeColor;
