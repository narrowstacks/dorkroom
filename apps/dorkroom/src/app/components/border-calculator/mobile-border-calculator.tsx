import { useState, useMemo } from 'react';
import {
  RotateCcw,
  EyeOff,
  BookOpen,
  Share,
  Crop,
  Image,
  Ruler,
  Move,
} from 'lucide-react';

// Components
import { BladeResultsDisplay } from './blade-results-display';
import { AnimatedPreview } from './animated-preview';
import { SettingsButton } from './settings-button';
import { WarningAlert } from '../ui/warning-alert';
import { Drawer, DrawerContent, DrawerBody } from '../ui/drawer';

// Sections
import {
  PaperSizeSection,
  BorderSizeSection,
  PositionOffsetsSection,
  PresetsSection,
} from './sections';

// Hooks
import { useBorderCalculator } from '../../hooks/border-calculator';
import { useBorderPresets } from '../../hooks/use-border-presets';
import type {
  BorderPreset,
  BorderSettings,
} from '../../types/border-calculator';

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
      isLandscape,
      isRatioFlipped,
    ]
  );

  // Action handlers
  const handleShare = () => {
    // For now, just alert - in the real app this would open share modal
    alert('Share functionality would be implemented here');
  };

  // Open drawer handlers
  const openDrawerSection = (section: ActiveSection) => {
    setActiveSection(section);
    setIsDrawerOpen(true);
  };

  // Close drawer handler
  const closeDrawer = () => {
    setIsDrawerOpen(false);
  };

  return (
    <div className="min-h-dvh bg-zinc-900 p-4 pb-20">
      <div className="mx-auto max-w-md space-y-6">
        {/* Hero Section - Blade Results */}
        <BladeResultsDisplay
          calculation={calculation}
          paperSize={paperSizeDisplayValue}
          aspectRatio={aspectRatioDisplayValue}
        />

        {/* Animated Preview */}
        <AnimatedPreview
          calculation={calculation}
          showBlades={showBlades}
          className="max-w-full"
        />

        {/* Warnings */}
        {bladeWarning && <WarningAlert message={bladeWarning} action="error" />}
        {minBorderWarning && (
          <WarningAlert message={minBorderWarning} action="error" />
        )}
        {paperSizeWarning && (
          <WarningAlert message={paperSizeWarning} action="warning" />
        )}
        {offsetWarning && (
          <WarningAlert message={offsetWarning} action="warning" />
        )}

        {/* Settings Buttons */}
        <div className="space-y-3">
          <SettingsButton
            label="Paper and Image Size"
            value={`${aspectRatioDisplayValue} on ${paperSizeDisplayValue}`}
            onPress={() => openDrawerSection('paperSize')}
            icon={Image}
          />

          <SettingsButton
            label="Border Size"
            value={borderSizeDisplayValue}
            onPress={() => openDrawerSection('borderSize')}
            icon={Ruler}
          />

          <SettingsButton
            label="Position & Offsets"
            value={positionDisplayValue}
            onPress={() => openDrawerSection('positionOffsets')}
            icon={Move}
          />

          <div className="flex gap-3">
            <div className="flex-1">
              <SettingsButton
                label="Blades"
                onPress={() => setShowBlades(!showBlades)}
                icon={showBlades ? EyeOff : Crop}
                showChevron={false}
                centerLabel={true}
              />
            </div>

            <div className="flex-1">
              <SettingsButton
                value={presetsDisplayValue}
                onPress={() => openDrawerSection('presets')}
                icon={BookOpen}
              />
            </div>

            <button
              onClick={handleShare}
              className="rounded-lg bg-green-600 p-4 text-white transition hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <Share className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Reset Button */}
        <button
          onClick={resetToDefaults}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
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
                  onApplyPreset={(preset) => {
                    applyPreset(preset.settings);
                    setCurrentPreset(preset);
                    closeDrawer();
                  }}
                  onSavePreset={(name, settings) => {
                    const newPreset: BorderPreset = {
                      id: Date.now().toString(),
                      name,
                      settings,
                    };
                    addPreset(newPreset);
                    setCurrentPreset(newPreset);
                    closeDrawer();
                  }}
                  onUpdatePreset={(id, name, settings) => {
                    updatePreset(id, { name, settings });
                    if (currentPreset?.id === id) {
                      setCurrentPreset({ ...currentPreset, name, settings });
                    }
                  }}
                  onDeletePreset={(id) => {
                    removePreset(id);
                    if (currentPreset?.id === id) {
                      setCurrentPreset(null);
                    }
                  }}
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
