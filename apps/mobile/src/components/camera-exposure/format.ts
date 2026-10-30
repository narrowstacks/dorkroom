import {
  type CameraExposureFormState,
  EV_PRESETS,
  type ExposureComparison,
  formatAperture,
  formatShutterSpeed,
  type PresetWarning,
  type SolveFor,
  type StandardValue,
} from '@dorkroom/logic';
import type { PickerOption } from '@/components/development/option-picker-sheet';

/** Picker options keyed by the standard label, the same key the logic
 * package's `apertureToKey` / `shutterSpeedToKey` / `isoToKey` produce. */
export function standardOptions(
  values: readonly StandardValue[]
): PickerOption<string>[] {
  return values.map((v) => ({ label: v.label, value: v.label }));
}

/** Label -> value decoder for a standard list. */
export function standardLookup(
  values: readonly StandardValue[]
): ReadonlyMap<string, number> {
  return new Map(values.map((v) => [v.label, v.value]));
}

export const SOLVE_FOR_OPTIONS: { label: string; value: SolveFor }[] = [
  { label: 'Shutter', value: 'shutterSpeed' },
  { label: 'Aperture', value: 'aperture' },
  { label: 'ISO', value: 'iso' },
];

/** "f/8 · 1/125 · ISO 100" */
export function formatSettings(
  aperture: number,
  shutterSpeed: number,
  iso: number
): string {
  return `${formatAperture(aperture)} · ${formatShutterSpeed(shutterSpeed)} · ISO ${iso}`;
}

/** "+2", "−1.5", "0": signed stops for the comparison stat. */
export function formatSignedStops(stops: number): string {
  if (stops === 0) return '0';
  return stops > 0 ? `+${stops}` : `−${Math.abs(stops)}`;
}

/** Plain-language reading of an A-vs-B comparison (same wording as web). */
export function describeComparison(comparison: ExposureComparison): string {
  if (comparison.stopsDifference > 0) return 'A is darker than B';
  if (comparison.stopsDifference < 0) return 'B is darker than A';
  return 'Same exposure';
}

// What to do instead, by which value the preset couldn't reach and which way
// it missed. Mirrors the web camera exposure page.
const PRESET_WARNING_HINTS = {
  shutterSpeed: {
    over: 'Use Bulb, or open the aperture / raise ISO.',
    under: 'Stop down or lower ISO, or use an ND filter.',
  },
  aperture: {
    over: 'Use a faster shutter speed or lower ISO, or an ND filter.',
    under: 'Use a slower shutter speed or raise ISO.',
  },
  iso: {
    over: 'Use a wider aperture or a slower shutter speed instead.',
    under: 'Use a narrower aperture or a faster shutter speed instead.',
  },
} satisfies Record<SolveFor, Record<PresetWarning['direction'], string>>;

const PRESET_WARNING_RANGE = {
  shutterSpeed: { over: 'longer than', under: 'faster than' },
  aperture: { over: 'smaller than', under: 'wider than' },
  iso: { over: 'above', under: 'below' },
} satisfies Record<SolveFor, Record<PresetWarning['direction'], string>>;

/**
 * Notice for a preset whose solved value fell outside the dial range, e.g.
 * `Night Sky (EV -2) needs 256" at f/8, ISO 100: longer than the 30" limit.
 * Use Bulb, or open the aperture / raise ISO.`
 */
export function formatPresetWarning(
  warning: PresetWarning,
  values: CameraExposureFormState
): string {
  const preset = EV_PRESETS.find((p) => p.ev === warning.presetEv);
  const label = preset
    ? `${preset.label} (EV ${warning.presetEv})`
    : `EV ${warning.presetEv}`;
  const context =
    warning.variable === 'shutterSpeed'
      ? `${formatAperture(values.aperture)}, ISO ${values.iso}`
      : warning.variable === 'aperture'
        ? `${formatShutterSpeed(values.shutterSpeed)}, ISO ${values.iso}`
        : `${formatAperture(values.aperture)}, ${formatShutterSpeed(values.shutterSpeed)}`;
  const range = PRESET_WARNING_RANGE[warning.variable][warning.direction];
  const hint = PRESET_WARNING_HINTS[warning.variable][warning.direction];
  return `${label} needs ${warning.required} at ${context}: ${range} the ${warning.limit} limit. ${hint}`;
}
