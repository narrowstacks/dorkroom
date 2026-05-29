import type { BorderPreset } from '@dorkroom/logic';
import {
  BookOpen,
  Crop,
  EyeOff,
  Image,
  Move,
  RotateCcw,
  Ruler,
  Share,
  Target,
} from 'lucide-react';
import { Drawer, DrawerBody, DrawerContent } from '../../components/drawer';
import { SaveBeforeShareModal } from '../../components/save-before-share-modal';
import { SettingsButton } from '../../components/settings-button';
import { ShareModal } from '../../components/share-modal';
import { StatusAlert } from '../../components/status-alert';
import { AnimatedPreview } from './animated-preview';
import type { BorderCalculatorContextValue } from './border-calculator-context';
import { BorderSizeSection } from './sections/border-size-section';
import { PaperSizeSection } from './sections/paper-size-section';
import { PositionOffsetsSection } from './sections/position-offsets-section';
import { PresetsSection } from './sections/presets-section';

export type ActiveSection =
  | 'paperSize'
  | 'borderSize'
  | 'positionOffsets'
  | 'presets';

type Calculation = NonNullable<BorderCalculatorContextValue['calculation']>;
type FormatDimensions = BorderCalculatorContextValue['formatDimensions'];

interface PreviewCardProps {
  calculation: Calculation;
  showBlades: boolean;
  showBladeReadings: boolean;
  isHighContrast: boolean;
  paperSizeDisplayValue: string;
  formatDimensions: FormatDimensions;
}

export function MobilePreviewCard({
  calculation,
  showBlades,
  showBladeReadings,
  isHighContrast,
  paperSizeDisplayValue,
  formatDimensions,
}: PreviewCardProps) {
  return (
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

      {/* Image Dimensions */}
      <div className="mt-4 text-center">
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {formatDimensions(calculation.printWidth, calculation.printHeight, {
            maxPrecision: 2,
          })}{' '}
          image on {paperSizeDisplayValue}
        </p>
      </div>
    </div>
  );
}

interface WarningsCardProps {
  isHighContrast: boolean;
  bladeWarning: string | null;
  minBorderWarning: string | null;
  paperSizeWarning: string | null;
  offsetWarning: string | null;
}

export function MobileWarningsCard({
  isHighContrast,
  bladeWarning,
  minBorderWarning,
  paperSizeWarning,
  offsetWarning,
}: WarningsCardProps) {
  return (
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
      {bladeWarning && <StatusAlert message={bladeWarning} action="error" />}
      {minBorderWarning && (
        <StatusAlert message={minBorderWarning} action="error" />
      )}
      {paperSizeWarning && (
        <StatusAlert message={paperSizeWarning} action="warning" />
      )}
      {offsetWarning && (
        <StatusAlert message={offsetWarning} action="warning" />
      )}
    </div>
  );
}

interface SettingsCardProps {
  isHighContrast: boolean;
  aspectRatioDisplayValue: string;
  paperSizeDisplayValue: string;
  borderSizeDisplayValue: string;
  positionDisplayValue: string;
  presetsDisplayValue: string;
  showBlades: boolean;
  showBladeReadings: boolean;
  onOpenSection: (section: ActiveSection) => void;
  onToggleBlades: () => void;
  onToggleBladeReadings: () => void;
  onShareClick: () => void;
}

