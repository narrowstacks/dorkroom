import {
  type BorderPresetSettings,
  borderCalculatorInitialState,
  borderCalculatorSchema,
  CALC_STORAGE_KEY,
  calculateQuarterInchMinBorder,
  computeMaxAllowedMinBorder,
  DEFAULT_BORDER_PRESETS,
  DESKTOP_BREAKPOINT,
  debugError,
  debugLog,
  PAPER_SIZES,
  type PersistedValue,
  persistedBorderCalculatorFieldSchemas,
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
import { trackEvent } from '../../../lib/analytics/tracked-events';

const validateBorderCalculator = createZodFormValidator(borderCalculatorSchema);

// Per-key hydration validators sharing the persisted snapshot's field bounds,
// so a tampered localStorage value falls back to the default instead of
// flowing into form state. `undefined` is rejected up front: a schema that
// ever gains a default would otherwise parse it and hydrate the raw value.
// The whole-snapshot readers of this key (the state hook and the mobile-width
// layout) discard a bad payload entirely; this hook validates key by key, so
// here a bad field falls back on its own.
const borderFieldValidators = Object.fromEntries(
  Object.entries(persistedBorderCalculatorFieldSchemas).map(([key, schema]) => [
    key,
    {
      validate: (value: PersistedValue) =>
        value !== undefined && schema.safeParse(value).success,
    },
  ])
);

// Derived rather than listed, so a persisted key without a bounds schema
// cannot silently fall back to the hook's `value !== undefined` default.
// SAFETY: Object.keys over a literal object returns exactly its own keys; the
// assertion only recovers the literal key union TypeScript widens to string.
const borderPersistKeys = Object.keys(
  persistedBorderCalculatorFieldSchemas
) as Array<keyof typeof persistedBorderCalculatorFieldSchemas>;

export function useBorderCalculatorController() {
  const { width } = useWindowDimensions();
  const isDesktop = width > DESKTOP_BREAKPOINT;
  const { formatWithUnit, formatDimensions, unit } = useMeasurementFormatter();
  const { toInches, toDisplay } = useMeasurementConverter();
  const toast = useOptionalToast();

  const form = useForm({
    defaultValues: borderCalculatorInitialState,
    validators: {
      onBlur: validateBorderCalculator,
    },
  });

  const formValues = useStore(form.store, (state) => state.values);

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
    persistKeys: borderPersistKeys,
    validators: borderFieldValidators,
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

  // Maximum allowed minimum border for the current paper size
  const maxAllowedMinBorder = useMemo(
    () => computeMaxAllowedMinBorder(orientedPaper.w, orientedPaper.h),
    [orientedPaper.w, orientedPaper.h]
  );

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

  // Callers pass settings that have already been validated against the form's
  // own bounds — `borderPresetSchema` for a stored preset, the share-link
  // schema inside `decodePreset` for a URL — so this only has to land them.
  // One `reset` replaces the whole value set in a single store update instead
  // of 21 sequential writes, so no render observes a half-applied preset and
  // stale per-field validation state from the previous settings is dropped.
  // `keepDefaultValues` is load-bearing: without it `reset` adopts the preset
  // as the form's defaultValues, which would both redirect "reset to
  // defaults" at the preset and let the `form.update(opts)` that `useForm`
  // runs on the next render overwrite the values just applied.
  const applyPresetSettings = useCallback(
    (settings: BorderPresetSettings) => {
      form.reset(
        {
          ...form.state.values,
          ...settings,
          lastValidCustomAspectWidth: settings.customAspectWidth,
          lastValidCustomAspectHeight: settings.customAspectHeight,
          lastValidCustomPaperWidth: settings.customPaperWidth,
          lastValidCustomPaperHeight: settings.customPaperHeight,
          lastValidMinBorder: settings.minBorder,
        },
        { keepDefaultValues: true }
      );
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
      if (result.method) {
        trackEvent('share', { tool: 'border', method: result.method });
      }
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
      // The preset name is the user's own label; only the fact of arrival
      // on a shared link is reported.
      trackEvent('share_opened', { tool: 'border' });
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
    handleSelectPreset: selectPreset,
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

  // Only the built-in presets are tracked: their index in DEFAULT_BORDER_PRESETS
  // is a fixed identity, whereas a user-saved preset is named by the user and
  // stays off the wire entirely.
  const handleSelectPreset = useCallback(
    (id: string) => {
      const builtInIndex = DEFAULT_BORDER_PRESETS.findIndex(
        (preset) => preset.id === id
      );
      if (builtInIndex >= 0) {
        trackEvent('preset_applied', { tool: 'border', preset: builtInIndex });
      }
      selectPreset(id);
    },
    [selectPreset]
  );

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

  // The share modal's copy button writes to the clipboard directly rather than
  // going through `sharePreset`, so it never reaches `onShareSuccess` above.
  const handleCopyToClipboardTracked = useCallback(
    async (url: string) => {
      await handleCopyToClipboard(url);
      trackEvent('share', { tool: 'border', method: 'clipboard' });
    },
    [handleCopyToClipboard]
  );

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
    handleCopyToClipboard: handleCopyToClipboardTracked,
    handleNativeShare,
    setIsShareModalOpen,
    setIsSaveBeforeShareOpen,

    // Helpers
    formatWithUnit,
    formatDimensions,
    currentSettings,
  };
}
