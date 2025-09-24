export interface ExposureCalculatorState {
  originalTime: string;
  stops: string;
  newTime: string;
}

export interface ExposureCalculation {
  originalTimeValue: number;
  stopsValue: number;
  newTimeValue: number;
  addedTime: number;
  percentageIncrease: number;
  isValid: boolean;
}

export interface ExposurePreset {
  label: string;
  stops: number;
}

export const EXPOSURE_PRESETS: ExposurePreset[] = [
  { label: '-1', stops: -1 },
  { label: '-1/2', stops: -0.5 },
  { label: '-1/3', stops: -1 / 3 },
  { label: '+1/3', stops: 1 / 3 },
  { label: '+1/2', stops: 0.5 },
  { label: '+1', stops: 1 },
];
