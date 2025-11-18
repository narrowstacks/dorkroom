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
} from '@dorkroom/ui';

// Sections
import {
  PaperSizeSection,
  BorderSizeSection,
  PositionOffsetsSection,
  PresetsSection,
} from './sections';

// Hooks & Types
import { useTheme } from '../../contexts/theme-context';
import type { useBorderCalculatorController } from '../../pages/border-calculator/hooks/use-border-calculator-controller';
import type { BorderPreset } from '@dorkroom/logic';

// Active section type
type ActiveSection = 'paperSize' | 'borderSize' | 'positionOffsets' | 'presets';

type MobileBorderLayoutProps = ReturnType<typeof useBorderCalculatorController>;

/**
 * Render the mobile UI for configuring border/calculation settings, managing presets, and sharing results.
 *
 * Renders the calculator's hero results, animated preview, warnings, settings controls, presets management, and sharing flows
 * inside a bottom drawer and modals.
 */
export function MobileBorderLayout({
  form,
  formValues,
  calculation,
  paperWidthInput,
  paperHeightInput,
  displayPaperSizes,
  quarterRoundedMinBorder,
  offsetWarning,
  bladeWarning,
  minBorderWarning,
  paperSizeWarning,
  presets,
  selectedPresetId,
  presetName,
  isShareModalOpen,
  isSaveBeforeShareOpen,
  shareUrls,
  isSharing,
  isGeneratingShareUrl,
  canShareNatively,
  canCopyToClipboard,
  handlePaperWidthChange,
  handlePaperWidthBlur,
  handlePaperHeightChange,
  handlePaperHeightBlur,
  handleRoundMinBorderToQuarter,
  resetToDefaults,
  handleSelectPreset,
  setPresetName,
  savePreset,
  updatePresetHandler,
  deletePresetHandler,
  applyPresetSettings,
  handleShareClick,
  handleSaveAndShare,
  handleCopyToClipboard,
  handleNativeShare,
  setIsShareModalOpen,
  setIsSaveBeforeShareOpen,
  formatWithUnit,
  formatDimensions,
  currentSettings,
}: MobileBorderLayoutProps) {
  // Theme
  const { resolvedTheme } = useTheme();
  const isHighContrast = resolvedTheme === 'high-contrast';

  // Measurement unit
  // const { unit } = useMeasurement();

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeSection, setActiveSection] =
    useState<ActiveSection>('paperSize');

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
  } = formValues;

  // Derive current preset object for the UI that expects it
  const currentPreset = useMemo(() => {
    if (selectedPresetId) {
      return presets.find((p) => p.id === selectedPresetId) || null;
    }
    // If no ID but we have a name (e.g. from URL or custom name), create a transient object
    if (presetName) {
      return {
        id: 'custom',
        name: presetName,
        settings: currentSettings,
      } as BorderPreset;
    }
    return null;
  }, [selectedPresetId, presets, presetName, currentSettings]);

  // Display values
  const paperSizeDisplayValue = useMemo(() => {
    const size = displayPaperSizes.find((s) => s.value === paperSize);
    if (!size) {
      if (paperSize === 'custom') {
        return formatDimensions(customPaperWidth, customPaperHeight);
      }
      return paperSize;
    }
    return size.label;
  }, [
    paperSize,
    customPaperWidth,
    customPaperHeight,
    displayPaperSizes,
    formatDimensions,
  ]);

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

  // Drawer handlers
  const openDrawerSection = (section: ActiveSection) => {
    setActiveSection(section);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
  };

  const toggleBlades = () => {
    form.setFieldValue('showBlades', !showBlades);
  };

  const toggleBladeReadings = () => {
    form.setFieldValue('showBladeReadings', !showBladeReadings);
  };

  // Handlers for PresetsSection
  const onApplyPreset = (preset: BorderPreset) => {
    handleSelectPreset(preset.id);
    closeDrawer();
  };

  const onSavePreset = (name: string) => {
    savePreset(name);
    closeDrawer();
  };

  const onUpdatePreset = (
    id: string,
    name: string,
    settings: typeof currentSettings
  ) => {
    updatePresetHandler(id, { name, settings });
  };

  // If calculation isn't ready yet, we might want to show a loader or null
  if (!calculation) return null;

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
              onClick={handleShareClick}
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
                  onApplyPreset={onApplyPreset}
                  onSavePreset={onSavePreset}
                  onUpdatePreset={onUpdatePreset}
                  onDeletePreset={deletePresetHandler}
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
