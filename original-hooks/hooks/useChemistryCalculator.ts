import { useState, useCallback, useMemo } from "react";

// Volume constants
const ML_PER_35MM_ROLL = 300;
const ML_PER_120_ROLL = 500;
const ML_PER_FL_OZ = 29.5735; // 1 fluid ounce = 29.5735 milliliters

export type VolumeUnit = "ml" | "oz" | "rolls";
export type FilmFormat = "35mm" | "120";

export interface ChemistryCalculation {
  // Input values
  totalVolume: number;
  unit: VolumeUnit;
  filmFormat: FilmFormat;
  numberOfRolls: number;

  // Calculated volumes in ml
  totalVolumeML: number;
  developerVolume: number;
  waterVolume: number;

  // Display values
  totalVolumeDisplay: string;
  developerVolumeDisplay: string;
  waterVolumeDisplay: string;
}

export interface ChemistryCalculatorState {
  // Input state
  totalVolume: string;
  unit: VolumeUnit;
  filmFormat: FilmFormat;
  numberOfRolls: string;

  // Selected dilution
  selectedDilution: string | null;

  // Calculated results
  calculation: ChemistryCalculation | null;

  // Validation
  isValid: boolean;
  errors: string[];
}

export interface ChemistryCalculatorActions {
  setTotalVolume: (volume: string) => void;
  setUnit: (unit: VolumeUnit) => void;
  setFilmFormat: (format: FilmFormat) => void;
  setNumberOfRolls: (rolls: string) => void;
  setSelectedDilution: (dilution: string | null) => void;
  calculateFromRolls: () => void;
  reset: () => void;
}

import { parseDilutionRatio } from "@/utils/dilutionUtils";

/**
 * Converts volume to milliliters based on unit
 */
function convertToML(
  volume: number,
  unit: VolumeUnit,
  filmFormat: FilmFormat,
  numberOfRolls: number,
): number {
  switch (unit) {
    case "ml":
      return volume;
    case "oz":
      return volume * ML_PER_FL_OZ;
    case "rolls":
      const mlPerRoll =
        filmFormat === "35mm" ? ML_PER_35MM_ROLL : ML_PER_120_ROLL;
      return numberOfRolls * mlPerRoll;
    default:
      return volume;
  }
}

/**
 * Formats volume for display with appropriate unit and precision
 */
function formatVolume(
  volumeML: number,
  displayUnit: VolumeUnit = "ml",
): string {
  switch (displayUnit) {
    case "ml":
      return volumeML < 1000
        ? `${Math.round(volumeML)}ml`
        : `${(volumeML / 1000).toFixed(1)}L`;
    case "oz":
      const flOz = volumeML / ML_PER_FL_OZ;
      return `${flOz.toFixed(1)}fl oz`;
    default:
      return `${Math.round(volumeML)}ml`;
  }
}

export const useChemistryCalculator = (): ChemistryCalculatorState &
  ChemistryCalculatorActions => {
  // Input state
  const [totalVolume, setTotalVolumeState] = useState<string>("");
  const [unit, setUnit] = useState<VolumeUnit>("ml");
  const [filmFormat, setFilmFormat] = useState<FilmFormat>("35mm");
  const [numberOfRolls, setNumberOfRollsState] = useState<string>("1");
  const [selectedDilution, setSelectedDilution] = useState<string | null>(null);

  // Validation and calculations
  const { calculation, isValid, errors } = useMemo(() => {
    const errors: string[] = [];

    // Validate inputs
    const volumeNum = parseFloat(totalVolume);
    const rollsNum = parseInt(numberOfRolls);

    if (!totalVolume && unit !== "rolls") {
      errors.push("Total volume is required");
    }

    if (unit !== "rolls" && (isNaN(volumeNum) || volumeNum <= 0)) {
      errors.push("Total volume must be a positive number");
    }

    if (unit === "rolls" && (isNaN(rollsNum) || rollsNum <= 0)) {
      errors.push("Number of rolls must be a positive integer");
    }

    if (!selectedDilution) {
      errors.push("Please select a dilution ratio");
    }

    // If validation passes, calculate
    let calculation: ChemistryCalculation | null = null;

    if (errors.length === 0 && selectedDilution) {
      const inputVolume = unit === "rolls" ? rollsNum : volumeNum;
      const totalVolumeML = convertToML(
        inputVolume,
        unit,
        filmFormat,
        rollsNum,
      );
      const dilutionRatio = parseDilutionRatio(selectedDilution);

      const developerVolume = totalVolumeML * dilutionRatio;
      const waterVolume = totalVolumeML - developerVolume;

      calculation = {
        totalVolume: inputVolume,
        unit,
        filmFormat,
        numberOfRolls: rollsNum,
        totalVolumeML,
        developerVolume,
        waterVolume,
        totalVolumeDisplay: formatVolume(totalVolumeML),
        developerVolumeDisplay: formatVolume(developerVolume),
        waterVolumeDisplay: formatVolume(waterVolume),
      };
    }

    return {
      calculation,
      isValid: errors.length === 0,
      errors,
    };
  }, [totalVolume, unit, filmFormat, numberOfRolls, selectedDilution]);

  // Actions
  const setTotalVolume = useCallback((volume: string) => {
    setTotalVolumeState(volume);
  }, []);

  const setNumberOfRolls = useCallback((rolls: string) => {
    setNumberOfRollsState(rolls);
  }, []);

  const calculateFromRolls = useCallback(() => {
    const rollsNum = parseInt(numberOfRolls);
    if (!isNaN(rollsNum) && rollsNum > 0) {
      const mlPerRoll =
        filmFormat === "35mm" ? ML_PER_35MM_ROLL : ML_PER_120_ROLL;
      const totalML = rollsNum * mlPerRoll;
      setTotalVolumeState(totalML.toString());
      setUnit("ml");
    }
  }, [numberOfRolls, filmFormat]);

  const reset = useCallback(() => {
    setTotalVolumeState("");
    setUnit("ml");
    setFilmFormat("35mm");
    setNumberOfRollsState("1");
    setSelectedDilution(null);
  }, []);

  return {
    // State
    totalVolume,
    unit,
    filmFormat,
    numberOfRolls,
    selectedDilution,
    calculation,
    isValid,
    errors,

    // Actions
    setTotalVolume,
    setUnit,
    setFilmFormat,
    setNumberOfRolls,
    setSelectedDilution,
    calculateFromRolls,
    reset,
  };
};
