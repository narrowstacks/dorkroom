import type {
  BorderCalculatorState,
  BorderPreset,
  BorderPresetSettings,
  PaperSize,
  SelectItem,
  useGeometryCalculations,
} from '@dorkroom/logic';
import type { FormInstance } from '../../forms/utils/form-api-types';

type GeometryCalculationResult = ReturnType<
  typeof useGeometryCalculations
>['calculation'];

export interface BorderCalculatorLayoutProps {
  isDesktop: boolean;
  form: FormInstance<BorderCalculatorState>;
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
  updatePresetHandler: (
    id: string,
    data: { name: string; settings: BorderPresetSettings }
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
  formatDimensions: (width: number, height: number) => string;
  currentSettings: BorderPresetSettings;
}
