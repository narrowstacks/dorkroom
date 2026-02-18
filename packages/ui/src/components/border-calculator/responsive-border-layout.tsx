import type { FC } from 'react';
import { SaveBeforeShareModal } from '../../components/save-before-share-modal';
import { ShareModal } from '../../components/share-modal';
import { BladeReadingsSection } from './blade-readings-section';
import { BladeVisualizationSection } from './blade-visualization-section';
import { useBorderCalculator } from './border-calculator-context';
import { BorderInfoSection } from './border-info-section';
import { BordersOffsetsSection } from './borders-offsets-section';
import { PaperSetupSection } from './paper-setup-section';
import { PresetsSection } from './presets-section';
import { PreviewAndControlsSection } from './preview-and-controls-section';

/**
 * Unified responsive layout for the border calculator.
 * Handles all screen sizes with CSS breakpoints:
 * - Phone (< 640px): single column, compact spacing
 * - Tablet (640-767px): single column, comfortable spacing
 * - Desktop (768-1199px): two-column 7:5 split
 * - Wide (1200px+): two-column with wider content area
 */
export const ResponsiveBorderLayout: FC = () => {
  const {
    calculation,
    presetName,
    isShareModalOpen,
    isSaveBeforeShareOpen,
    shareUrls,
    isSharing,
    isGeneratingShareUrl,
    canCopyToClipboard,
    handleCopyToClipboard,
    handleSaveAndShare,
    setIsShareModalOpen,
    setIsSaveBeforeShareOpen,
  } = useBorderCalculator();

  return (
    <div className="mx-auto max-w-6xl px-4 pb-12 pt-6 sm:px-6 md:px-8 md:pt-8">
      <div className="grid gap-4 md:gap-5 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        {/* Left column: Preview + Results (critical, always visible) */}
        <div className="space-y-4">
          {calculation && (
            <>
              <PreviewAndControlsSection />
              <BladeReadingsSection />
            </>
          )}
        </div>

        {/* Right column: Configuration (primary controls) */}
        <div className="space-y-4">
          <PaperSetupSection />
          <BordersOffsetsSection />
          <BladeVisualizationSection />
          <PresetsSection />
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
