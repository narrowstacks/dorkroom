import { useState, useMemo, useEffect, useCallback } from "react";
import { FILM_TYPES } from "@/constants/reciprocity";
import { ReciprocityCalculation } from "@/types/reciprocityTypes";

// Maximum width for visual representation of time bars in pixels
const MAX_BAR_WIDTH = 300;

// Helper function to convert time to a readable format (s, m, h)
const formatTime = (seconds: number): string => {
  if (seconds < 60) {
    return `${Math.round(seconds * 10) / 10}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round((seconds % 60) * 10) / 10;
    return remainingSeconds === 0
      ? `${minutes}m`
      : `${minutes}m ${remainingSeconds}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
  }
};

// Parse time input (accepts various formats: 1s, 1m30s, 1h15m, etc.)
// Defined outside the hook as it doesn't depend on hook state/props
const parseTimeInput = (input: string): number | null => {
  // Clean up the input
  const cleaned = input.toLowerCase().trim();

  // If input is just a number, assume it's seconds
  if (/^\d+(\.\d+)?$/.test(cleaned)) {
    return parseFloat(cleaned);
  }

  // Try to parse complex time formats
  let seconds = 0;
  let valid = false;

  // Extract hours
  const hourMatch = cleaned.match(/(\d+(\.\d+)?)\s*h/);
  if (hourMatch) {
    seconds += parseFloat(hourMatch[1]) * 3600;
    valid = true;
  }

  // Extract minutes
  const minuteMatch = cleaned.match(/(\d+(\.\d+)?)\s*m(?!s)/);
  if (minuteMatch) {
    seconds += parseFloat(minuteMatch[1]) * 60;
    valid = true;
  }

  // Extract seconds
  const secondMatch = cleaned.match(/(\d+(\.\d+)?)\s*s/);
  if (secondMatch) {
    seconds += parseFloat(secondMatch[1]);
    valid = true;
  }

  return valid ? seconds : null;
};

export const useReciprocityCalculator = () => {
  const initialMeteredTime = "30s";

  // Form state
  const [filmType, setFilmType] = useState(FILM_TYPES[0].value);
  const [meteredTime, setMeteredTime] = useState(initialMeteredTime);
  const [customFactor, setCustomFactor] = useState("1.3");
  // Initialize formattedTime based on initialMeteredTime
  const [formattedTime, setFormattedTime] = useState<string | null>(() => {
    const initialSeconds = parseTimeInput(initialMeteredTime);
    return initialSeconds !== null ? formatTime(initialSeconds) : null;
  });
  const [timeFormatError, setTimeFormatError] = useState<string | null>(null);

  // Store the last valid calculation
  const [lastValidCalculation, setLastValidCalculation] =
    useState<ReciprocityCalculation | null>(null);

  // Format time input when it changes
  const handleTimeChange = useCallback((text: string) => {
    const parsedSeconds = parseTimeInput(text);

    // Batch all state updates to prevent flickering
    setMeteredTime(text);
    setTimeFormatError(null);

    if (parsedSeconds !== null) {
      setFormattedTime(formatTime(parsedSeconds));
    } else if (text.trim()) {
      setTimeFormatError("Invalid time format. Try: 30s, 1m30s, 1h15m");
      setFormattedTime(null);
    } else {
      setFormattedTime(null);
    }
  }, []);

  // Calculate the reciprocity failure compensation
  const currentCalculation = useMemo<ReciprocityCalculation | null>(() => {
    // Get the parsed original time
    const originalTime = parseTimeInput(meteredTime);
    if (!originalTime || originalTime <= 0) return null;

    // Get the reciprocity factor
    let factor = 1;
    let filmName = "";

    if (filmType === "custom") {
      factor = parseFloat(customFactor) || 1;
      filmName = "Custom";
    } else {
      const selectedFilm = FILM_TYPES.find((film) => film.value === filmType);
      if (selectedFilm) {
        factor = selectedFilm.factor || 1;
        filmName = selectedFilm.label;
      }
    }

    // Calculate adjusted time using the power function
    const adjustedTime = Math.pow(originalTime, factor);

    // Calculate percentage increase
    const percentageIncrease =
      ((adjustedTime - originalTime) / originalTime) * 100;

    // Calculate visual bar widths, logarithmically scaled for better visualization
    const logScale = (time: number) =>
      Math.min(
        MAX_BAR_WIDTH,
        (Math.log(time + 1) / Math.log(Math.max(adjustedTime, 10) + 1)) *
          MAX_BAR_WIDTH,
      );

    const timeBarWidth = logScale(originalTime);
    const adjustedTimeBarWidth = logScale(adjustedTime);

    return {
      originalTime,
      adjustedTime,
      factor,
      filmName,
      percentageIncrease,
      timeBarWidth,
      adjustedTimeBarWidth,
    };
  }, [filmType, meteredTime, customFactor]);

  // Update last valid calculation whenever we have a valid one
  useEffect(() => {
    if (currentCalculation) {
      setLastValidCalculation(currentCalculation);
    }
  }, [currentCalculation]);

  // Use the current calculation if valid, otherwise use the last valid one
  const calculation = currentCalculation || lastValidCalculation;

  // Direct setter for preset values to avoid formatting feedback loop
  const setMeteredTimeDirectly = useCallback((text: string) => {
    setMeteredTime(text);
    setTimeFormatError(null);

    const parsedSeconds = parseTimeInput(text);
    if (parsedSeconds !== null) {
      setFormattedTime(formatTime(parsedSeconds));
    } else {
      setFormattedTime(null);
    }
  }, []);

  return {
    filmType,
    setFilmType,
    meteredTime,
    setMeteredTime: handleTimeChange,
    setMeteredTimeDirectly,
    customFactor,
    setCustomFactor,
    formattedTime,
    timeFormatError,
    calculation,
    formatTime,
  };
};

export default useReciprocityCalculator;
