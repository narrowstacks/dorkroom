import { useState, useMemo, useEffect, useCallback } from 'react';
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
import { SettingsButton } from './settings-button';
import { WarningAlert, Drawer, DrawerContent, DrawerBody } from '@dorkroom/ui';

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
  type BorderPreset,
  type BorderSettings,
} from '@dorkroom/logic';

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

export function MobileBorderCalculator({
  loadedPresetFromUrl,
  clearLoadedPreset,
}: MobileBorderCalculatorProps) {
  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeSection, setActiveSection] =
    useState<ActiveSection>('paperSize');
  const [currentPreset, setCurrentPreset] = useState<BorderPreset | null>(null);

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

  useEffect(() => {
    if (!loadedPresetFromUrl) return;

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
    return paperSize === 'custom'
      ? `${customPaperWidth}" × ${customPaperHeight}"`
      : paperSize;
  }, [paperSize, customPaperWidth, customPaperHeight]);

  const aspectRatioDisplayValue = useMemo(() => {
    return aspectRatio === 'custom'
      ? `${customAspectWidth}:${customAspectHeight}`
      : aspectRatio;
  }, [aspectRatio, customAspectWidth, customAspectHeight]);

  const borderSizeDisplayValue = useMemo(() => {
    return `${minBorder.toFixed(2)}"`;
  }, [minBorder]);

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

  // Action handlers
  const handleShare = useCallback(() => {
    alert('Share functionality would be implemented here');
  }, []);

  // Open drawer handlers
  const openDrawerSection = useCallback((section: ActiveSection) => {
    setActiveSection(section);
    setIsDrawerOpen(true);
  }, []);

  // Close drawer handler
  const closeDrawer = useCallback(() => {
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
    <div className="min-h-dvh bg-gradient-to-br from-zinc-950 via-zinc-900 to-black px-4 pb-24 pt-10 text-white">
      <div className="mx-auto max-w-md space-y-4">
        {/* Hero Section - Blade Results */}
        <div className="rounded-3xl bg-gradient-to-br from-white/15 via-white/5 to-white/0 p-[1px] shadow-[0_30px_90px_-40px_rgba(0,0,0,0.9)] backdrop-blur-sm">
          <div className="rounded-[calc(1.5rem-1px)] bg-zinc-950/80">
            <BladeResultsDisplay
              calculation={calculation}
              paperSize={paperSizeDisplayValue}
              aspectRatio={aspectRatioDisplayValue}
            />
          </div>
        </div>

        {/* Animated Preview */}
        <div className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-[0_35px_110px_-50px_rgba(0,0,0,0.95)] backdrop-blur-lg">
          <AnimatedPreview
            calculation={calculation}
            showBlades={showBlades}
            showBladeReadings={showBladeReadings}
            className="max-w-full border border-white/15 shadow-2xl"
          />
        </div>

        {/* Warnings */}
        {hasWarnings && (
          <div className="rounded-3xl border border-amber-400/30 bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-transparent p-5 shadow-[0_25px_80px_-45px_rgba(217,119,6,0.45)] space-y-2">
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
        <div className="rounded-3xl border border-white/12 bg-gradient-to-br from-zinc-900/90 via-zinc-900/70 to-zinc-900/50 p-6 shadow-[0_40px_120px_-60px_rgba(0,0,0,1)] backdrop-blur-lg space-y-5">
          <div className="space-y-3">
            <SettingsButton
              label="Paper and Image Size"
              value={`${aspectRatioDisplayValue} on ${paperSizeDisplayValue}`}
              onPress={() => openDrawerSection('paperSize')}
              icon={Image}
              className="border-white/20 bg-white/10 backdrop-blur-sm shadow-lg"
            />

            <SettingsButton
              label="Border Size"
              value={borderSizeDisplayValue}
              onPress={() => openDrawerSection('borderSize')}
              icon={Ruler}
              className="border-white/20 bg-white/10 backdrop-blur-sm shadow-lg"
            />

            <SettingsButton
              label="Position & Offsets"
              value={positionDisplayValue}
              onPress={() => openDrawerSection('positionOffsets')}
              icon={Move}
              className="border-white/20 bg-white/10 backdrop-blur-sm shadow-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <SettingsButton
              label="Blades"
              onPress={toggleBlades}
              icon={showBlades ? EyeOff : Crop}
              showChevron={false}
              centerLabel={true}
              className="border-white/20 bg-white/10 backdrop-blur-sm shadow-lg"
            />

            <SettingsButton
              label="Readings"
              onPress={toggleBladeReadings}
              icon={showBladeReadings ? EyeOff : Target}
              showChevron={false}
              centerLabel={true}
              className="border-white/20 bg-white/10 backdrop-blur-sm shadow-lg"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <SettingsButton
                value={presetsDisplayValue}
                onPress={() => openDrawerSection('presets')}
                icon={BookOpen}
                className="border-white/20 bg-white/10 backdrop-blur-sm shadow-lg"
              />
            </div>

            <button
              onClick={handleShare}
              className="rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-lime-400 p-4 font-semibold text-emerald-950 shadow-lg transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
              title="Share preset"
            >
              <Share className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Reset Button */}
        <button
          onClick={resetToDefaults}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100 shadow-lg transition hover:bg-red-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
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
      </div>
    </div>
  );
}
