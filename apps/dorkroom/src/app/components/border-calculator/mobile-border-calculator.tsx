import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
import { SettingsButton } from '@dorkroom/ui';
import {
  WarningAlert,
  Drawer,
  DrawerContent,
  DrawerBody,
  ShareModal,
  SaveBeforeShareModal,
  useMeasurement,
  formatDimensions,
} from '@dorkroom/ui';

// Sections
import {
  PaperSizeSection,
  BorderSizeSection,
  PositionOffsetsSection,
  PresetsSection,
} from './sections';

// Hooks
import {
  useModularBorderCalculator as useBorderCalculator,
  useBorderPresets,
  usePresetSharing,
  shallowEqual,
  type BorderPreset,
  type BorderSettings,
  PAPER_SIZES,
} from '@dorkroom/logic';
import { useTheme } from '../../contexts/theme-context';
import { useMeasurementFormatter } from '@dorkroom/ui';

// Active section type
type ActiveSection = 'paperSize' | 'borderSize' | 'positionOffsets' | 'presets';

interface MobileBorderCalculatorProps {
  loadedPresetFromUrl?: {
    name: string;
    settings: BorderSettings;
    isFromUrl?: boolean;
  } | null;
  clearLoadedPreset?: () => void;
}

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
  const { formatWithUnit } = useMeasurementFormatter();

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeSection, setActiveSection] =
    useState<ActiveSection>('paperSize');
  const [currentPreset, setCurrentPreset] = useState<BorderPreset | null>(null);

  // Track if we've already loaded the preset from URL to prevent re-applying
  const hasLoadedPresetFromUrl = useRef(false);

  // Border calculator hooks
  const {
    aspectRatio,
    setAspectRatio,
    paperSize,
    setPaperSize,
    customAspectWidth,
    setCustomAspectWidth,
    customAspectHeight,
    setCustomAspectHeight,
    customPaperWidth,
    setCustomPaperWidth,
    customPaperHeight,
    setCustomPaperHeight,
    minBorder,
    setMinBorder,
    setMinBorderSlider,
    enableOffset,
    setEnableOffset,
    ignoreMinBorder,
    setIgnoreMinBorder,
    horizontalOffset,
    setHorizontalOffset,
    setHorizontalOffsetSlider,
    verticalOffset,
    setVerticalOffset,
    setVerticalOffsetSlider,
    showBlades,
    setShowBlades,
    showBladeReadings,
    setShowBladeReadings,
    isLandscape,
    setIsLandscape,
    isRatioFlipped,
    setIsRatioFlipped,
    offsetWarning,
    bladeWarning,
    calculation,
    minBorderWarning,
    paperSizeWarning,
    resetToDefaults,
    applyPreset,
  } = useBorderCalculator();

  const { presets, addPreset, updatePreset, removePreset } = useBorderPresets();

  // Sharing state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSaveBeforeShareOpen, setIsSaveBeforeShareOpen] = useState(false);
  const [shareUrls, setShareUrls] = useState<{
    webUrl: string;
    nativeUrl: string;
  } | null>(null);
  const [isGeneratingShareUrl, setIsGeneratingShareUrl] = useState(false);

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
        // TODO: Add toast notification for successful clipboard copy
      } else if (result.method === 'native') {
        setIsShareModalOpen(false);
      }
    },
    onShareError: () => {
      // TODO: Add toast notification for sharing error
    },
  });

  // Load preset from URL only once when it becomes available
  useEffect(() => {
    if (!loadedPresetFromUrl || hasLoadedPresetFromUrl.current) return;

    hasLoadedPresetFromUrl.current = true;

    applyPreset(loadedPresetFromUrl.settings);

    setCurrentPreset({
      id: `loaded-${Date.now()}`,
      name: loadedPresetFromUrl.name,
      settings: loadedPresetFromUrl.settings,
    });

    if (clearLoadedPreset) {
      clearLoadedPreset();
    }
  }, [loadedPresetFromUrl, applyPreset, clearLoadedPreset]);

  // Display values
  const paperSizeDisplayValue = useMemo(() => {
    if (paperSize === 'custom') {
      return formatDimensions(customPaperWidth, customPaperHeight, unit);
    }

    // Find the paper size in PAPER_SIZES to get dimensions
    const size = PAPER_SIZES.find((s) => s.value === paperSize);
    if (!size) return paperSize;

    // If metric, show metric with imperial reference
    if (unit === 'metric') {
      const metricLabel = formatDimensions(size.width, size.height, unit);
      const imperialLabel = `${size.width}×${size.height}in`;
      return `${metricLabel} (${imperialLabel})`;
    }

    // In imperial, use the original label
    return size.label;
  }, [paperSize, customPaperWidth, customPaperHeight, unit]);

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
    ]
  );

  // Sharing handlers
  const handleShare = useCallback(async (): Promise<void> => {
    setIsGeneratingShareUrl(true);

    try {
      // Check if current settings match a saved preset
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
          // TODO: Add toast notification for URL generation failure
          setShareUrls(null);
          setIsShareModalOpen(true);
        }
      } else if (currentPreset?.name?.trim()) {
        // If there's a current named preset (unsaved or loaded), use that name
        const urls = getSharingUrls({
          name: currentPreset.name.trim(),
          settings: currentSettings,
        });
        if (urls) {
          setShareUrls(urls);
          setIsShareModalOpen(true);
        } else {
          // TODO: Add toast notification for URL generation failure
          setShareUrls(null);
          setIsShareModalOpen(true);
        }
      } else {
        // No matching saved preset and no current name: prompt to save before share
        setIsSaveBeforeShareOpen(true);
      }
    } catch {
      // TODO: Add toast notification for share error
      setShareUrls(null);
      setIsShareModalOpen(true);
    } finally {
      setIsGeneratingShareUrl(false);
    }
  }, [presets, currentSettings, currentPreset, getSharingUrls]);

  const handleSaveAndShare = useCallback(
    async (name: string): Promise<void> => {
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

  const handleCopyToClipboard = useCallback(
    async (url: string): Promise<void> => {
      try {
        await navigator.clipboard.writeText(url);
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        throw error;
      }
    },
    []
  );

  const handleNativeShare = useCallback(async (): Promise<void> => {
    try {
      await sharePreset(
        {
          name: currentPreset?.name || 'Border Calculator Settings',
          settings: currentSettings,
        },
        false
      );
    } catch (error) {
      console.error('Native share failed:', error);
      throw error;
    }
  }, [sharePreset, currentPreset, currentSettings]);

  // Open drawer handlers
  const openDrawerSection = useCallback((section: ActiveSection): void => {
    setActiveSection(section);
    setIsDrawerOpen(true);
  }, []);

  // Close drawer handler
  const closeDrawer = useCallback((): void => {
    setIsDrawerOpen(false);
  }, []);

  const toggleBlades = useCallback(() => {
    setShowBlades(!showBlades);
  }, [setShowBlades, showBlades]);

  const toggleBladeReadings = useCallback(() => {
    setShowBladeReadings(!showBladeReadings);
  }, [setShowBladeReadings, showBladeReadings]);

  const handleApplyPreset = useCallback(
    (preset: BorderPreset) => {
      applyPreset(preset.settings);
      setCurrentPreset(preset);
      closeDrawer();
    },
    [applyPreset, closeDrawer]
  );

  const handleSavePreset = useCallback(
    (name: string, settings: BorderSettings) => {
      const newPreset: BorderPreset = {
        id: Date.now().toString(),
        name,
        settings,
      };
      addPreset(newPreset);
      setCurrentPreset(newPreset);
      closeDrawer();
    },
    [addPreset, closeDrawer, setCurrentPreset]
  );

  const handleUpdatePreset = useCallback(
    (id: string, name: string, settings: BorderSettings) => {
      updatePreset(id, { name, settings });
      setCurrentPreset((prev) =>
        prev?.id === id ? { ...prev, name, settings } : prev
      );
    },
    [updatePreset, setCurrentPreset]
  );

  const handleDeletePreset = useCallback(
    (id: string) => {
      removePreset(id);
      setCurrentPreset((prev) => (prev?.id === id ? null : prev));
    },
    [removePreset, setCurrentPreset]
  );

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
                  aspectRatio={aspectRatio}
                  setAspectRatio={setAspectRatio}
                  customAspectWidth={customAspectWidth}
                  setCustomAspectWidth={setCustomAspectWidth}
                  customAspectHeight={customAspectHeight}
                  setCustomAspectHeight={setCustomAspectHeight}
                  paperSize={paperSize}
                  setPaperSize={setPaperSize}
                  customPaperWidth={customPaperWidth}
                  setCustomPaperWidth={setCustomPaperWidth}
                  customPaperHeight={customPaperHeight}
                  setCustomPaperHeight={setCustomPaperHeight}
                  isLandscape={isLandscape}
                  setIsLandscape={setIsLandscape}
                  isRatioFlipped={isRatioFlipped}
                  setIsRatioFlipped={setIsRatioFlipped}
                />
              )}

              {activeSection === 'borderSize' && (
                <BorderSizeSection
                  onClose={closeDrawer}
                  minBorder={minBorder}
                  setMinBorder={setMinBorder}
                  setMinBorderSlider={setMinBorderSlider}
                  minBorderWarning={minBorderWarning || undefined}
                />
              )}

              {activeSection === 'positionOffsets' && (
                <PositionOffsetsSection
                  onClose={closeDrawer}
                  enableOffset={enableOffset}
                  setEnableOffset={setEnableOffset}
                  ignoreMinBorder={ignoreMinBorder}
                  setIgnoreMinBorder={setIgnoreMinBorder}
                  horizontalOffset={horizontalOffset}
                  setHorizontalOffset={setHorizontalOffset}
                  setHorizontalOffsetSlider={setHorizontalOffsetSlider}
                  verticalOffset={verticalOffset}
                  setVerticalOffset={setVerticalOffset}
                  setVerticalOffsetSlider={setVerticalOffsetSlider}
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
    </div>
  );
}
