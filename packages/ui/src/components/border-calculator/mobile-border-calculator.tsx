import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useForm } from '@tanstack/react-form';
import { useStore } from '@tanstack/react-store';
import {
  RotateCcw,
  EyeOff,
  BookOpen,
  Share,
  Crop,
  Image,
  Ruler,
  Move,
  Target,
} from 'lucide-react';

// Components
import { BladeResultsDisplay } from './blade-results-display';
import { AnimatedPreview } from './animated-preview';
import { SettingsButton } from '../../components/settings-button';
import {
  WarningAlert,
} from '../../components/warning-alert';
import {
  Drawer,
  DrawerContent,
  DrawerBody,
} from '../../components/drawer';
import {
  ShareModal,
} from '../../components/share-modal';
import {
  SaveBeforeShareModal,
} from '../../components/save-before-share-modal';
import {
  useMeasurement,
} from '../../contexts/measurement-context';
import {
  useMeasurementFormatter,
} from '../../hooks/use-measurement-conversion';
import {
  createZodFormValidator,
} from '../../forms/utils/create-zod-form-validator';

// Sections
import {
  PaperSizeSection,
  BorderSizeSection,
  PositionOffsetsSection,
  PresetsSection,
} from './sections';

// Hooks
import {
  borderCalculatorSchema,
  useBorderPresets,
  usePresetSharing,
  useDimensionCalculations,
  useGeometryCalculations,
  calculateQuarterInchMinBorder,
  shallowEqual,
  debugLog,
  debugError,
  type BorderPreset,
  type BorderCalculatorState,
  type BorderPresetSettings,
  PAPER_SIZES,
  CALC_STORAGE_KEY,
  borderCalculatorInitialState,
} from '@dorkroom/logic';
import { useTheme } from '../../contexts/theme-context';

// Active section type
type ActiveSection = 'paperSize' | 'borderSize' | 'positionOffsets' | 'presets';

interface MobileBorderCalculatorProps {
  loadedPresetFromUrl?: {
    name: string;
    settings: BorderPresetSettings;
    isFromUrl?: boolean;
  } | null;
  clearLoadedPreset?: () => void;
}

const validateBorderCalculator = createZodFormValidator(borderCalculatorSchema);

/**
 * Render the mobile UI for configuring border/calculation settings, managing presets, and sharing results.
 *
 * Renders the calculator's hero results, animated preview, warnings, settings controls, presets management, and sharing flows
 * inside a bottom drawer and modals. Applies a preset loaded from URL when provided and exposes handlers for saving,
 * updating, deleting, and sharing presets.
 *
 * @param loadedPresetFromUrl - Optional preset object loaded from a URL (contains `name` and `settings`); when provided the preset is applied and set as the current preset.
 * @param clearLoadedPreset - Optional callback invoked after a loaded preset from URL has been applied to clear the source.
 * @returns The React element tree for the mobile border calculator UI.
 */
