import type {
  BorderCalculatorState,
  BorderPreset,
  BorderPresetSettings,
  PaperSize,
  SelectItem,
  useGeometryCalculations,
} from '@dorkroom/logic';
import { createContext, use } from 'react';
import type { FormInstance } from '../../forms/utils/form-api-types';

type GeometryCalculationResult = ReturnType<
  typeof useGeometryCalculations
>['calculation'];

export interface BorderCalculatorContextValue {
  form: FormInstance;
  formValues: BorderCalculatorState;
  calculation: GeometryCalculationResult | null;
  paperWidthInput: string;
  paperHeightInput: string;
  displayPaperSizes: PaperSize[];
  quarterRoundedMinBorder: number | null;
  maxAllowedMinBorder: number;

  // Warnings
  offsetWarning: string | null;
  bladeWarning: string | null;
  minBorderWarning: string | null;
  paperSizeWarning: string | null;

  // Presets & Sharing
  presets: BorderPreset[];
  presetItems: SelectItem[];
  selectedPresetId: string | null;
  presetName: string;
  isEditingPreset: boolean;
  isSharing: boolean;
  isGeneratingShareUrl: boolean;
  isShareModalOpen: boolean;
  isSaveBeforeShareOpen: boolean;
  shareUrls: { webUrl: string } | null;
  canShareNatively: boolean;
  canCopyToClipboard: boolean;
  loadedPreset?: {
    name: string;
    settings: BorderPresetSettings;
    isFromUrl?: boolean;
  } | null;

  // Handlers
  handlePaperWidthChange: (value: string) => void;
  handlePaperWidthBlur: () => void;
  handlePaperHeightChange: (value: string) => void;
  handlePaperHeightBlur: () => void;
  handleRoundMinBorderToQuarter: () => void;
  resetToDefaults: () => void;

  // Preset Handlers
  handleSelectPreset: (id: string) => void;
  setPresetName: (name: string) => void;
  setIsEditingPreset: (isEditing: boolean) => void;
  savePreset: (name: string) => void;
  // Both optional, mirroring usePresetManagement: an omitted `settings` means
  // "use the live calculator settings". Declaring them required is what forced
  // callers to fabricate an empty settings object and silently wipe a preset.
  updatePresetHandler: (
    id?: string,
    data?: { name?: string; settings?: BorderPresetSettings }
  ) => void;
  deletePresetHandler: (id: string) => void;
  clearLoadedPreset?: () => void;
  applyPresetSettings: (settings: BorderPresetSettings) => void;

  // Sharing Handlers
  handleShareClick: () => void;
  handleSaveAndShare: (name: string) => void;
  handleCopyToClipboard: (url: string) => Promise<void>;
  handleNativeShare: () => Promise<void>;
  setIsShareModalOpen: (isOpen: boolean) => void;
  setIsSaveBeforeShareOpen: (isOpen: boolean) => void;

  // Helpers
  formatWithUnit: (value: number) => string;
  formatDimensions: (
    width: number,
    height: number,
    options?: { precision?: number; maxPrecision?: number }
  ) => string;
  currentSettings: BorderPresetSettings;
}

export const BorderCalculatorContext = createContext<
  BorderCalculatorContextValue | undefined
>(undefined);

export function useBorderCalculator(): BorderCalculatorContextValue {
  const context = use(BorderCalculatorContext);
  if (context === undefined) {
    throw new Error(
      'useBorderCalculator must be used within a BorderCalculatorProvider'
    );
  }
  return context;
}
