import {
  ASPECT_RATIOS,
  OFFSET_SLIDER_LABELS,
  OFFSET_SLIDER_MAX,
  OFFSET_SLIDER_MIN,
  OFFSET_SLIDER_STEP,
  type SelectItem,
  SLIDER_MIN_BORDER,
  SLIDER_STEP_BORDER,
} from '@dorkroom/logic';
import type { FC } from 'react';
import { useMemo } from 'react';
import { SaveBeforeShareModal } from '../../components/save-before-share-modal';
import { ShareModal } from '../../components/share-modal';
import { AnimatedPreview } from './animated-preview';
import { BladeReadingsSection } from './blade-readings-section';
import { BladeVisualizationSection } from './blade-visualization-section';
import { BorderInfoSection } from './border-info-section';
import { BordersOffsetsSection } from './borders-offsets-section';
import { PaperSetupSection } from './paper-setup-section';
import { PresetsSection } from './presets-section';
import { PreviewAndControlsSection } from './preview-and-controls-section';

import type { BorderCalculatorLayoutProps } from './types';

type ResponsiveBorderLayoutProps = BorderCalculatorLayoutProps;

/**
 * Unified responsive layout for the border calculator.
 * Handles all screen sizes with CSS breakpoints:
 * - Phone (< 640px): single column, compact spacing
 * - Tablet (640-767px): single column, comfortable spacing
 * - Desktop (768-1199px): two-column 7:5 split
 * - Wide (1200px+): two-column with wider content area
 */
export const ResponsiveBorderLayout: FC<ResponsiveBorderLayoutProps> = ({
  form,
  formValues,
  calculation,
  paperWidthInput,
  paperHeightInput,
  displayPaperSizes,
  quarterRoundedMinBorder,
  maxAllowedMinBorder,
  offsetWarning,
  bladeWarning,
  minBorderWarning,
  paperSizeWarning,
  selectedPresetId,
  presetName,
  isEditingPreset,
  isSharing,
  isGeneratingShareUrl,
  isShareModalOpen,
  isSaveBeforeShareOpen,
  shareUrls,
  canCopyToClipboard,
  handlePaperWidthChange,
  handlePaperWidthBlur,
  handlePaperHeightChange,
  handlePaperHeightBlur,
  handleRoundMinBorderToQuarter,
  resetToDefaults,
  handleSelectPreset,
  setPresetName,
  setIsEditingPreset,
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
  presetItems,
}) => {
  const {
    customAspectWidth,
    customAspectHeight,
    enableOffset,
    ignoreMinBorder,
  } = formValues;

  const borderSliderLabels = useMemo(() => {
    const max = maxAllowedMinBorder;
    const step = max / 4;
    return [0, step, step * 2, step * 3, max].map((v) =>
      v === 0 ? '0' : v.toFixed(1).replace(/\.0$/, '')
    );
  }, [maxAllowedMinBorder]);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-12 pt-6 sm:px-6 md:px-8 md:pt-8">
      <div className="grid gap-4 md:gap-5 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        {/* Left column: Preview + Results (critical, always visible) */}
        <div className="space-y-4">
          {calculation && (
            <>
              <PreviewAndControlsSection
                form={form}
                calculation={calculation}
                AnimatedPreview={AnimatedPreview}
                onResetToDefaults={resetToDefaults}
              />

              <BladeReadingsSection
                calculation={calculation}
                formatWithUnit={formatWithUnit}
                formatDimensions={formatDimensions}
                bladeWarning={bladeWarning}
                minBorderWarning={minBorderWarning}
                paperSizeWarning={paperSizeWarning}
              />
            </>
          )}
        </div>

        {/* Right column: Configuration (primary controls) */}
        <div className="space-y-4">
          <PaperSetupSection
            form={form}
            displayPaperSizes={displayPaperSizes}
            paperWidthInput={paperWidthInput}
            paperHeightInput={paperHeightInput}
            onPaperWidthChange={handlePaperWidthChange}
            onPaperWidthBlur={handlePaperWidthBlur}
            onPaperHeightChange={handlePaperHeightChange}
            onPaperHeightBlur={handlePaperHeightBlur}
            aspectRatios={ASPECT_RATIOS as SelectItem[]}
            customAspectWidth={customAspectWidth}
            customAspectHeight={customAspectHeight}
          />

          <BordersOffsetsSection
            form={form}
            sliderMinBorder={SLIDER_MIN_BORDER}
            sliderMaxBorder={maxAllowedMinBorder}
            sliderStepBorder={SLIDER_STEP_BORDER}
            borderSliderLabels={borderSliderLabels}
            offsetSliderMin={OFFSET_SLIDER_MIN}
            offsetSliderMax={OFFSET_SLIDER_MAX}
            offsetSliderStep={OFFSET_SLIDER_STEP}
            offsetSliderLabels={OFFSET_SLIDER_LABELS}
            offsetWarning={offsetWarning}
            enableOffset={enableOffset}
            ignoreMinBorder={ignoreMinBorder}
            onRoundToQuarter={handleRoundMinBorderToQuarter}
            roundToQuarterDisabled={quarterRoundedMinBorder === null}
          />

          <BladeVisualizationSection form={form} />

          <PresetsSection
            selectedPresetId={selectedPresetId}
            presetName={presetName}
            isEditingPreset={isEditingPreset}
            presetItems={presetItems}
            isSharing={isSharing}
            isGeneratingShareUrl={isGeneratingShareUrl}
            onSelectPreset={handleSelectPreset}
            onPresetNameChange={setPresetName}
            onEditingChange={setIsEditingPreset}
            onShareClick={handleShareClick}
            onSavePreset={savePreset}
            onUpdatePreset={updatePresetHandler}
            onDeletePreset={deletePresetHandler}
          />
        </div>
      </div>

      {/* Educational content */}
      <BorderInfoSection />

      {/* Sharing Modals */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        presetName={presetName || 'Border Calculator Settings'}
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
  );
};
