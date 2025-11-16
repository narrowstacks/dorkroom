import { useState, useMemo, useEffect } from 'react';
import { useForm } from '@tanstack/react-form';
import {
  RotateCw,
  RotateCcw,
  Square,
  Share2,
  Save,
  Trash2,
} from 'lucide-react';
// UI Components from @dorkroom/ui package
import {
  LabeledSliderInput,
  TextInput,
  DimensionInputGroup,
  ToggleSwitch,
  Select,
  WarningAlert,
  CalculatorCard,
  CalculatorStat,
  ShareModal,
  SaveBeforeShareModal,
  useMeasurementFormatter,
  useMeasurementConverter,
} from '@dorkroom/ui';
import { borderCalculatorSchema } from '@dorkroom/ui/forms';
import {
  AnimatedPreview,
  BorderInfoSection,
  MobileBorderCalculator,
} from '../../components/border-calculator';

// Constants and hooks
import {
  useBorderPresets,
  useWindowDimensions,
  usePresetSharing,
  useUrlPresetLoader,
  shallowEqual,
  type BorderCalculation,
  type BorderSettings,
  type SelectItem,
  DESKTOP_BREAKPOINT,
  SLIDER_MIN_BORDER,
  SLIDER_MAX_BORDER,
  SLIDER_STEP_BORDER,
  BORDER_SLIDER_LABELS,
  OFFSET_SLIDER_MIN,
  OFFSET_SLIDER_MAX,
  OFFSET_SLIDER_STEP,
  OFFSET_SLIDER_LABELS,
  ASPECT_RATIOS,
  PAPER_SIZES,
  DEFAULT_BORDER_PRESETS,
} from '@dorkroom/logic';

// Helper function to calculate border configuration
function calculateBorderConfiguration(
  aspectRatio: string,
  customAspectWidth: number,
  customAspectHeight: number,
  paperSize: string,
  customPaperWidth: number,
  customPaperHeight: number,
  minBorder: number,
  enableOffset: boolean,
  ignoreMinBorder: boolean,
  horizontalOffset: number,
  verticalOffset: number,
  isLandscape: boolean,
  isRatioFlipped: boolean
): BorderCalculation | null {
  let ratioWidth = 2;
  let ratioHeight = 3;

  if (aspectRatio === 'custom') {
    ratioWidth = customAspectWidth;
    ratioHeight = customAspectHeight;
  } else {
    const [w, h] = aspectRatio.split(':').map(Number);
    ratioWidth = w;
    ratioHeight = h;
  }

  if (isRatioFlipped) {
    [ratioWidth, ratioHeight] = [ratioHeight, ratioWidth];
  }

  let paperW = 8;
  let paperH = 10;

  if (paperSize === 'custom') {
    paperW = customPaperWidth;
    paperH = customPaperHeight;
  } else {
    const [w, h] = paperSize.split('x').map(Number);
    paperW = w;
    paperH = h;
  }

  if (isLandscape) {
    [paperW, paperH] = [paperH, paperW];
  }

  const aspectRatioValue = ratioWidth / ratioHeight;
  const availableWidth = paperW - 2 * minBorder;
  const availableHeight = paperH - 2 * minBorder;

  let printWidth: number;
  let printHeight: number;

  if (availableWidth <= 0 || availableHeight <= 0) {
    printWidth = 0;
    printHeight = 0;
  } else if (availableWidth / availableHeight > aspectRatioValue) {
    printHeight = availableHeight;
    printWidth = printHeight * aspectRatioValue;
  } else {
    printWidth = availableWidth;
    printHeight = printWidth / aspectRatioValue;
  }

  // Clamp offsets based on enableOffset and ignoreMinBorder flags
  const halfW = (paperW - printWidth) / 2;
  const halfH = (paperH - printHeight) / 2;

  // Only apply offsets if enableOffset is true
  const effectiveHorizontalOffset = enableOffset ? horizontalOffset : 0;
  const effectiveVerticalOffset = enableOffset ? verticalOffset : 0;

  // Calculate max allowed offsets
  const maxH = ignoreMinBorder ? halfW : Math.min(halfW - minBorder, halfW);
  const maxV = ignoreMinBorder ? halfH : Math.min(halfH - minBorder, halfH);

  // Clamp the offsets
  const clampedH = Math.max(-maxH, Math.min(maxH, effectiveHorizontalOffset));
  const clampedV = Math.max(-maxV, Math.min(maxV, effectiveVerticalOffset));

  // Calculate borders
  const leftBorder = halfW - clampedH;
  const rightBorder = halfW + clampedH;
  const topBorder = halfH + clampedV;
  const bottomBorder = halfH - clampedV;

  // Calculate blade readings using the proper formula
  const leftBladeReading = printWidth - 2 * (clampedH);
  const rightBladeReading = printWidth + 2 * (clampedH);
  const topBladeReading = printHeight - 2 * (clampedV);
  const bottomBladeReading = printHeight + 2 * (clampedV);

  return {
    leftBorder,
    rightBorder,
    topBorder,
    bottomBorder,
    printWidth,
    printHeight,
    paperWidth: paperW,
    paperHeight: paperH,
    printWidthPercent: paperW > 0 ? (printWidth / paperW) * 100 : 0,
    printHeightPercent: paperH > 0 ? (printHeight / paperH) * 100 : 0,
    leftBorderPercent: paperW > 0 ? (leftBorder / paperW) * 100 : 0,
    rightBorderPercent: paperW > 0 ? (rightBorder / paperW) * 100 : 0,
    topBorderPercent: paperH > 0 ? (topBorder / paperH) * 100 : 0,
    bottomBorderPercent: paperH > 0 ? (bottomBorder / paperH) * 100 : 0,
    leftBladeReading,
    rightBladeReading,
    topBladeReading,
    bottomBladeReading,
    bladeThickness: 0.125,
    isNonStandardPaperSize: paperSize === 'custom',
    easelSize: { width: paperW, height: paperH },
    easelSizeLabel: `${paperW}"x${paperH}"`,
    offsetWarning: null,
    bladeWarning: null,
    minBorderWarning: null,
    paperSizeWarning: null,
    lastValidMinBorder: minBorder,
    clampedHorizontalOffset: clampedH,
    clampedVerticalOffset: clampedV,
    previewScale: 1,
    previewWidth: 200,
    previewHeight: 160,
  };
}