export function MobileSettingsCard({
  isHighContrast,
  aspectRatioDisplayValue,
  paperSizeDisplayValue,
  borderSizeDisplayValue,
  positionDisplayValue,
  presetsDisplayValue,
  showBlades,
  showBladeReadings,
  onOpenSection,
  onToggleBlades,
  onToggleBladeReadings,
  onShareClick,
}: SettingsCardProps) {
  const buttonClassName = isHighContrast
    ? 'backdrop-blur-sm'
    : 'backdrop-blur-sm shadow-lg';

  return (
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
          onPress={() => onOpenSection('paperSize')}
          icon={Image}
          className={buttonClassName}
        />

        <SettingsButton
          label="Border Size"
          value={borderSizeDisplayValue}
          onPress={() => onOpenSection('borderSize')}
          icon={Ruler}
          className={buttonClassName}
        />

        <SettingsButton
          label="Position & Offsets"
          value={positionDisplayValue}
          onPress={() => onOpenSection('positionOffsets')}
          icon={Move}
          className={buttonClassName}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SettingsButton
          label="Blades"
          onPress={onToggleBlades}
          icon={showBlades ? EyeOff : Crop}
          showChevron={false}
          centerLabel={true}
          className={buttonClassName}
        />

        <SettingsButton
          label="Readings"
          onPress={onToggleBladeReadings}
          icon={showBladeReadings ? EyeOff : Target}
          showChevron={false}
          centerLabel={true}
          className={buttonClassName}
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <SettingsButton
            value={presetsDisplayValue}
            onPress={() => onOpenSection('presets')}
            icon={BookOpen}
            className={buttonClassName}
          />
        </div>

        <button
          type="button"
          onClick={onShareClick}
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
          <Share className="size-5" />
        </button>
      </div>
    </div>
  );
}

interface ResetButtonProps {
  isHighContrast: boolean;
  onReset: () => void;
}

export function MobileResetButton({
  isHighContrast,
  onReset,
}: ResetButtonProps) {
  return (
    <button
      type="button"
      onClick={onReset}
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
      <RotateCcw className="size-4" />
      Reset to Defaults
    </button>
  );
}

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeSection: ActiveSection;
  currentPreset: BorderPreset | null;
  onApplyPreset: (preset: BorderPreset) => void;
  onSavePreset: (name: string) => void;
  onUpdatePreset: (
    id: string,
    name: string,
    settings: BorderCalculatorContextValue['currentSettings']
  ) => void;
  onDeletePreset: (id: string) => void;
}

export function MobileSettingsDrawer({
  isOpen,
  onClose,
  activeSection,
  currentPreset,
  onApplyPreset,
  onSavePreset,
  onUpdatePreset,
  onDeletePreset,
}: SettingsDrawerProps) {
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      anchor="bottom"
      enableBackgroundBlur={false}
      enableBackgroundOverlay={false}
    >
      <DrawerContent>
        <DrawerBody>
          {activeSection === 'paperSize' && (
            <PaperSizeSection onClose={onClose} />
          )}

          {activeSection === 'borderSize' && (
            <BorderSizeSection onClose={onClose} />
          )}

          {activeSection === 'positionOffsets' && (
            <PositionOffsetsSection onClose={onClose} />
          )}

          {activeSection === 'presets' && (
            <PresetsSection
              onClose={onClose}
              currentPreset={currentPreset}
              onApplyPreset={onApplyPreset}
              onSavePreset={onSavePreset}
              onUpdatePreset={onUpdatePreset}
              onDeletePreset={onDeletePreset}
            />
          )}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

/** Inputs for the "share preset" modal. */
export interface ShareModalConfig {
  isOpen: boolean;
  onClose: () => void;
  presetName: string;
  webUrl: string;
  onCopyToClipboard: (url: string) => Promise<void>;
  canCopyToClipboard: boolean;
}

/** Inputs for the "save before share" modal. */
export interface SaveBeforeShareConfig {
  isOpen: boolean;
  onClose: () => void;
  onSaveAndShare: (name: string) => void;
  isLoading: boolean;
}

interface SharingModalsProps {
  share: ShareModalConfig;
  saveBeforeShare: SaveBeforeShareConfig;
}

export function MobileSharingModals({
  share,
  saveBeforeShare,
}: SharingModalsProps) {
  return (
    <>
      <ShareModal
        isOpen={share.isOpen}
        onClose={share.onClose}
        presetName={share.presetName}
        webUrl={share.webUrl}
        onCopyToClipboard={share.onCopyToClipboard}
        canShareNatively={false}
        canCopyToClipboard={share.canCopyToClipboard}
      />

      <SaveBeforeShareModal
        isOpen={saveBeforeShare.isOpen}
        onClose={saveBeforeShare.onClose}
        onSaveAndShare={saveBeforeShare.onSaveAndShare}
        isLoading={saveBeforeShare.isLoading}
      />
    </>
  );
}
