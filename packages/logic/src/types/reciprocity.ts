export interface ReciprocityFilmType {
  label: string;
  value: string;
  factor?: number;
}

export interface ReciprocityCalculation {
  originalTime: number;
  adjustedTime: number;
  factor: number;
  filmName: string;
  percentageIncrease: number;
  timeBarWidth: number;
  adjustedTimeBarWidth: number;
}

export interface ReciprocityCalculatorState {
  filmType: string;
  setFilmType: (value: string) => void;
  meteredTime: string;
  setMeteredTime: (value: string) => void;
  setMeteredTimeDirectly: (value: string) => void;
  customFactor: string;
  setCustomFactor: (value: string) => void;
  formattedTime: string | null;
  timeFormatError: string | null;
  calculation: ReciprocityCalculation | null;
  formatTime: (seconds: number) => string;
}