export function MobileBorderCalculator({
  loadedPresetFromUrl,
  clearLoadedPreset,
}: MobileBorderCalculatorProps) {
  // Theme
  const { resolvedTheme } = useTheme();
  const isHighContrast = resolvedTheme === 'high-contrast';

  // Measurement unit
  const { unit } = useMeasurement();
  const { formatWithUnit, formatDimensions } = useMeasurementFormatter();

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeSection, setActiveSection] =
    useState<ActiveSection>('paperSize');
  const [currentPreset, setCurrentPreset] = useState<BorderPreset | null>(null);

  // Sharing state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSaveBeforeShareOpen, setIsSaveBeforeShareOpen] = useState(false);
  const [shareUrls, setShareUrls] = useState<{
    webUrl: string;
  } | null>(null);
  const [isGeneratingShareUrl, setIsGeneratingShareUrl] = useState(false);

  // Hydration ref
  const hydrationRef = useRef(false);

  // Form setup - single source of truth shared with desktop
  const form = useForm({
    defaultValues: borderCalculatorInitialState,
    validators: {
      onChange: validateBorderCalculator,
    },
  });

  // Hydrate from persisted state on mount (runs exactly once)
  useEffect(() => {
    if (hydrationRef.current || typeof window === 'undefined') return;
    hydrationRef.current = true;

    try {
      const raw = window.localStorage.getItem(CALC_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as Partial<BorderCalculatorState>;
      Object.entries(parsed).forEach(([key, value]: [string, unknown]) => {
        if (value === undefined) return;
        form.setFieldValue(
          key as keyof BorderCalculatorState,
          value as BorderCalculatorState[keyof BorderCalculatorState]
        );
      });

      // Recalculate orientation for custom paper after loading from storage
      if (
        parsed.paperSize === 'custom' &&
        parsed.customPaperWidth !== undefined &&
        parsed.customPaperHeight !== undefined
      ) {
        form.setFieldValue(
          'isLandscape',
          parsed.customPaperWidth < parsed.customPaperHeight
        );
      }
    } catch (error) {
      console.warn('Failed to load calculator state', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscribe to form changes for reactivity
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
    lastValidCustomAspectWidth,
    lastValidCustomAspectHeight,
    lastValidCustomPaperWidth,
    lastValidCustomPaperHeight,
    lastValidMinBorder,
  } = formValues;

  // Persist to localStorage
  const persistableSnapshot = useMemo(
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
      lastValidCustomAspectWidth,
      lastValidCustomAspectHeight,
      lastValidCustomPaperWidth,
      lastValidCustomPaperHeight,
      lastValidMinBorder,
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
      lastValidCustomAspectWidth,
      lastValidCustomAspectHeight,
      lastValidCustomPaperWidth,
      lastValidCustomPaperHeight,
      lastValidMinBorder,
    ]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(
        CALC_STORAGE_KEY,
        JSON.stringify(persistableSnapshot)
      );
    } catch (error) {
      console.warn('Failed to save calculator state', error);
    }
  }, [persistableSnapshot]);

  // Calculations
  const dimensionData = useDimensionCalculations(formValues);
  const { orientedPaper, orientedRatio } = dimensionData.orientedDimensions;
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

  useEffect(() => {
    if (!calculation) return;
    if (calculation.lastValidMinBorder !== lastValidMinBorder) {
      form.setFieldValue('lastValidMinBorder', calculation.lastValidMinBorder);
    }
  }, [calculation, form, lastValidMinBorder]);

  // Update orientation when custom paper dimensions change
  useEffect(() => {
    const currentPaperSize = form.getFieldValue('paperSize');

    if (
      currentPaperSize === 'custom' &&
      customPaperWidth > 0 &&
      customPaperHeight > 0
    ) {
      const shouldBeLandscape = customPaperWidth < customPaperHeight;
      const currentIsLandscape = form.getFieldValue('isLandscape');

      if (currentIsLandscape !== shouldBeLandscape) {
        form.setFieldValue('isLandscape', shouldBeLandscape);
      }
    }
  }, [paperSize, customPaperWidth, customPaperHeight, form]);

  const offsetWarning = calculation?.offsetWarning ?? null;
  const bladeWarning = calculation?.bladeWarning ?? null;
  const minBorderWarning = calculation?.minBorderWarning ?? null;
  const paperSizeWarning =
    calculation?.paperSizeWarning ?? dimensionData.paperSizeWarning;

  const { presets, addPreset, updatePreset, removePreset } = useBorderPresets();

  // Sharing hooks
  const {
    getSharingUrls,
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
    onShareError: (error) => {
      debugError('Sharing failed:', error);
    },
  });

  // Apply preset from URL
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

  useEffect(() => {
    if (!loadedPresetFromUrl) return;

    applyPresetSettings(loadedPresetFromUrl.settings);

    setCurrentPreset({
      id: `loaded-${Date.now()}`,
      name: loadedPresetFromUrl.name,
      settings: loadedPresetFromUrl.settings,
    });

    if (clearLoadedPreset) {
      clearLoadedPreset();
    }
  }, [loadedPresetFromUrl, applyPresetSettings, clearLoadedPreset]);

  // Display values
  const paperSizeDisplayValue = useMemo(() => {
    if (paperSize === 'custom') {
      return formatDimensions(customPaperWidth, customPaperHeight);
    }

    const size = PAPER_SIZES.find((s) => s.value === paperSize);
    if (!size) return paperSize;

    if (unit === 'metric') {
      const metricLabel = formatDimensions(size.width, size.height);
      const imperialLabel = `${size.width}×${size.height}in`;
      return `${metricLabel} (${imperialLabel})`;
    }

    return size.label;
  }, [paperSize, customPaperWidth, customPaperHeight, unit, formatDimensions]);

  const aspectRatioDisplayValue = useMemo(() => {
    return aspectRatio === 'custom'
      ? `${customAspectWidth}:${customAspectHeight}`
      : aspectRatio;
  }, [aspectRatio, customAspectWidth, customAspectHeight]);

  const borderSizeDisplayValue = useMemo(() => {
    return formatWithUnit(minBorder);
  }, [minBorder, formatWithUnit]);

  const positionDisplayValue = useMemo(() => {
    if (!enableOffset) return 'Centered';
    return `H:${horizontalOffset.toFixed(1)} V:${verticalOffset.toFixed(1)}`;
  }, [enableOffset, horizontalOffset, verticalOffset]);

  const presetsDisplayValue = useMemo(() => {
    if (!currentPreset) return 'Presets';
    return currentPreset.name.length > 10
      ? currentPreset.name
      : `${currentPreset.name}`;
  }, [currentPreset]);

  const hasWarnings = Boolean(
    bladeWarning || minBorderWarning || paperSizeWarning || offsetWarning
  );

  // Current settings for sharing
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

  // Sharing handlers
  const handleShare = useCallback(async () => {
    setIsGeneratingShareUrl(true);

    try {
      const matchedPreset = presets.find((p) =>
        shallowEqual(p.settings, currentSettings)
      );

      if (matchedPreset) {
        const urls = getSharingUrls({
          name: matchedPreset.name,
          settings: currentSettings,
        });
        if (urls) {
          setShareUrls(urls);
          setIsShareModalOpen(true);
        } else {
          console.error('Failed to generate sharing URLs for saved preset');
          setShareUrls(null);
          setIsShareModalOpen(true);
        }
      } else if (currentPreset?.name?.trim()) {
        const urls = getSharingUrls({
          name: currentPreset.name.trim(),
          settings: currentSettings,
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
        setIsSaveBeforeShareOpen(true);
      }
    } catch (error) {
      console.error('Error during share URL generation:', error);
      setShareUrls(null);
      setIsShareModalOpen(true);
    } finally {
      setIsGeneratingShareUrl(false);
    }
  }, [presets, currentSettings, currentPreset, getSharingUrls]);

  const handleSaveAndShare = useCallback(
    async (name: string) => {
      setIsGeneratingShareUrl(true);
      try {
        const newPreset: BorderPreset = {
          id: 'user-' + Date.now(),
          name,
          settings: currentSettings,
        };
        addPreset(newPreset);
        setCurrentPreset(newPreset);

        const urls = getSharingUrls({ name, settings: currentSettings });
        setIsSaveBeforeShareOpen(false);

        if (urls) {
          setShareUrls(urls);
          setIsShareModalOpen(true);
        } else {
          console.error('Failed to generate sharing URLs after saving preset');
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
    },
    [addPreset, currentSettings, getSharingUrls]
  );

  const handleCopyToClipboard = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      throw error;
    }
  }, []);

  // Drawer handlers
  const openDrawerSection = useCallback((section: ActiveSection) => {
    setActiveSection(section);
    setIsDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  const toggleBlades = useCallback(() => {
    form.setFieldValue('showBlades', !showBlades);
  }, [form, showBlades]);

  const toggleBladeReadings = useCallback(() => {
    form.setFieldValue('showBladeReadings', !showBladeReadings);
  }, [form, showBladeReadings]);

  const handleApplyPreset = useCallback(
    (preset: BorderPreset) => {
      applyPresetSettings(preset.settings);
      setCurrentPreset(preset);
      closeDrawer();
    },
    [applyPresetSettings, closeDrawer]
  );

  const handleSavePreset = useCallback(
    (name: string, settings: BorderPresetSettings) => {
      const newPreset: BorderPreset = {
        id: Date.now().toString(),
        name,
        settings,
        };
      addPreset(newPreset);
      setCurrentPreset(newPreset);
      closeDrawer();
    },
    [addPreset, closeDrawer]
  );

  const handleUpdatePreset = useCallback(
    (id: string, name: string, settings: BorderPresetSettings) => {
      updatePreset(id, { name, settings });
      setCurrentPreset((prev) =>
        prev?.id === id ? { ...prev, name, settings } : prev
      );
    },
    [updatePreset]
  );

  const handleDeletePreset = useCallback(
    (id: string) => {
      removePreset(id);
      setCurrentPreset((prev) => (prev?.id === id ? null : prev));
    },
    [removePreset]
  );

  const resetToDefaults = () => {
    form.reset();
  };

  return (
    <div
      className="min-h-dvh px-4 pb-24 pt-10"
      style={{
        background: 'var(--color-background)',
        color: 'var(--color-text-primary)',
      }}
    >
      <div className="mx-auto max-w-md space-y-4">
        {/* Hero Section - Blade Results */}
        <div
          className={`rounded-3xl p-[1px] ${
            !isHighContrast
              ? 'shadow-[0_30px_90px_-40px_var(--color-visualization-overlay)]'
              : ''
              } backdrop-blur-sm`}
          style={{
            background: 'var(--color-border-primary)',
          }}
        >
          <div
            className="rounded-[calc(1.5rem-1px)]"
            style={{
              backgroundColor:
                resolvedTheme === 'light' ? '#ffffff' : 'var(--color-surface)',
            }}
          >
            <BladeResultsDisplay
              calculation={calculation}
              paperSize={paperSizeDisplayValue}
              aspectRatio={aspectRatioDisplayValue}
            />
          </div>
        </div>

        {/* Animated Preview */}
        <div
          className={`rounded-3xl border p-6 ${
            !isHighContrast
              ? 'shadow-[0_35px_110px_-50px_var(--color-visualization-overlay)]'
              : ''
              } backdrop-blur-lg`}
          style={{
            borderColor: 'var(--color-border-secondary)',
            backgroundColor: 'var(--color-background)',
          }}
        >
          <AnimatedPreview
            calculation={calculation}
            showBlades={showBlades}
            showBladeReadings={showBladeReadings}
            className={!isHighContrast ? 'shadow-2xl' : undefined}
            borderColor="var(--color-border-primary)"
          />
        </div>

        {/* Warnings */}
        {hasWarnings && (
          <div
            className="rounded-3xl border p-5 space-y-2"
            style={{
              borderColor: 'var(--color-border-secondary)',
              backgroundColor: 'var(--color-surface-muted)',
              background: 'var(--gradient-card-warning)',
              boxShadow: isHighContrast
                ? 'none'
                : '0 25px 80px -45px var(--color-visualization-overlay)',
            }}
          >
            {bladeWarning && (
              <WarningAlert message={bladeWarning} action="error" />
            )}
            {minBorderWarning && (
              <WarningAlert message={minBorderWarning} action="error" />
            )}
            {paperSizeWarning && (
              <WarningAlert message={paperSizeWarning} action="warning" />
            )}
            {offsetWarning && (
              <WarningAlert message={offsetWarning} action="warning" />
            )}
          </div>
        )}

        {/* Settings Buttons */}
        <div
          className="rounded-3xl border p-6 backdrop-blur-lg space-y-5"
          style={{
            borderColor: 'var(--color-border-secondary)',
            background: 'var(--color-surface)',
            boxShadow: isHighContrast
              ? 'none'
              : '0 40px 120px -60px var(--color-visualization-overlay)',
          }}
        >
          <div className="space-y-3">
            <SettingsButton
              label="Paper and Image Size"
              value={`${aspectRatioDisplayValue} on ${paperSizeDisplayValue}`}
              onPress={() => openDrawerSection('paperSize')}
              icon={Image}
              className={
                isHighContrast
                  ? 'backdrop-blur-sm'
                  : 'backdrop-blur-sm shadow-lg'
              }
            />

            <SettingsButton
              label="Border Size"
              value={borderSizeDisplayValue}
              onPress={() => openDrawerSection('borderSize')}
              icon={Ruler}
              className={
                isHighContrast
                  ? 'backdrop-blur-sm'
                  : 'backdrop-blur-sm shadow-lg'
              }
            />

            <SettingsButton
              label="Position & Offsets"
              value={positionDisplayValue}
              onPress={() => openDrawerSection('positionOffsets')}
              icon={Move}
              className={
                isHighContrast
                  ? 'backdrop-blur-sm'
                  : 'backdrop-blur-sm shadow-lg'
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <SettingsButton
              label="Blades"
              onPress={toggleBlades}
              icon={showBlades ? EyeOff : Crop}
              showChevron={false}
              centerLabel={true}
              className={
                isHighContrast
                  ? 'backdrop-blur-sm'
                  : 'backdrop-blur-sm shadow-lg'
              }
            />

            <SettingsButton
              label="Readings"
              onPress={toggleBladeReadings}
              icon={showBladeReadings ? EyeOff : Target}
              showChevron={false}
              centerLabel={true}
              className={
                isHighContrast
                  ? 'backdrop-blur-sm'
                  : 'backdrop-blur-sm shadow-lg'
              }
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <SettingsButton
                value={presetsDisplayValue}
                onPress={() => openDrawerSection('presets')}
                icon={BookOpen}
                className={
                  isHighContrast
                    ? 'backdrop-blur-sm'
                    : 'backdrop-blur-sm shadow-lg'
                }
              />
            </div>

            <button
              onClick={handleShare}
              className={`rounded-full p-4 font-semibold transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 ${
                !isHighContrast ? 'shadow-lg' : ''
                }`}
              style={
                {
                  background: 'var(--gradient-card-primary)',
                  color: 'var(--color-text-primary)',
                  '--tw-ring-color': 'var(--color-semantic-success)',
                } as React.CSSProperties
              }
              title="Share preset"
            >
              <Share className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Reset Button */}
        <button
          onClick={resetToDefaults}
          className={`flex w-full items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 ${
            !isHighContrast ? 'shadow-lg' : ''
            }`}
          style={
            {
              borderColor: 'var(--color-border-secondary)',
              backgroundColor: 'rgba(var(--color-background-rgb), 0.05)',
              color: 'var(--color-semantic-error)',
              '--tw-ring-color': 'var(--color-semantic-error)',
            } as React.CSSProperties
          }
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor =
              'rgba(var(--color-background-rgb), 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor =
              'rgba(var(--color-background-rgb), 0.05)';
          }}
        >
          <RotateCcw className="h-4 w-4" />
          Reset to Defaults
        </button>

        {/* Bottom Drawer */}
        <Drawer
          isOpen={isDrawerOpen}
          onClose={closeDrawer}
          size="md"
          anchor="bottom"
          enableBackgroundBlur={false}
          enableBackgroundOverlay={false}
        >
          <DrawerContent>
            <DrawerBody>
              {activeSection === 'paperSize' && (
                <PaperSizeSection
                  onClose={closeDrawer}
                  form={form}
                  isLandscape={isLandscape}
                  isRatioFlipped={isRatioFlipped}
                />
              )}

              {activeSection === 'borderSize' && (
                <BorderSizeSection
                  onClose={closeDrawer}
                  form={form}
                  minBorderWarning={minBorderWarning || undefined}
                  onRoundToQuarter={handleRoundMinBorderToQuarter}
                  roundToQuarterDisabled={quarterRoundedMinBorder === null}
                />
              )}

              {activeSection === 'positionOffsets' && (
                <PositionOffsetsSection
                  onClose={closeDrawer}
                  form={form}
                  enableOffset={enableOffset}
                  ignoreMinBorder={ignoreMinBorder}
                  offsetWarning={offsetWarning || undefined}
                />
              )}

              {activeSection === 'presets' && (
                <PresetsSection
                  onClose={closeDrawer}
                  presets={presets}
                  currentPreset={currentPreset}
                  onApplyPreset={handleApplyPreset}
                  onSavePreset={handleSavePreset}
                  onUpdatePreset={handleUpdatePreset}
                  onDeletePreset={handleDeletePreset}
                  getCurrentSettings={() => currentSettings}
                />
              )}
            </DrawerBody>
          </DrawerContent>
        </Drawer>

        {/* Sharing Modals */}
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          presetName={currentPreset?.name || 'Border Calculator Settings'}
          webUrl={shareUrls?.webUrl || ''}
          onCopyToClipboard={handleCopyToClipboard}
          canShareNatively={false}
          canCopyToClipboard={canCopyToClipboard}
        />

        <SaveBeforeShareModal
          isOpen={isSaveBeforeShareOpen}
          onClose={() => setIsSaveBeforeShareOpen(false)}
          onSaveAndShare={handleSaveAndShare}
          isLoading={isSharing || isGeneratingShareUrl}
        />
      </div>
    </div>
  );
}
