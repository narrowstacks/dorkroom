import type { FC } from 'react';
import { SaveBeforeShareModal } from '../../components/save-before-share-modal';
import { ShareModal } from '../../components/share-modal';
import { getRouteIcon, ROUTE_DESCRIPTIONS } from '../../lib/navigation';
import { CalculatorLayout } from '../calculator/calculator-layout';
import { BladeReadingsSection } from './blade-readings-section';
import { BladeVisualizationSection } from './blade-visualization-section';
import { useBorderCalculator } from './border-calculator-context';
import { BorderInfoSection } from './border-info-section';
import { BordersOffsetsSection } from './borders-offsets-section';
import { PaperSetupSection } from './paper-setup-section';
import { PresetsSection } from './presets-section';
import { PreviewAndControlsSection } from './preview-and-controls-section';

// Border calculator carries the Printing category's indigo accent (plan 007).
const BorderIcon = getRouteIcon('/border');

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
    <CalculatorLayout
      title="Border Calculator"
      icon={BorderIcon}
      accentTone="indigo"
      description={ROUTE_DESCRIPTIONS['/border']}
      sidebar={
        // Right column: Configuration (primary controls)
        <>
          <PaperSetupSection />
          <BordersOffsetsSection />
          <BladeVisualizationSection />
          <PresetsSection />
        </>
      }
      footer={
        <>
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
        </>
      }
    >
      {/* Left column: Preview + Results (critical, always visible) */}
      {calculation && (
        <>
          <PreviewAndControlsSection />
          <BladeReadingsSection />
        </>
      )}
    </CalculatorLayout>
  );
};
