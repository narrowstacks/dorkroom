import { ASPECT_RATIOS, PAPER_SIZES } from '@dorkroom/logic';
import { View } from 'react-native';
import { OptionRow } from '@/components/option-row';
import { ToggleRow } from '@/components/toggle-row';

type Option = { label: string; value: string };

// The raw ratio value is a compact pill label (e.g. "3:2"); spell out the one
// slug value that reads awkwardly.
const aspectPillLabel = (value: string) =>
  value === 'even-borders' ? 'Even' : value;

// Single pass (filter + map combined) — drops the unsupported 'custom' entry.
const aspectOptions = ASPECT_RATIOS.reduce<Option[]>((acc, r) => {
  if (r.value !== 'custom')
    acc.push({ label: aspectPillLabel(r.value), value: r.value });
  return acc;
}, []);
const paperOptions = PAPER_SIZES.reduce<Option[]>((acc, p) => {
  if (p.value !== 'custom') acc.push({ label: p.label, value: p.value });
  return acc;
}, []);

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
