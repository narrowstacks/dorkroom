import { useColorScheme as _useColorScheme } from "react-native";

// The useColorScheme value is always either light or dark, but the built-in
// type suggests that it can be null. This is not the case in this app.
export function useColorScheme(): "light" | "dark" {
  return _useColorScheme() ?? "light";
}

export default useColorScheme;
