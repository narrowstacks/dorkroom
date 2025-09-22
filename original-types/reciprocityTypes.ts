// Types for Reciprocity Calculator

// Film type with name, value, and reciprocity factor
export interface FilmType {
  label: string;
  value: string;
  factor: number;
}

// Result of reciprocity calculation
export interface ReciprocityCalculation {
  // Original metered time in seconds
  originalTime: number;

  // Adjusted time after applying reciprocity factor
  adjustedTime: number;

  // Factor used in calculation
  factor: number;

  // Name of the film being used
  filmName: string;

  // Percentage increase from original time
  percentageIncrease: number;

  // For visual representation
  timeBarWidth: number;
  adjustedTimeBarWidth: number;
}

type ReciprocityTypes = {
  FilmType: FilmType;
  ReciprocityCalculation: ReciprocityCalculation;
};

export default {} as ReciprocityTypes;
