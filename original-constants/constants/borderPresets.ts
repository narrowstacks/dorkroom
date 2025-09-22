import type { BorderPreset } from "@/types/borderPresetTypes";

export const DEFAULT_BORDER_PRESETS: BorderPreset[] = [
  {
    id: "default-35mm-8x10",
    name: "35mm on 8x10",
    settings: {
      aspectRatio: "3/2",
      paperSize: "8x10",
      customAspectWidth: 3,
      customAspectHeight: 2,
      customPaperWidth: 8,
      customPaperHeight: 10,
      minBorder: 0.5,
      enableOffset: false,
      ignoreMinBorder: false,
      horizontalOffset: 0,
      verticalOffset: 0,
      showBlades: false,
      isLandscape: true,
      isRatioFlipped: false,
    },
  },
  {
    id: "default-6x7-11x14",
    name: "6x7 on 11x14",
    settings: {
      aspectRatio: "7/6",
      paperSize: "11x14",
      customAspectWidth: 7,
      customAspectHeight: 6,
      customPaperWidth: 11,
      customPaperHeight: 14,
      minBorder: 0.5,
      enableOffset: false,
      ignoreMinBorder: false,
      horizontalOffset: 0,
      verticalOffset: 0,
      showBlades: false,
      isLandscape: true,
      isRatioFlipped: false,
    },
  },
];

export default { DEFAULT_BORDER_PRESETS };
