import type { FC } from 'react';
import {
  ShareModal,
} from '../../components/share-modal';
import {
  SaveBeforeShareModal,
} from '../../components/save-before-share-modal';
import {
  PaperSetupSection,
} from './paper-setup-section';
import {
  BordersOffsetsSection,
} from './borders-offsets-section';
import {
  BladeReadingsSection,
} from './blade-readings-section';
import {
  PreviewAndControlsSection,
} from './preview-and-controls-section';
import {
  BladeVisualizationSection,
} from './blade-visualization-section';
import {
  PresetsSection,
} from './presets-section';

import {
  AnimatedPreview,
} from './animated-preview';
import {
  BorderInfoSection,
} from './border-info-section';

import { useMemo } from 'react';
import {
  type SelectItem,
  SLIDER_MIN_BORDER,
  SLIDER_STEP_BORDER,
  OFFSET_SLIDER_MIN,
  OFFSET_SLIDER_MAX,
  OFFSET_SLIDER_STEP,
  OFFSET_SLIDER_LABELS,
  ASPECT_RATIOS,
} from '@dorkroom/logic';

import type { BorderCalculatorLayoutProps } from './types';

type DesktopBorderLayoutProps = BorderCalculatorLayoutProps;

export const DesktopBorderLayout: FC<DesktopBorderLayoutProps> = ({
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
  presets,
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
  handleNativeShare,
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
    isLandscape,
  } = formValues;

  // Generate dynamic slider labels based on the max allowed border
  const borderSliderLabels = useMemo(() => {
    const max = maxAllowedMinBorder;
    // Generate 5 evenly spaced labels from 0 to max, rounded to 1 decimal
    const step = max / 4;
    return [0, step, step * 2, step * 3, max].map((v) =>
      v === 0 ? '0' : v.toFixed(1).replace(/\.0$/, '')
    );
  }, [maxAllowedMinBorder]);

  return (
    <div className="mx-auto max-w-6xl px-6 pb-16 pt-12 sm:px-10">
      <div className="mt-2 grid gap-2 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="space-y-6">
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
                isLandscape={isLandscape}
                formatWithUnit={formatWithUnit}
                formatDimensions={formatDimensions}
                bladeWarning={bladeWarning}
                minBorderWarning={minBorderWarning}
                paperSizeWarning={paperSizeWarning}
              />
            </>
          )}
        </div>

        <div className="space-y-6">
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
