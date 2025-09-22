interface BorderPresetSettings {
  aspectRatio: string;
  paperSize: string;
  customAspectWidth: number;
  customAspectHeight: number;
  customPaperWidth: number;
  customPaperHeight: number;
  minBorder: number;
  enableOffset: boolean;
  ignoreMinBorder: boolean;
  horizontalOffset: number;
  verticalOffset: number;
  showBlades: boolean;
  isLandscape: boolean;
  isRatioFlipped: boolean;
}

interface BorderCalculatorState extends BorderPresetSettings {
  lastValidCustomAspectWidth: number;
  lastValidCustomAspectHeight: number;
  lastValidCustomPaperWidth: number;
  lastValidCustomPaperHeight: number;
  lastValidMinBorder: number;
}

interface BorderPreset {
  id: string;
  name: string;
  settings: BorderPresetSettings;
}

export type { BorderPresetSettings, BorderPreset, BorderCalculatorState };
