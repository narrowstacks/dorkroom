import { STANDARD_ISOS } from '@dorkroom/logic';
import { OptionRow } from '@/components/option-row';

/** Picks the film speed from the standard ISO list. */
export function IsoStepper({
  iso,
  onChange,
}: {
  iso: number;
  onChange: (iso: number) => void;
}) {
  const options = STANDARD_ISOS.map((entry) => ({
    label: entry.label,
    value: entry.value,
  }));
  return (
    <OptionRow
      label="Film speed"
      options={options}
      value={iso}
      onChange={onChange}
    />
  );
}
