import { ASPECT_RATIOS, PAPER_SIZES } from '@dorkroom/logic';
import { View } from 'react-native';
import { OptionRow } from '@/components/option-row';
import { ToggleRow } from '@/components/toggle-row';

const aspectOptions = ASPECT_RATIOS.filter((r) => r.value !== 'custom').map(
  (r) => ({
    label: r.value,
    value: r.value,
  })
);
const paperOptions = PAPER_SIZES.filter((p) => p.value !== 'custom').map(
  (p) => ({
    label: p.label,
    value: p.value,
  })
);

interface PaperImageSectionProps {
  aspectRatio: string;
  paperSize: string;
  isLandscape: boolean;
  isRatioFlipped: boolean;
  onAspectChange: (value: string) => void;
  onPaperChange: (value: string) => void;
  onToggleLandscape: (value: boolean) => void;
  onToggleFlip: (value: boolean) => void;
}

export function PaperImageSection({
  aspectRatio,
  paperSize,
  isLandscape,
  isRatioFlipped,
  onAspectChange,
  onPaperChange,
  onToggleLandscape,
  onToggleFlip,
}: PaperImageSectionProps) {
  return (
    <View className="gap-4">
      <OptionRow
        label="Aspect ratio"
        options={aspectOptions}
        value={aspectRatio}
        onChange={onAspectChange}
      />
      <OptionRow
        label="Paper size"
        options={paperOptions}
        value={paperSize}
        onChange={onPaperChange}
      />
      <ToggleRow
        label="Landscape"
        value={isLandscape}
        onChange={onToggleLandscape}
      />
      <ToggleRow
        label="Flip ratio"
        value={isRatioFlipped}
        onChange={onToggleFlip}
      />
    </View>
  );
}
