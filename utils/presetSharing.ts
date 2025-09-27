import { Buffer } from "buffer";
import { ASPECT_RATIOS, PAPER_SIZES } from "@/constants/border";
import type {
  BorderPreset,
  BorderPresetSettings,
} from "@/types/borderPresetTypes";
import { debugLog } from "@/utils/debugLogger";

const findIndexByValue = (arr: readonly { value: string }[], value: string) =>
  arr.findIndex((item) => item.value === value);

const getBooleanBitmask = (settings: BorderPresetSettings): number => {
  let mask = 0;
  if (settings.enableOffset) mask |= 1;
  if (settings.ignoreMinBorder) mask |= 2;
  if (settings.showBlades) mask |= 4;
  if (settings.isLandscape) mask |= 8;
  if (settings.isRatioFlipped) mask |= 16;
  return mask;
};

const fromBooleanBitmask = (
  mask: number,
): Pick<
  BorderPresetSettings,
  | "enableOffset"
  | "ignoreMinBorder"
  | "showBlades"
  | "isLandscape"
  | "isRatioFlipped"
> => ({
  enableOffset: (mask & 1) !== 0,
  ignoreMinBorder: (mask & 2) !== 0,
  showBlades: (mask & 4) !== 0,
  isLandscape: (mask & 8) !== 0,
  isRatioFlipped: (mask & 16) !== 0,
});

export const encodePreset = (preset: {
  name: string;
  settings: BorderPresetSettings;
}): string => {
  try {
    debugLog("🔧 [PRESET ENCODE] Starting encoding for preset:", preset);
    const { name, settings } = preset;
    const parts: (string | number)[] = [];

    parts.push(encodeURIComponent(name));

    const aspectRatioIndex = findIndexByValue(
      ASPECT_RATIOS,
      settings.aspectRatio,
    );
    const paperSizeIndex = findIndexByValue(PAPER_SIZES, settings.paperSize);

    debugLog(
      "🔧 [PRESET ENCODE] Aspect ratio index:",
      aspectRatioIndex,
      "Paper size index:",
      paperSizeIndex,
    );

    if (aspectRatioIndex === -1 || paperSizeIndex === -1) {
      debugLog("🔧 [PRESET ENCODE] Invalid aspect ratio or paper size");
      throw new Error("Invalid aspect ratio or paper size");
    }

    parts.push(aspectRatioIndex);
    parts.push(paperSizeIndex);
    parts.push(Math.round(settings.minBorder * 100));
    parts.push(Math.round(settings.horizontalOffset * 100));
    // Encode negative numbers by adding 10000 to make them positive
    parts.push(Math.round(settings.verticalOffset * 100) + 10000);
    parts.push(getBooleanBitmask(settings));

    if (settings.aspectRatio === "custom") {
      parts.push(Math.round(settings.customAspectWidth * 100));
      parts.push(Math.round(settings.customAspectHeight * 100));
    }
    if (settings.paperSize === "custom") {
      parts.push(Math.round(settings.customPaperWidth * 100));
      parts.push(Math.round(settings.customPaperHeight * 100));
    }

    const rawString = parts.join("-");
    debugLog("🔧 [PRESET ENCODE] Raw string before encoding:", rawString);
    const encoded = Buffer.from(rawString)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    debugLog("🔧 [PRESET ENCODE] Final encoded string:", encoded);
    return encoded;
  } catch (error) {
    debugLog("🔧 [PRESET ENCODE] Error encoding preset:", error);
    console.error("Failed to encode preset:", error);
    return "";
  }
};

export const decodePreset = (
  encoded: string,
): { name: string; settings: BorderPresetSettings } | null => {
  try {
    debugLog("🔧 [PRESET DECODE] Starting decode for encoded string:", encoded);
    let base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
    debugLog("🔧 [PRESET DECODE] Base64 after padding:", base64);
    const rawString = Buffer.from(base64, "base64").toString("ascii");
    debugLog("🔧 [PRESET DECODE] Raw decoded string:", rawString);
    const stringParts = rawString.split("-");
    debugLog("🔧 [PRESET DECODE] String parts:", stringParts);

    const name = decodeURIComponent(stringParts.shift() || "");
    const parts = stringParts.map(Number);
    debugLog("🔧 [PRESET DECODE] Preset name:", name, "Numeric parts:", parts);

    let partIndex = 0;
    const aspectRatioIndex = parts[partIndex++];
    const paperSizeIndex = parts[partIndex++];
    const minBorder = parts[partIndex++] / 100;
    const horizontalOffset = parts[partIndex++] / 100;
    // Decode negative numbers by subtracting 10000
    const verticalOffset = (parts[partIndex++] - 10000) / 100;
    const boolMask = parts[partIndex++];

    const aspectRatio = ASPECT_RATIOS[aspectRatioIndex]?.value;
    const paperSize = PAPER_SIZES[paperSizeIndex]?.value;

    debugLog(
      "🔧 [PRESET DECODE] Decoded aspect ratio:",
      aspectRatio,
      "paper size:",
      paperSize,
    );

    if (!aspectRatio || !paperSize) {
      debugLog("🔧 [PRESET DECODE] Invalid aspect ratio or paper size index");
      throw new Error("Invalid aspect ratio or paper size index");
    }

    const settings: BorderPresetSettings = {
      aspectRatio,
      paperSize,
      minBorder,
      horizontalOffset,
      verticalOffset,
      ...fromBooleanBitmask(boolMask),
      customAspectWidth: 0,
      customAspectHeight: 0,
      customPaperWidth: 0,
      customPaperHeight: 0,
    };

    if (settings.aspectRatio === "custom") {
      settings.customAspectWidth = parts[partIndex++] / 100;
      settings.customAspectHeight = parts[partIndex++] / 100;
    }
    if (settings.paperSize === "custom") {
      settings.customPaperWidth = parts[partIndex++] / 100;
      settings.customPaperHeight = parts[partIndex++] / 100;
    }

    const result = { name, settings };
    debugLog("🔧 [PRESET DECODE] Successfully decoded preset:", result);
    return result;
  } catch (error) {
    debugLog("🔧 [PRESET DECODE] Error decoding preset:", error);
    console.error("Failed to decode preset:", error);
    return null;
  }
};
