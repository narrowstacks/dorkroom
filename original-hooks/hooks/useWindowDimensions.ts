import { useState, useEffect } from "react";
import { Dimensions, ScaledSize } from "react-native";

export const useWindowDimensions = () => {
  const [dimensions, setDimensions] = useState<ScaledSize>(() =>
    Dimensions.get("window"),
  );

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  return dimensions;
};

export default useWindowDimensions;
