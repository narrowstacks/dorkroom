import {
  type BorderCalculatorState,
  type BorderPresetSettings,
  borderCalculatorInitialState,
  borderCalculatorSchema,
  CALC_STORAGE_KEY,
  calculateQuarterInchMinBorder,
  DEFAULT_BORDER_PRESETS,
  DESKTOP_BREAKPOINT,
  debugError,
  debugLog,
  PAPER_SIZES,
  shallowEqual,
  useBorderPresets,
  useCalculatorSharing,
  useDimensionCalculations,
  useGeometryCalculations,
  useLocalStorageFormPersistence,
  usePaperDimensionInput,
  usePresetManagement,
  usePresetSharing,
  useUrlPresetLoader,
  useWindowDimensions,
} from '@dorkroom/logic';
import {
  createZodFormValidator,
  useMeasurementConverter,
  useMeasurementFormatter,
  useOptionalToast,
} from '@dorkroom/ui';
import { useForm } from '@tanstack/react-form';
import { useStore } from '@tanstack/react-store';
import { useCallback, useEffect, useMemo } from 'react';

const validateBorderCalculator = createZodFormValidator(borderCalculatorSchema);

export function useBorderCalculatorController() {
  const { width } = useWindowDimensions();
  const isDesktop = width > DESKTOP_BREAKPOINT;
  const { formatWithUnit, formatDimensions, unit } = useMeasurementFormatter();
  const { toInches, toDisplay } = useMeasurementConverter();
  const toast = useOptionalToast();

  const form = useForm({
    defaultValues: borderCalculatorInitialState,
    validators: {
      onChange: validateBorderCalculator,
    },
  });

  const formValues = useStore(
    form.store,
    (state) => state.values as BorderCalculatorState
  );

  const {
    aspectRatio,
    paperSize,
    customAspectWidth,
    customAspectHeight,
    customPaperWidth,
    customPaperHeight,
    minBorder,
    enableOffset,
    ignoreMinBorder,
    horizontalOffset,
    verticalOffset,
    showBlades,
    showBladeReadings,
    isLandscape,
    isRatioFlipped,
    hasManuallyFlippedPaper,
    lastValidMinBorder,
  } = formValues;

  // Persist and hydrate form state to/from localStorage
  useLocalStorageFormPersistence({
    storageKey: CALC_STORAGE_KEY,
    form,
    formValues,
    persistKeys: [
      'aspectRatio',
      'paperSize',
      'customAspectWidth',
      'customAspectHeight',
      'customPaperWidth',
      'customPaperHeight',
      'minBorder',
      'enableOffset',
      'ignoreMinBorder',
      'horizontalOffset',
      'verticalOffset',
      'showBlades',
      'showBladeReadings',
      'isLandscape',
      'isRatioFlipped',
      'hasManuallyFlippedPaper',
      'lastValidCustomAspectWidth',
      'lastValidCustomAspectHeight',
      'lastValidCustomPaperWidth',
      'lastValidCustomPaperHeight',
      'lastValidMinBorder',
    ],
    onHydrated: (loadedValues) => {
      // Recalculate orientation for custom paper after loading from storage
      if (
        loadedValues.paperSize === 'custom' &&
        loadedValues.customPaperWidth !== undefined &&
        loadedValues.customPaperHeight !== undefined
      ) {
        form.setFieldValue(
          'isLandscape',
          loadedValues.customPaperWidth < loadedValues.customPaperHeight
        );
      }
    },
  });

  const { presets, addPreset, updatePreset, removePreset } = useBorderPresets();

  // Paper dimension input hook
  const {
    paperWidthInput,
    paperHeightInput,
    handlePaperWidthChange,
    handlePaperWidthBlur,
    handlePaperHeightChange,
    handlePaperHeightBlur,
  } = usePaperDimensionInput({
    initialWidth: customPaperWidth,
    initialHeight: customPaperHeight,
    toDisplay,
    toInches,
    onWidthChange: (inches: number) => {
      form.setFieldValue('customPaperWidth', inches);
      form.setFieldValue('lastValidCustomPaperWidth', inches);
    },
    onHeightChange: (inches: number) => {
      form.setFieldValue('customPaperHeight', inches);
      form.setFieldValue('lastValidCustomPaperHeight', inches);
    },
  });

  const dimensionData = useDimensionCalculations(formValues);
  const { orientedPaper, orientedRatio } = dimensionData.orientedDimensions;

  // Calculate the maximum allowed minimum border based on paper size
  // Max border = half of the smaller paper dimension minus a small buffer
  const maxAllowedMinBorder = useMemo(() => {
    const smallerDimension = Math.min(orientedPaper.w, orientedPaper.h);
    // Leave 0.125" room to ensure at least a minimal print area
    return Math.max(0, smallerDimension / 2 - 0.125);
  }, [orientedPaper.w, orientedPaper.h]);

  const { calculation } = useGeometryCalculations(
    formValues,
    dimensionData.orientedDimensions,
    dimensionData.minBorderData,
    dimensionData.paperEntry,
    dimensionData.paperSizeWarning
  );

  const quarterRoundedMinBorder = useMemo(() => {
    if (!calculation) return null;

    return calculateQuarterInchMinBorder({
      paperWidth: orientedPaper.w,
      paperHeight: orientedPaper.h,
      ratioWidth: orientedRatio.w,
      ratioHeight: orientedRatio.h,
      currentMinBorder: minBorder,
      printWidth: calculation.printWidth,
      printHeight: calculation.printHeight,
    });
  }, [
    calculation,
    minBorder,
    orientedPaper.h,
    orientedPaper.w,
    orientedRatio.h,
    orientedRatio.w,
  ]);

  const handleRoundMinBorderToQuarter = useCallback(() => {
    if (quarterRoundedMinBorder === null) return;

    form.setFieldValue('minBorder', quarterRoundedMinBorder);
    form.setFieldValue('lastValidMinBorder', quarterRoundedMinBorder);
  }, [form, quarterRoundedMinBorder]);

  // Clamp minBorder when paper size changes and current value exceeds the new max
  useEffect(() => {
    if (minBorder > maxAllowedMinBorder && maxAllowedMinBorder > 0) {
      form.setFieldValue('minBorder', maxAllowedMinBorder);
      form.setFieldValue('lastValidMinBorder', maxAllowedMinBorder);
      toast?.showToast(
        `Border reduced to ${maxAllowedMinBorder.toFixed(2)}" to fit paper size`,
        'info'
      );
    }
  }, [maxAllowedMinBorder, minBorder, form, toast]);

  useEffect(() => {
    if (!calculation) return;
    if (calculation.lastValidMinBorder !== lastValidMinBorder) {
      form.setFieldValue('lastValidMinBorder', calculation.lastValidMinBorder);
    }
  }, [calculation, form, lastValidMinBorder]);

  const offsetWarning = calculation?.offsetWarning ?? null;
  const bladeWarning = calculation?.bladeWarning ?? null;
  const minBorderWarning = calculation?.minBorderWarning ?? null;
  const paperSizeWarning =
    calculation?.paperSizeWarning ?? dimensionData.paperSizeWarning;

  // Update orientation only when custom paper dimensions change
  useEffect(() => {
    const currentPaperSize = form.getFieldValue('paperSize');
    const hasManuallyFlipped = form.getFieldValue('hasManuallyFlippedPaper');

    if (
      currentPaperSize === 'custom' &&
      customPaperWidth > 0 &&
      customPaperHeight > 0 &&
      !hasManuallyFlipped
    ) {
      const shouldBeLandscape = customPaperWidth < customPaperHeight;
      const currentIsLandscape = form.getFieldValue('isLandscape');

      if (currentIsLandscape !== shouldBeLandscape) {
        form.setFieldValue('isLandscape', shouldBeLandscape);
      }
    }
  }, [customPaperWidth, customPaperHeight, form]);

  const applyPresetSettings = useCallback(
    (settings: BorderPresetSettings) => {
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
      form.setFieldValue(
        'hasManuallyFlippedPaper',
        settings.hasManuallyFlippedPaper
      );
      form.setFieldValue(
        'lastValidCustomAspectWidth',
        settings.customAspectWidth
      );
      form.setFieldValue(
        'lastValidCustomAspectHeight',
        settings.customAspectHeight
      );
      form.setFieldValue(
        'lastValidCustomPaperWidth',
        settings.customPaperWidth
      );
      form.setFieldValue(
        'lastValidCustomPaperHeight',
        settings.customPaperHeight
      );
      form.setFieldValue('lastValidMinBorder', settings.minBorder);
    },
    [form]
  );

  const resetToDefaults = () => {
    form.reset();
  };

  const displayPaperSizes = useMemo(() => {
    return PAPER_SIZES.map((size) => {
      if (size.value === 'custom') {
        return size;
      }

      if (unit === 'metric') {
        const metricLabel = formatDimensions(size.width, size.height);
        const imperialLabel = `${size.width}×${size.height}in`;
        return {
          ...size,
          label: `${metricLabel} (${imperialLabel})`,
        };
      }

      return size;
    });
  }, [unit, formatDimensions]);

  const currentSettings = useMemo(
    () => ({
      aspectRatio,
      paperSize,
      customAspectWidth,
      customAspectHeight,
      customPaperWidth,
      customPaperHeight,
      minBorder,
      enableOffset,
      ignoreMinBorder,
      horizontalOffset,
      verticalOffset,
      showBlades,
      showBladeReadings,
      isLandscape,
      isRatioFlipped,
      hasManuallyFlippedPaper,
    }),
    [
      aspectRatio,
      paperSize,
      customAspectWidth,
      customAspectHeight,
      customPaperWidth,
      customPaperHeight,
      minBorder,
      enableOffset,
      ignoreMinBorder,
      horizontalOffset,
      verticalOffset,
      showBlades,
      showBladeReadings,
      isLandscape,
      isRatioFlipped,
      hasManuallyFlippedPaper,
    ]
  );

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
        debugLog('Preset link copied to clipboard!');
      } else if (result.method === 'native') {
        setIsShareModalOpen(false);
      }
    },
    onShareError: (error: string) => {
      debugError('Sharing failed:', error);
    },
  });

  // URL preset loader
  const { loadedPreset, clearLoadedPreset } = useUrlPresetLoader({
    onPresetLoaded: (preset: {
      name: string;
      settings: BorderPresetSettings;
    }) => {
      applyPresetSettings(preset.settings);
      setPresetName(preset.name);
      debugLog(`Preset "${preset.name}" loaded from URL!`);
    },
    onLoadError: (error: string) => {
      debugError('Failed to load preset from URL:', error);
    },
  });

  // Preset management hook
  const {
    selectedPresetId,
    presetName,
    isEditingPreset,
    presetItems,
    setPresetName,
    setIsEditingPreset,
    handleSelectPreset,
    savePreset,
    updatePresetHandler,
    deletePresetHandler,
  } = usePresetManagement({
    presets,
    defaultPresets: DEFAULT_BORDER_PRESETS,
    currentSettings,
    onAddPreset: addPreset,
    onUpdatePreset: updatePreset,
    onRemovePreset: removePreset,
    onApplySettings: applyPresetSettings,
  });

  const sharePresetWrapper = useCallback(
    async (
      preset: { name: string; settings: BorderPresetSettings },
      preferNative: boolean
    ): Promise<void> => {
      await sharePreset(preset, preferNative);
    },
    [sharePreset]
  );

  const {
    isShareModalOpen,
    isSaveBeforeShareOpen,
    shareUrls,
    isGeneratingShareUrl,
    setIsShareModalOpen,
    setIsSaveBeforeShareOpen,
    handleShareClick,
    handleSaveAndShare,
    handleCopyToClipboard,
    handleNativeShare,
  } = useCalculatorSharing({
    presets,
    currentSettings,
    presetName,
    getSharingUrls,
    sharePreset: sharePresetWrapper,
    canShareNatively,
    canCopyToClipboard,
    onAddPreset: addPreset,
    shallowEqual,
  });

  return {
    isDesktop,
    form,
    formValues,
    calculation,
    paperWidthInput,
    paperHeightInput,
    displayPaperSizes,
    quarterRoundedMinBorder,
    maxAllowedMinBorder,

    // Warnings
    offsetWarning,
    bladeWarning,
    minBorderWarning,
    paperSizeWarning,

    // Presets & Sharing
    presets,
    presetItems,
    selectedPresetId,
    presetName,
    isEditingPreset,
    isSharing,
    isGeneratingShareUrl,
    isShareModalOpen,
    isSaveBeforeShareOpen,
    shareUrls,
    canShareNatively,
    canCopyToClipboard,
    loadedPreset,

    // Handlers
    handlePaperWidthChange,
    handlePaperWidthBlur,
    handlePaperHeightChange,
    handlePaperHeightBlur,
    handleRoundMinBorderToQuarter,
    resetToDefaults,

    // Preset Handlers
    handleSelectPreset,
    setPresetName,
    setIsEditingPreset,
    savePreset,
    updatePresetHandler,
    deletePresetHandler,
    clearLoadedPreset,
    applyPresetSettings,

    // Sharing Handlers
    handleShareClick,
    handleSaveAndShare,
    handleCopyToClipboard,
    handleNativeShare,
    setIsShareModalOpen,
    setIsSaveBeforeShareOpen,

    // Helpers
    formatWithUnit,
    formatDimensions,
    currentSettings,
  };
}
