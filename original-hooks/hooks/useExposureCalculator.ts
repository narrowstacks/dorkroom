import { useState, useCallback } from "react";
import { calculateNewTime, roundStops } from "./commonFunctions";
import { roundToStandardPrecision } from "@/utils/precision";

// Helper function to calculate and format the new time
const getCalculatedNewTime = (time: string, stopChange: string): string => {
  const numericTime = parseFloat(time);
  const numericStops = parseFloat(stopChange);

  if (isNaN(numericTime) || numericTime <= 0 || isNaN(numericStops)) {
    return "";
  }

  const calculatedTime = calculateNewTime(numericTime, numericStops);
  return roundToStandardPrecision(calculatedTime).toString();
};

export const useExposureCalculator = () => {
  const initialOriginalTime = "10";
  const initialStops = "1";

  const [originalTime, setOriginalTimeState] =
    useState<string>(initialOriginalTime);
  const [stops, setStopsState] = useState<string>(initialStops);
  // Initialize newTime based on initial values
  const [newTime, setNewTime] = useState<string>(() =>
    getCalculatedNewTime(initialOriginalTime, initialStops),
  );

  // Handler for original time changes
  const handleOriginalTimeChange = useCallback(
    (time: string) => {
      setOriginalTimeState(time);
      setNewTime(getCalculatedNewTime(time, stops)); // Recalculate newTime with current stops
    },
    [stops],
  ); // Dependency: stops

  // Handler for direct stop input changes
  const handleStopChange = useCallback(
    (value: string) => {
      // Allow typing of incomplete numbers
      if (value === "" || value === "-" || value.endsWith(".")) {
        setStopsState(value);
        setNewTime("");
        return;
      }

      const numericStops = parseFloat(value);
      if (!isNaN(numericStops)) {
        // Truncate to two decimal places
        const truncatedStops =
          roundToStandardPrecision(numericStops).toString();
        setStopsState(truncatedStops);
        setNewTime(getCalculatedNewTime(originalTime, truncatedStops));
      } else {
        // Handle non-numeric input
        setStopsState(value);
        setNewTime("");
      }
    },
    [originalTime],
  );

  // Handler for adjusting stops incrementally
  const adjustStops = useCallback(
    (increment: number) => {
      const currentStops = parseFloat(stops);
      // Avoid calculation if currentStops is NaN (e.g., empty input)
      if (isNaN(currentStops)) return;

      const newStopsValue = roundStops(currentStops + increment);
      // Truncate to two decimal places for display and calculation
      const truncatedStops = roundToStandardPrecision(newStopsValue).toString();
      setStopsState(truncatedStops);
      setNewTime(getCalculatedNewTime(originalTime, truncatedStops)); // Recalculate newTime
    },
    [originalTime, stops],
  );

  return {
    originalTime,
    setOriginalTime: handleOriginalTimeChange,
    newTime,
    stops,
    setStops: handleStopChange,
    adjustStops,
    // updateExposure is removed as its logic is integrated
  };
};

export default useExposureCalculator;
