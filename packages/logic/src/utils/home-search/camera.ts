/**
 * Camera-side answers: lens equivalents, and spotting camera-exposure
 * questions (answered by a link to the Camera Exposure calculator).
 */

import { SENSOR_FORMAT_MAP } from '../../constants/lens-calculator-defaults';
import { lensCalculatorLink } from '../../schemas/lens-calculator.schema';
import type { SensorFormat } from '../../types/lens-calculator';
import {
  calculateEquivalentFocalLength,
  calculateFieldOfView,
  formatFocalLength,
} from '../lens-calculations';
import { fact, trimNumber } from './format';
import { blank } from './query';
import type { HomeAnswer } from './types';

type LensAnswer = Extract<HomeAnswer, { kind: 'lens' }>;
type CameraExposureAnswer = Extract<HomeAnswer, { kind: 'camera_exposure' }>;

/** How each lens-calculator format is written, most specific first. */
const FORMAT_PATTERNS: readonly (readonly [string, RegExp])[] = [
  ['full-frame', /\b(?:full[\s-]*frame|ff|135)\b|(?:^|[^\dx.])35\s*mm\b/],
  ['half-frame', /\bhalf[\s-]*frame\b/],
  ['aps-c-canon', /\baps-?c\s*\(?canon\)?|\bcanon\s*aps-?c\b/],
  ['aps-c-nikon', /\baps-?c\b/],
  [
    'micro-four-thirds',
    /\b(?:mft|m43|micro\s*(?:four|4)\s*thirds)\b|\bm4\/3\b/,
  ],
  [
    'medium-format-digital',
    /\b(?:gfx|x1d|907x|44x33|medium\s*format\s*digital)\b/,
  ],
  ['medium-format-phaseone', /\bphase\s*one\b/],
  ['film-645', /\b(?:645|6\s*x\s*4\.5|4\.5\s*x\s*6)\b/],
  ['film-6x6', /\b6\s*x\s*6\b/],
  ['film-6x7', /\b6\s*x\s*7\b/],
  ['film-6x9', /\b6\s*x\s*9\b/],
  ['film-4x5', /\b4\s*x\s*5\b/],
  ['film-8x10', /\b8\s*x\s*10\b/],
];

const LENS_WORDS =
  /\b(?:lens|lenses|equiv|equivalent|equivalency|fov|field of view|focal)\b/;

const format = (id: string): SensorFormat => SENSOR_FORMAT_MAP[id];

export interface LensReading {
  focal: number;
  source: SensorFormat;
  target: SensorFormat;
  assumedSource: boolean;
  assumedTarget: boolean;
  /** "lens" or "equivalent" was written, so the mm number is surely a lens. */
  explicit: boolean;
}

/** Read "80mm on 6x6 to 35mm": a focal length and up to two formats. */
export function readLens(text: string): LensReading | null {
  const mm = [...text.matchAll(/(?:^|[^\dx.])(\d+(?:\.\d+)?)\s*mm\b/g)];
  // Beside another mm number, "35mm" names the format ("8x10 35mm 300mm").
  const focalMatch = mm.find((m) => m[1] !== '35') ?? mm[0];
  if (!focalMatch) return null;
  const focal = Number(focalMatch[1]);
  let rest = blank(text, focalMatch.index, focalMatch[0].length);
  const found: { id: string; at: number }[] = [];
  for (const [id, pattern] of FORMAT_PATTERNS) {
    const match = pattern.exec(rest);
    if (!match) continue;
    found.push({ id, at: match.index });
    rest = blank(rest, match.index, match[0].length);
  }
  found.sort((a, b) => a.at - b.at);
  const explicit = LENS_WORDS.test(text);
  if (found.length === 0 && !explicit) return null;
  // "6x7 15mm" is more likely a border than a 15mm lens.
  if (!explicit && focal < 20) return null;
  if (!(focal > 0) || focal > 10000) return null;
  const source = format(found[0]?.id ?? 'full-frame');
  const target = found[1]
    ? format(found[1].id)
    : format(source.id === 'full-frame' ? 'film-6x6' : 'full-frame');
  return {
    focal,
    source,
    target,
    assumedSource: !found[0],
    assumedTarget: !found[1],
    explicit,
  };
}

export function lensAnswer(reading: LensReading): LensAnswer {
  const { focal, source, target } = reading;
  const equivalent = calculateEquivalentFocalLength(focal, source, target);
  const focalText = formatFocalLength(focal);
  const equivalentText = formatFocalLength(equivalent);
  return {
    kind: 'lens',
    title: `${focalText} on ${source.shortName} as ${target.shortName}`,
    badge: 'Lens',
    readAs: [
      { text: `${focalText} lens`, assumed: false },
      {
        text: `on ${source.shortName}${reading.assumedSource ? ' (default)' : ''}`,
        assumed: reading.assumedSource,
      },
      {
        text: `compared to ${target.shortName}${reading.assumedTarget ? ' (default)' : ''}`,
        assumed: reading.assumedTarget,
      },
    ],
    figure: {
      value: equivalentText.replace(/mm$/, ''),
      unit: 'mm',
      caption: `on ${target.shortName} frames the same view`,
    },
    facts: [
      fact(
        'Field of view',
        `${trimNumber(calculateFieldOfView(focal, source), 1)}°`,
        'diagonal'
      ),
      fact(`${source.shortName} crop`, `${source.cropFactor.toFixed(2)}×`),
      fact(`${target.shortName} crop`, `${target.cropFactor.toFixed(2)}×`),
      fact('Ratio', `×${(source.cropFactor / target.cropFactor).toFixed(2)}`),
    ],
    notes: [],
    footnote: 'Matches the diagonal. Depth of field and aspect ratio differ.',
    link: {
      label: 'Open in Lens Equivalency',
      target: {
        to: '/lenses',
        search: lensCalculatorLink.build({
          focalLength: focal,
          sourceFormat: source.id,
          targetFormat: target.id,
        }),
      },
    },
  };
}

/**
 * Anything plausibly about exposing in camera: an f-number, EV, sunny 16,
 * aperture or shutter talk.
 */
const CAMERA_EXPOSURE =
  /\bf\s*\/\s*\d|\bf\d+(?:\.\d+)?\b|\bev\b|\bsunny\s*16\b|\bapertures?\b|\bshutter\b|\bequivalent exposures?\b|\bexposure value\b|\bcamera exposure\b|\blight meter\b/;

/** A shutter fraction ("1/125"); only read so when no print size is in the query. */
const SHUTTER_FRACTION =
  /(?:^|\s)1\/(?:\d{3,4}|15|30|60)(?:\s*s(?:ec)?)?(?:\s|$)/;

export function isCameraExposure(text: string, hasSizes: boolean): boolean {
  return (
    CAMERA_EXPOSURE.test(text) || (!hasSizes && SHUTTER_FRACTION.test(text))
  );
}

export function cameraExposureAnswer(): CameraExposureAnswer {
  return {
    kind: 'camera_exposure',
    title: 'Camera Exposure calculator',
    badge: 'Camera',
    readAs: [],
    figure: null,
    facts: [],
    notes: [
      'Balance aperture, shutter speed and ISO, find equivalent exposures, and compare settings in EV.',
    ],
    footnote: null,
    link: {
      label: 'Open Camera Exposure',
      target: { to: '/exposure', search: {} },
    },
  };
}