export default function BorderCalculatorPage() {
  const { width } = useWindowDimensions();
  const isDesktop = width > DESKTOP_BREAKPOINT;
  const { formatWithUnit, formatDimensions, unit } = useMeasurementFormatter();
  const { toInches, toDisplay } = useMeasurementConverter();

  // Initialize form with TanStack Form
  const form = useForm({
    defaultValues: {
      aspectRatio: '2:3' as const,
      customAspectWidth: 2,
      customAspectHeight: 3,
      paperSize: '8x10' as const,
      customPaperWidth: 8,
      customPaperHeight: 10,
      minBorder: 0.5,
      enableOffset: false,
      ignoreMinBorder: false,
      horizontalOffset: 0,
      verticalOffset: 0,
      showBlades: true,
      showBladeReadings: false,
      isLandscape: false,
      isRatioFlipped: false,
      selectedPresetId: '',
      presetName: '',
      isEditingPreset: false,
    },
    validators: {
      onChange: borderCalculatorSchema,
    },
  });

  const { presets, addPreset, updatePreset, removePreset } = useBorderPresets();

  // Helper function to reset form to defaults
  const resetToDefaults = () => {
    form.setFieldValue('aspectRatio', '2:3');
    form.setFieldValue('paperSize', '8x10');
    form.setFieldValue('customAspectWidth', 2);
    form.setFieldValue('customAspectHeight', 3);
    form.setFieldValue('customPaperWidth', 8);
    form.setFieldValue('customPaperHeight', 10);
    form.setFieldValue('minBorder', 0.5);
    form.setFieldValue('enableOffset', false);
    form.setFieldValue('ignoreMinBorder', false);
    form.setFieldValue('horizontalOffset', 0);
    form.setFieldValue('verticalOffset', 0);
    form.setFieldValue('showBlades', true);
    form.setFieldValue('isLandscape', false);
    form.setFieldValue('isRatioFlipped', false);
  };

  // Helper function to apply preset settings
  const applyPreset = (settings: BorderSettings) => {
    form.setFieldValue('aspectRatio', settings.aspectRatio);
    form.setFieldValue('paperSize', settings.paperSize);
    form.setFieldValue('customAspectWidth', settings.customAspectWidth);
    form.setFieldValue('customAspectHeight', settings.customAspectHeight);
    form.setFieldValue('customPaperWidth', settings.customPaperWidth);
    form.setFieldValue('customPaperHeight', settings.customPaperHeight);
    form.setFieldValue('minBorder', settings.minBorder);
    form.setFieldValue('enableOffset', settings.enableOffset);
    form.setFieldValue('ignoreMinBorder', settings.ignoreMinBorder);
    form.setFieldValue('horizontalOffset', settings.horizontalOffset);
    form.setFieldValue('verticalOffset', settings.verticalOffset);
    form.setFieldValue('showBlades', settings.showBlades);
    form.setFieldValue('showBladeReadings', settings.showBladeReadings);
    form.setFieldValue('isLandscape', settings.isLandscape);
    form.setFieldValue('isRatioFlipped', settings.isRatioFlipped);
  };

  // Local string state for custom paper dimensions (in display units)
  const customPaperWidth = form.getFieldValue('customPaperWidth');
  const customPaperHeight = form.getFieldValue('customPaperHeight');
  const [paperWidthInput, setPaperWidthInput] = useState(
    String(toDisplay(customPaperWidth))
  );
  const [paperHeightInput, setPaperHeightInput] = useState(
    String(toDisplay(customPaperHeight))
  );
  const [isEditingPaperWidth, setIsEditingPaperWidth] = useState(false);
  const [isEditingPaperHeight, setIsEditingPaperHeight] = useState(false);

  // Sync local state when parent state or unit changes (but not while editing)
  useEffect(() => {
    if (!isEditingPaperWidth) {
      const displayValue = toDisplay(customPaperWidth);
      // Round to 3 decimals to avoid floating point artifacts
      setPaperWidthInput(String(Math.round(displayValue * 1000) / 1000));
    }
  }, [customPaperWidth, toDisplay, isEditingPaperWidth]);

  useEffect(() => {
    if (!isEditingPaperHeight) {
      const displayValue = toDisplay(customPaperHeight);
      // Round to 3 decimals to avoid floating point artifacts
      setPaperHeightInput(String(Math.round(displayValue * 1000) / 1000));
    }
  }, [customPaperHeight, toDisplay, isEditingPaperHeight]);

  // Helper to validate and convert input to inches
  const validateAndConvert = (value: string): number | null => {
    // Allow empty, whitespace, or trailing decimal point
    if (value === '' || /^\s*$/.test(value) || /^\d*\.$/.test(value)) {
      return null;
    }

    const parsed = parseFloat(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return toInches(parsed);
    }

    return null;
  };

  // Handle width input change
  const handlePaperWidthChange = (value: string) => {
    setIsEditingPaperWidth(true);
    setPaperWidthInput(value);

    // Push valid changes to parent state immediately for live recomputation
    const inches = validateAndConvert(value);
    if (inches !== null) {
      form.setFieldValue('customPaperWidth', inches);
    }
  };

  // Handle width blur - convert to inches when stable
  const handlePaperWidthBlur = () => {
    setIsEditingPaperWidth(false);
    const inches = validateAndConvert(paperWidthInput);
    if (inches !== null) {
      form.setFieldValue('customPaperWidth', inches);
      // Format the display value to avoid floating point precision artifacts
      const displayValue = toDisplay(inches);
      setPaperWidthInput(String(Math.round(displayValue * 1000) / 1000));
    } else if (paperWidthInput === '' || /^\s*$/.test(paperWidthInput)) {
      // Reset to current value if empty
      setPaperWidthInput(String(toDisplay(customPaperWidth)));
    } else {
      // Reset to current value if invalid
      setPaperWidthInput(String(toDisplay(customPaperWidth)));
    }
  };

  // Handle height input change
  const handlePaperHeightChange = (value: string) => {
    setIsEditingPaperHeight(true);
    setPaperHeightInput(value);

    // Push valid changes to parent state immediately for live recomputation
    const inches = validateAndConvert(value);
    if (inches !== null) {
      form.setFieldValue('customPaperHeight', inches);
    }
  };

  // Handle height blur - convert to inches when stable
  const handlePaperHeightBlur = () => {
    setIsEditingPaperHeight(false);
    const inches = validateAndConvert(paperHeightInput);
    if (inches !== null) {
      form.setFieldValue('customPaperHeight', inches);
      // Format the display value to avoid floating point precision artifacts
      const displayValue = toDisplay(inches);
      setPaperHeightInput(String(Math.round(displayValue * 1000) / 1000));
    } else if (paperHeightInput === '' || /^\s*$/.test(paperHeightInput)) {
      // Reset to current value if empty
      setPaperHeightInput(String(toDisplay(customPaperWidth)));
    } else {
      // Reset to current value if invalid
      setPaperHeightInput(String(toDisplay(customPaperHeight)));
    }
  };

  // Transform paper sizes to show metric with imperial reference when in metric mode
  const displayPaperSizes = useMemo(() => {
    return PAPER_SIZES.map((size) => {
      if (size.value === 'custom') {
        return size; // Keep "Custom Paper Size" as is
      }

      if (unit === 'metric') {
        // Show metric dimensions with imperial reference
        // e.g., "20×25cm (8×10in)"
        const metricLabel = formatDimensions(size.width, size.height);
        const imperialLabel = `${size.width}×${size.height}in`;
        return {
          ...size,
          label: `${metricLabel} (${imperialLabel})`,
        };
      }

      // In imperial mode, keep original labels
      return size;
    });
  }, [unit, formatDimensions]);

  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [presetName, setPresetName] = useState('');
  const [isEditingPreset, setIsEditingPreset] = useState(false);

  // Sharing state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSaveBeforeShareOpen, setIsSaveBeforeShareOpen] = useState(false);
  const [shareUrls, setShareUrls] = useState<{
    webUrl: string;
    nativeUrl: string;
  } | null>(null);
  const [isGeneratingShareUrl, setIsGeneratingShareUrl] = useState(false);

  // Get current form values for settings
  const getCurrentSettings = useMemo(() => {
    return {
      aspectRatio: form.getFieldValue('aspectRatio'),
      paperSize: form.getFieldValue('paperSize'),
      customAspectWidth: form.getFieldValue('customAspectWidth'),
      customAspectHeight: form.getFieldValue('customAspectHeight'),
      customPaperWidth: form.getFieldValue('customPaperWidth'),
      customPaperHeight: form.getFieldValue('customPaperHeight'),
      minBorder: form.getFieldValue('minBorder'),
      enableOffset: form.getFieldValue('enableOffset'),
      ignoreMinBorder: form.getFieldValue('ignoreMinBorder'),
      horizontalOffset: form.getFieldValue('horizontalOffset'),
      verticalOffset: form.getFieldValue('verticalOffset'),
      showBlades: form.getFieldValue('showBlades'),
      showBladeReadings: form.getFieldValue('showBladeReadings'),
      isLandscape: form.getFieldValue('isLandscape'),
      isRatioFlipped: form.getFieldValue('isRatioFlipped'),
    };
  }, [form]);

  // Sharing hooks
  const {
    sharePreset,
    getSharingUrls,
    canShareNatively,
    canCopyToClipboard,
    isSharing,
  } = usePresetSharing({
    onShareSuccess: (result) => {
      if (result.method === 'clipboard') {
        // Show success toast for clipboard copy
        console.log('Preset link copied to clipboard!');
      } else if (result.method === 'native') {
        setIsShareModalOpen(false);
      }
    },
    onShareError: (error) => {
      console.error('Sharing failed:', error);
    },
  });

  // URL preset loader
  const { loadedPreset, clearLoadedPreset } = useUrlPresetLoader({
    onPresetLoaded: (preset) => {
      applyPreset(preset.settings);
      setPresetName(preset.name);
      console.log(`Preset "${preset.name}" loaded from URL!`);
    },
    onLoadError: (error) => {
      console.error('Failed to load preset from URL:', error);
    },
  });

  const presetItems = useMemo(
    () => [
      ...presets.map((p) => ({ label: p.name, value: p.id })),
      { label: '────────', value: '__divider__' },
      ...DEFAULT_BORDER_PRESETS.map((p) => ({ label: p.name, value: p.id })),
    ],
    [presets]
  );

  const handleSelectPreset = (id: string) => {
    if (id === '__divider__') return;
    setSelectedPresetId(id);
    const preset =
      presets.find((p) => p.id === id) ||
      DEFAULT_BORDER_PRESETS.find((p) => p.id === id);
    if (preset) {
      applyPreset(preset.settings);
      setPresetName(preset.name);
      setIsEditingPreset(false);
    }
  };

  const savePreset = () => {
    if (!presetName.trim()) return;
    const newPreset = {
      id: 'user-' + Date.now(),
      name: presetName.trim(),
      settings: getCurrentSettings,
    };
    addPreset(newPreset);
    setSelectedPresetId(newPreset.id);
    setIsEditingPreset(false);
  };

  const updatePresetHandler = () => {
    if (!selectedPresetId) return;
    const updated = { name: presetName.trim(), settings: getCurrentSettings };
    updatePreset(selectedPresetId, updated);
    setIsEditingPreset(false);
  };

  const deletePresetHandler = () => {
    if (!selectedPresetId) return;
    removePreset(selectedPresetId);
    setSelectedPresetId('');
    setPresetName('');
    setIsEditingPreset(false);
  };

  // Sharing handlers
  const handleShareClick = async () => {
    setIsGeneratingShareUrl(true);

    try {
      // Check if current settings match a saved preset
      const matchedPreset = presets.find((p) =>
        shallowEqual(p.settings, getCurrentSettings)
      );

      if (matchedPreset) {
        // If it's a saved preset, share it directly
        const urls = getSharingUrls({
          name: matchedPreset.name,
          settings: getCurrentSettings,
        });
        if (urls) {
          setShareUrls(urls);
          setIsShareModalOpen(true);
        } else {
          console.error('Failed to generate sharing URLs for saved preset');
          // Still open modal to show error state
          setShareUrls(null);
          setIsShareModalOpen(true);
        }
      } else {
        // If not saved, check if user has a preset name already entered
        if (presetName.trim()) {
          // User has entered a name, generate URLs and share directly
          const urls = getSharingUrls({
            name: presetName.trim(),
            settings: getCurrentSettings,
          });
          if (urls) {
            setShareUrls(urls);
            setIsShareModalOpen(true);
          } else {
            console.error('Failed to generate sharing URLs for named settings');
            setShareUrls(null);
            setIsShareModalOpen(true);
          }
        } else {
          // No name entered, open save-before-share modal
          setIsSaveBeforeShareOpen(true);
        }
      }
    } catch (error) {
      console.error('Error during share URL generation:', error);
      setShareUrls(null);
      setIsShareModalOpen(true);
    } finally {
      setIsGeneratingShareUrl(false);
    }
  };

  const handleSaveAndShare = async (name: string) => {
    setIsGeneratingShareUrl(true);

    try {
      // Create and save the new preset
      const newPreset = {
        id: 'user-' + Date.now(),
        name,
        settings: getCurrentSettings,
      };
      addPreset(newPreset);
      setPresetName(name);
      setSelectedPresetId(newPreset.id);

      // Generate share URLs and open share modal
      const urls = getSharingUrls({ name, settings: getCurrentSettings });
      setIsSaveBeforeShareOpen(false);

      if (urls) {
        setShareUrls(urls);
        setIsShareModalOpen(true);
      } else {
        console.error('Failed to generate sharing URLs after saving preset');
        // Still open modal to show error state
        setShareUrls(null);
        setIsShareModalOpen(true);
      }
    } catch (error) {
      console.error('Error during save and share:', error);
      setIsSaveBeforeShareOpen(false);
      setShareUrls(null);
      setIsShareModalOpen(true);
    } finally {
      setIsGeneratingShareUrl(false);
    }
  };

  const handleCopyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      throw error;
    }
  };

  const handleNativeShare = async () => {
    if (!shareUrls) return;

    try {
      await sharePreset(
        {
          name: presetName || 'Border Calculator Settings',
          settings: getCurrentSettings,
        },
        false // prefer native share
      );
    } catch (error) {
      console.error('Native share failed:', error);
      throw error;
    }
  };

  // If not desktop, use mobile UI
  if (!isDesktop) {
    return (
      <MobileBorderCalculator
        loadedPresetFromUrl={loadedPreset}
        clearLoadedPreset={clearLoadedPreset}
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 pb-16 pt-12 sm:px-10">
      <div className="mt-2 grid gap-2 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="space-y-6">
          <form.Subscribe
            selector={(state) => {
              const calculation = calculateBorderConfiguration(
                state.values.aspectRatio,
                state.values.customAspectWidth,
                state.values.customAspectHeight,
                state.values.paperSize,
                state.values.customPaperWidth,
                state.values.customPaperHeight,
                state.values.minBorder,
                state.values.enableOffset,
                state.values.ignoreMinBorder,
                state.values.horizontalOffset,
                state.values.verticalOffset,
                state.values.isLandscape,
                state.values.isRatioFlipped
              );

              // Calculate warnings
              let bladeWarning: string | null = null;
              let minBorderWarning: string | null = null;
              let paperSizeWarning: string | null = null;

              if (calculation && state.values.enableOffset) {
                const {
                  leftBladeReading,
                  rightBladeReading,
                  topBladeReading,
                  bottomBladeReading,
                } = calculation;

                if (
                  leftBladeReading < 0 ||
                  rightBladeReading < 0 ||
                  topBladeReading < 0 ||
                  bottomBladeReading < 0
                ) {
                  bladeWarning = 'Image extends beyond paper edges with current offset';
                }
              }

              if (calculation) {
                const {
                  leftBladeReading,
                  rightBladeReading,
                  topBladeReading,
                  bottomBladeReading,
                } = calculation;

                if (
                  leftBladeReading < 0.125 ||
                  rightBladeReading < 0.125 ||
                  topBladeReading < 0.125 ||
                  bottomBladeReading < 0.125
                ) {
                  bladeWarning = 'Blade positions may be too close to paper edge for reliable trimming';
                }
              }

              if (state.values.minBorder < 0.25) {
                minBorderWarning = 'Minimum border below 0.25" may result in difficult trimming';
              }

              if (
                state.values.paperSize === 'custom' &&
                (state.values.customPaperWidth < 4 || state.values.customPaperHeight < 4)
              ) {
                paperSizeWarning = 'Paper size may be too small for practical use';
              }

              return {
                calculation,
                showBlades: state.values.showBlades,
                showBladeReadings: state.values.showBladeReadings,
                isLandscape: state.values.isLandscape,
                isRatioFlipped: state.values.isRatioFlipped,
                bladeWarning,
                minBorderWarning,
                paperSizeWarning,
              };
            }}
            children={({ calculation, showBlades, showBladeReadings, isLandscape, isRatioFlipped, bladeWarning, minBorderWarning, paperSizeWarning }) =>
              calculation ? (
                <>
                  <CalculatorCard accent="violet" padding="compact">
                    <div className="flex justify-center">
                      <div className="relative">
                        <AnimatedPreview
                          calculation={calculation}
                          showBlades={showBlades}
                          showBladeReadings={showBladeReadings}
                          className="max-w-full"
                        />
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        onClick={() => form.setFieldValue('isLandscape', !isLandscape)}
                        className="flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 text-[color:var(--color-text-primary)] border-[color:var(--color-border-secondary)] bg-[rgba(var(--color-background-rgb),0.08)] hover:bg-[rgba(var(--color-background-rgb),0.14)] focus-visible:ring-[color:var(--color-border-primary)]"
                      >
                        <RotateCw className="h-4 w-4" />
                        Flip Paper
                      </button>
                      <button
                        onClick={() => form.setFieldValue('isRatioFlipped', !isRatioFlipped)}
                        className="flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 text-[color:var(--color-text-primary)] border-[color:var(--color-border-secondary)] bg-[rgba(var(--color-background-rgb),0.08)] hover:bg-[rgba(var(--color-background-rgb),0.14)] focus-visible:ring-[color:var(--color-border-primary)]"
                      >
                        <Square className="h-4 w-4" />
                        Flip Ratio
                      </button>
                    </div>
                    <button
                      onClick={resetToDefaults}
                      className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 hover:brightness-110"
                      style={{
                        color: 'var(--color-accent)',
                        borderColor: 'var(--color-accent)',
                        borderWidth: 1,
                        backgroundColor: 'rgba(var(--color-background-rgb), 0.06)',
                      }}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reset to defaults
                    </button>

                    {!isLandscape && (
                      <div
                        className="mt-4 rounded-2xl px-4 py-3 text-center text-sm"
                        style={{
                          borderWidth: 1,
                          borderColor: 'var(--color-border-secondary)',
                          backgroundColor: 'var(--color-border-muted)',
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        <strong className="font-semibold">Rotate your easel</strong>
                        <br />
                        Paper is in vertical orientation. Rotate your easel 90° to
                        match the blade readings.
                      </div>
                    )}

                    {calculation.isNonStandardPaperSize && (
                      <div
                        className="mt-4 rounded-2xl px-4 py-3 text-center text-sm"
                        style={{
                          borderWidth: 1,
                          borderColor: 'var(--color-border-secondary)',
                          backgroundColor: 'var(--color-border-muted)',
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        <strong className="font-semibold">
                          Non-standard paper
                        </strong>
                        <br />
                        Position paper in the {calculation.easelSizeLabel} slot all
                        the way to the left.
                      </div>
                    )}
                  </CalculatorCard>

                  <CalculatorCard
                    title="Blade readings"
                    description="Dial these values on your easel for a centered print."
                    accent="emerald"
                    padding="compact"
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <CalculatorStat
                        label="Left blade"
                        value={formatWithUnit(
                          !isLandscape
                            ? calculation.topBladeReading
                            : calculation.leftBladeReading
                        )}
                        className="p-4"
                      />
                      <CalculatorStat
                        label="Right blade"
                        value={formatWithUnit(
                          !isLandscape
                            ? calculation.bottomBladeReading
                            : calculation.rightBladeReading
                        )}
                        className="p-4"
                      />
                      <CalculatorStat
                        label="Top blade"
                        value={formatWithUnit(
                          !isLandscape
                            ? calculation.leftBladeReading
                            : calculation.topBladeReading
                        )}
                        className="p-4"
                      />
                      <CalculatorStat
                        label="Bottom blade"
                        value={formatWithUnit(
                          !isLandscape
                            ? calculation.rightBladeReading
                            : calculation.bottomBladeReading
                        )}
                        className="p-4"
                      />
                      <CalculatorStat
                        label="Image size"
                        value={formatDimensions(
                          calculation.printWidth,
                          calculation.printHeight
                        )}
                        helperText="Final image area within the borders."
                        className="sm:col-span-2 p-4"
                      />
                    </div>

                    {bladeWarning && (
                      <div className="mt-4">
                        <WarningAlert message={bladeWarning} action="error" />
                      </div>
                    )}
                    {minBorderWarning && (
                      <div className="mt-4">
                        <WarningAlert message={minBorderWarning} action="error" />
                      </div>
                    )}
                    {paperSizeWarning && (
                      <div className="mt-4">
                        <WarningAlert message={paperSizeWarning} action="warning" />
                      </div>
                    )}
                  </CalculatorCard>
                </>
              ) : null
            }
          />
        </div>

        <div className="space-y-6">
          <form.Field name="aspectRatio">
            {(field) => (
              <form.Field name="customAspectWidth">
                {(customAspectWidthField) => (
                  <form.Field name="customAspectHeight">
                    {(customAspectHeightField) => (
                      <CalculatorCard
                        title="Paper setup"
                        description="Match the paper size and aspect ratio you're printing on."
                      >
                        <div className="space-y-5">
                          <Select
                            label="Aspect ratio"
                            selectedValue={field.state.value}
                            onValueChange={(value) => field.handleChange(value)}
                            items={ASPECT_RATIOS as SelectItem[]}
                            placeholder="Select"
                          />

                          {field.state.value === 'custom' && (
                            <DimensionInputGroup
                              widthValue={String(customAspectWidthField.state.value)}
                              onWidthChange={(value) =>
                                customAspectWidthField.handleChange(Number(value) || 0)
                              }
                              heightValue={String(customAspectHeightField.state.value)}
                              onHeightChange={(value) =>
                                customAspectHeightField.handleChange(Number(value) || 0)
                              }
                              widthLabel="Width"
                              heightLabel="Height"
                              widthPlaceholder="Width"
                              heightPlaceholder="Height"
                            />
                          )}

                          <form.Field name="paperSize">
                            {(paperSizeField) => (
                              <>
                                <Select
                                  label="Paper size"
                                  selectedValue={paperSizeField.state.value}
                                  onValueChange={(value) => paperSizeField.handleChange(value)}
                                  items={displayPaperSizes as SelectItem[]}
                                  placeholder="Select"
                                />

                                {paperSizeField.state.value === 'custom' && (
                                  <DimensionInputGroup
                                    widthValue={paperWidthInput}
                                    onWidthChange={handlePaperWidthChange}
                                    onWidthBlur={handlePaperWidthBlur}
                                    heightValue={paperHeightInput}
                                    onHeightChange={handlePaperHeightChange}
                                    onHeightBlur={handlePaperHeightBlur}
                                    widthLabel="Width"
                                    heightLabel="Height"
                                    widthPlaceholder="Width"
                                    heightPlaceholder="Height"
                                  />
                                )}
                              </>
                            )}
                          </form.Field>
                        </div>
                      </CalculatorCard>
                    )}
                  </form.Field>
                )}
              </form.Field>
            )}
          </form.Field>

          <form.Field name="minBorder">
            {(minBorderField) => (
              <form.Field name="enableOffset">
                {(enableOffsetField) => (
                  <form.Field name="ignoreMinBorder">
                    {(ignoreMinBorderField) => (
                      <CalculatorCard
                        title="Borders & offsets"
                        description="Control the border thickness and fine-tune print placement."
                      >
                        <div className="space-y-5">
                          <LabeledSliderInput
                            label="Minimum border (inches)"
                            value={minBorderField.state.value}
                            onChange={(value) => minBorderField.handleChange(value)}
                            onSliderChange={(value) => minBorderField.handleChange(value)}
                            min={SLIDER_MIN_BORDER}
                            max={SLIDER_MAX_BORDER}
                            step={SLIDER_STEP_BORDER}
                            labels={BORDER_SLIDER_LABELS}
                            continuousUpdate
                          />

                          <ToggleSwitch
                            label="Enable offsets"
                            value={enableOffsetField.state.value}
                            onValueChange={(value) => enableOffsetField.handleChange(value)}
                          />

                          {enableOffsetField.state.value && (
                            <div
                              className="space-y-4 rounded-2xl p-4 border"
                              style={{
                                borderColor: 'var(--color-border-secondary)',
                                backgroundColor: 'rgba(var(--color-background-rgb), 0.05)',
                              }}
                            >
                              <ToggleSwitch
                                label="Ignore min border"
                                value={ignoreMinBorderField.state.value}
                                onValueChange={(value) => ignoreMinBorderField.handleChange(value)}
                              />
                              {ignoreMinBorderField.state.value && (
                                <p className="text-sm text-[color:var(--color-text-secondary)]">
                                  Print can be positioned freely but will stay within the
                                  paper edges.
                                </p>
                              )}

                              <form.Field name="horizontalOffset">
                                {(horizontalOffsetField) => (
                                  <form.Field name="verticalOffset">
                                    {(verticalOffsetField) => (
                                      <div className="grid gap-4 sm:grid-cols-2">
                                        <LabeledSliderInput
                                          label="Horizontal offset"
                                          value={horizontalOffsetField.state.value}
                                          onChange={(value) => horizontalOffsetField.handleChange(value)}
                                          onSliderChange={(value) => horizontalOffsetField.handleChange(value)}
                                          min={OFFSET_SLIDER_MIN}
                                          max={OFFSET_SLIDER_MAX}
                                          step={OFFSET_SLIDER_STEP}
                                          labels={OFFSET_SLIDER_LABELS}
                                          continuousUpdate
                                        />
                                        <LabeledSliderInput
                                          label="Vertical offset"
                                          value={verticalOffsetField.state.value}
                                          onChange={(value) => verticalOffsetField.handleChange(value)}
                                          onSliderChange={(value) => verticalOffsetField.handleChange(value)}
                                          min={OFFSET_SLIDER_MIN}
                                          max={OFFSET_SLIDER_MAX}
                                          step={OFFSET_SLIDER_STEP}
                                          labels={OFFSET_SLIDER_LABELS}
                                          continuousUpdate
                                        />
                                      </div>
                                    )}
                                  </form.Field>
                                )}
                              </form.Field>
                            </div>
                          )}
                        </div>
                      </CalculatorCard>
                    )}
                  </form.Field>
                )}
              </form.Field>
            )}
          </form.Field>
          <form.Field name="showBlades">
            {(showBladesField) => (
              <form.Field name="showBladeReadings">
                {(showBladeReadingsField) => (
                  <CalculatorCard
                    title="Blade visualization"
                    description="Control the display of easel blades and measurements on the preview."
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <ToggleSwitch
                        label="Show easel blades"
                        value={showBladesField.state.value}
                        onValueChange={(value) => showBladesField.handleChange(value)}
                      />
                      <ToggleSwitch
                        label="Show blade readings"
                        value={showBladeReadingsField.state.value}
                        onValueChange={(value) => showBladeReadingsField.handleChange(value)}
                      />
                    </div>
                  </CalculatorCard>
                )}
              </form.Field>
            )}
          </form.Field>
          <CalculatorCard
            title="Presets"
            description="Save, recall, and share the setups you use most often."
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Select
                  label="Presets"
                  selectedValue={selectedPresetId}
                  onValueChange={handleSelectPreset}
                  items={presetItems}
                  placeholder="Select preset"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleShareClick}
                  disabled={isSharing || isGeneratingShareUrl}
                  className="rounded-full border p-2 transition focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:cursor-not-allowed text-[color:var(--color-text-primary)] border-[color:var(--color-border-secondary)] bg-[rgba(var(--color-background-rgb),0.08)] hover:bg-[rgba(var(--color-background-rgb),0.14)] focus-visible:ring-[color:var(--color-border-primary)]"
                  title="Share preset"
                >
                  {isGeneratingShareUrl ? (
                    <svg
                      className="animate-spin h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  ) : (
                    <Share2 className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => setIsEditingPreset(true)}
                  className="rounded-full border p-2 transition focus-visible:outline-none focus-visible:ring-2 text-[color:var(--color-text-primary)] border-[color:var(--color-border-secondary)] bg-[rgba(var(--color-background-rgb),0.08)] hover:bg-[rgba(var(--color-background-rgb),0.14)] focus-visible:ring-[color:var(--color-border-primary)]"
                  title="Edit preset"
                >
                  <Save className="h-4 w-4" />
                </button>
              </div>
            </div>

            {isEditingPreset && (
              <div className="space-y-3">
                <TextInput
                  value={presetName}
                  onValueChange={setPresetName}
                  placeholder="Preset name"
                  label="Preset name"
                />
                <div className="grid gap-2 sm:grid-cols-3">
                  <button
                    onClick={savePreset}
                    className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 hover:brightness-110"
                    style={{
                      color: 'var(--color-primary)',
                      borderColor: 'var(--color-primary)',
                      borderWidth: 1,
                      backgroundColor:
                        'rgba(var(--color-background-rgb), 0.06)',
                    }}
                  >
                    <Save className="h-4 w-4" />
                    Save
                  </button>
                  <button
                    onClick={updatePresetHandler}
                    disabled={!selectedPresetId}
                    className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 hover:brightness-110"
                    style={{
                      color: 'var(--color-secondary)',
                      borderColor: 'var(--color-secondary)',
                      borderWidth: 1,
                      backgroundColor:
                        'rgba(var(--color-background-rgb), 0.06)',
                    }}
                  >
                    <Save className="h-4 w-4" />
                    Update
                  </button>
                  <button
                    onClick={deletePresetHandler}
                    disabled={!selectedPresetId}
                    className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 hover:brightness-110"
                    style={{
                      color: 'var(--color-accent)',
                      borderColor: 'var(--color-accent)',
                      borderWidth: 1,
                      backgroundColor:
                        'rgba(var(--color-background-rgb), 0.06)',
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
            )}
          </CalculatorCard>
        </div>
      </div>

      <BorderInfoSection />

      {/* Sharing Modals */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        presetName={presetName || 'Border Calculator Settings'}
        webUrl={shareUrls?.webUrl || ''}
        nativeUrl={shareUrls?.nativeUrl}
        onCopyToClipboard={handleCopyToClipboard}
        onNativeShare={canShareNatively ? handleNativeShare : undefined}
        canShareNatively={canShareNatively}
        canCopyToClipboard={canCopyToClipboard}
      />

      <SaveBeforeShareModal
        isOpen={isSaveBeforeShareOpen}
        onClose={() => setIsSaveBeforeShareOpen(false)}
        onSaveAndShare={handleSaveAndShare}
        isLoading={isSharing || isGeneratingShareUrl}
      />
    </div>
  );
}
