import type { BorderPreset } from '@dorkroom/logic';
import { useMemo, useState } from 'react';
import { useTheme } from '../../contexts/theme-context';
import { useBorderCalculator } from './border-calculator-context';
import {
  type ActiveSection,
  MobilePreviewCard,
  MobileResetButton,
  MobileSettingsCard,
  MobileSettingsDrawer,
  MobileSharingModals,
  MobileWarningsCard,
} from './mobile-border-layout-parts';

/**
 * Render the mobile UI for configuring border/calculation settings, managing presets, and sharing results.
 *
 * Renders the calculator's hero results, animated preview, warnings, settings controls, presets management, and sharing flows
 * inside a bottom drawer and modals.
 */
export function MobileBorderLayout() {
  const {
    form,
    formValues,
    calculation,
    displayPaperSizes,
    presets,
    selectedPresetId,
    presetName,
    isShareModalOpen,
    isSaveBeforeShareOpen,
    shareUrls,
    isSharing,
    isGeneratingShareUrl,
    canCopyToClipboard,
    offsetWarning,
    bladeWarning,
    minBorderWarning,
    paperSizeWarning,
    resetToDefaults,
    handleSelectPreset,
    savePreset,
    updatePresetHandler,
    deletePresetHandler,
    handleShareClick,
    handleSaveAndShare,
    handleCopyToClipboard,
    setIsShareModalOpen,
    setIsSaveBeforeShareOpen,
    formatWithUnit,
    formatDimensions,
    currentSettings,
  } = useBorderCalculator();

  // Theme
  const { resolvedTheme } = useTheme();
  const isHighContrast = resolvedTheme === 'high-contrast';

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
    horizontalOffset,
    verticalOffset,
    showBlades,
    showBladeReadings,
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

  const aspectRatioDisplayValue =
    aspectRatio === 'custom'
      ? `${customAspectWidth}:${customAspectHeight}`
      : aspectRatio;

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
        <MobilePreviewCard
          calculation={calculation}
          showBlades={showBlades}
          showBladeReadings={showBladeReadings}
          isHighContrast={isHighContrast}
          paperSizeDisplayValue={paperSizeDisplayValue}
          formatDimensions={formatDimensions}
        />

        {hasWarnings && (
          <MobileWarningsCard
            isHighContrast={isHighContrast}
            bladeWarning={bladeWarning}
            minBorderWarning={minBorderWarning}
            paperSizeWarning={paperSizeWarning}
            offsetWarning={offsetWarning}
          />
        )}

        <MobileSettingsCard
          isHighContrast={isHighContrast}
          aspectRatioDisplayValue={aspectRatioDisplayValue}
          paperSizeDisplayValue={paperSizeDisplayValue}
          borderSizeDisplayValue={borderSizeDisplayValue}
          positionDisplayValue={positionDisplayValue}
          presetsDisplayValue={presetsDisplayValue}
          showBlades={showBlades}
          showBladeReadings={showBladeReadings}
          onOpenSection={openDrawerSection}
          onToggleBlades={toggleBlades}
          onToggleBladeReadings={toggleBladeReadings}
          onShareClick={handleShareClick}
        />

        <MobileResetButton
          isHighContrast={isHighContrast}
          onReset={resetToDefaults}
        />

        <MobileSettingsDrawer
          isOpen={isDrawerOpen}
          onClose={closeDrawer}
          activeSection={activeSection}
          currentPreset={currentPreset}
          onApplyPreset={onApplyPreset}
          onSavePreset={onSavePreset}
          onUpdatePreset={onUpdatePreset}
          onDeletePreset={deletePresetHandler}
        />

        <MobileSharingModals
          share={{
            isOpen: isShareModalOpen,
            onClose: () => setIsShareModalOpen(false),
            presetName: currentPreset?.name || 'Border Calculator Settings',
            webUrl: shareUrls?.webUrl || '',
            onCopyToClipboard: handleCopyToClipboard,
            canCopyToClipboard,
          }}
          saveBeforeShare={{
            isOpen: isSaveBeforeShareOpen,
            onClose: () => setIsSaveBeforeShareOpen(false),
            onSaveAndShare: handleSaveAndShare,
            isLoading: isSharing || isGeneratingShareUrl,
          }}
        />
      </div>
    </div>
  );
}
