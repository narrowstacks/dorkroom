import { parseDecimalInput, type SensorFormat } from '@dorkroom/logic';
import type { PickerOption } from '@/components/development/option-picker-sheet';

const CATEGORY_LABEL = {
  digital: 'Digital',
  'film-medium': 'Medium format film',
  'film-large': 'Large format film',
} satisfies Record<SensorFormat['category'], string>;

const mm = (n: number) => `${Number(n.toFixed(1))}`;

/** "36×24 mm · Digital · 1.00× crop": the sublabel under a format option. */
export function formatSensorDetail(format: SensorFormat): string {
  return `${mm(format.width)}×${mm(format.height)} mm · ${
    CATEGORY_LABEL[format.category]
  } · ${format.cropFactor.toFixed(2)}× crop`;
}

/** Picker options for the source/target format sheets. */
export function buildSensorFormatOptions(
  formats: readonly SensorFormat[]
): PickerOption<string>[] {
  return formats.map((format) => ({
    label: format.name,
    value: format.id,
    sublabel: formatSensorDetail(format),
  }));
}

/** Parse the focal-length field. Blank or invalid text reads as 0, which the
 * lens hook treats as "no result" rather than an error. */
export function parseFocalLengthInput(text: string): number {
  const parsed = parseDecimalInput(text);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Text to show in the focal-length field. The hook stores a number, so the
 * field keeps the user's in-progress draft (e.g. "8", "85,", "") while it
 * still parses to the stored value, and otherwise shows the stored value:
 * after a preset tap, a swap of persisted state on hydration, or the hook's
 * clamp to its maximum.
 */
export function focalLengthFieldText(
  draft: string | null,
  focalLength: number
): string {
  if (draft !== null && parseFocalLengthInput(draft) === focalLength) {
    return draft;
  }
  return focalLength > 0 ? String(focalLength) : '';
}

export interface FormatPairLabels {
  source: string;
  target: string;
}

/**
 * Display names for a source/target pair. Short names normally, but some
 * formats share one (both APS-C variants are "APS-C"), so when they collide
 * both sides use the full name instead of reading "APS-C … APS-C".
 */
export function formatPairLabels(
  source: SensorFormat,
  target: SensorFormat
): FormatPairLabels {
  if (source.shortName === target.shortName) {
    return { source: source.name, target: target.name };
  }
  return { source: source.shortName, target: target.shortName };
}

export interface SensorRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SensorOverlay {
  /** The larger-area format, scaled to fit the box. */
  outer: SensorRect;
  /** The smaller-area format, at the same scale, centred in `outer`. */
  inner: SensorRect;
  /** Whether the source format is the outer (larger) one. */
  sourceIsOuter: boolean;
}

/**
 * Lay two formats out to scale, larger one fitted to a `boxW`×`boxH` box and
 * the smaller one centred inside it. Mirrors the web SensorSizeVisualization.
 * `inset` keeps that much margin on every side, so a stroke centred on the
 * outer rect's edge isn't clipped by the box.
 */
export function sensorOverlay(
  source: SensorFormat,
  target: SensorFormat,
  boxW: number,
  boxH: number,
  inset = 0
): SensorOverlay {
  const sourceIsOuter =
    source.width * source.height >= target.width * target.height;
  const big = sourceIsOuter ? source : target;
  const small = sourceIsOuter ? target : source;
  const scale = Math.min(
    (boxW - 2 * inset) / big.width,
    (boxH - 2 * inset) / big.height
  );
  const outerW = big.width * scale;
  const outerH = big.height * scale;
  const innerW = small.width * scale;
  const innerH = small.height * scale;
  return {
    outer: {
      x: (boxW - outerW) / 2,
      y: (boxH - outerH) / 2,
      w: outerW,
      h: outerH,
    },
    inner: {
      x: (boxW - innerW) / 2,
      y: (boxH - innerH) / 2,
      w: innerW,
      h: innerH,
    },
    sourceIsOuter,
  };
}
