import { useEffect } from "react";
import { Platform } from "react-native";

export function useDocumentTitle(title: string) {
  useEffect(() => {
    if (Platform.OS === "web") {
      const originalTitle = document.title;
      document.title = title;

      return () => {
        document.title = originalTitle;
      };
    }
  }, [title]);
}
