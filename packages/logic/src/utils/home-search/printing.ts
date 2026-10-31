/**
 * Darkroom printing answers: easel borders, print resizing, mat windows and
 * stop changes. Each reader takes a prepared query and returns an answer or
 * null; the math is the calculators' own.
 */

import { ASPECT_RATIO_MAP } from '../../constants/border-calculator';
import { BORDER_CALCULATOR_DEFAULTS } from '../../constants/border-calculator-defaults';
import {
  bestFitBorders,
  MAT_CALCULATOR_DEFAULTS,
  matBorderToInput,
  matSnapStep,
  parseMatInput,
} from '../../constants/mat-calculator';
import {
  borderCalculatorLink,
  type PersistedBorderCalculatorState,
} from '../../schemas/border-calculator-persistence';
import { exposureCalculatorLink } from '../../schemas/exposure-calculator.schema';
import { matCalculatorLink } from '../../schemas/mat-calculator.schema';
import { resizeCalculatorLink } from '../../schemas/resize-calculator.schema';
import { computePrintSize } from '../border-calculations';
import {
  calculateNewExposureTime,
  formatExposureTime,
} from '../exposure-calculations';
import {
  calculateResizeExposure,
  matchesAspectRatio,
  resizeExposureRatio,
} from '../resize-calculations';
import {
  type AnswerUnit,
  fact,
  formatDims,
  formatInches,
  formatLength,
  formatLengthWithUnit,
  formatSize,
  formatTypedDims,
  formatTypedInches,
  signed,
  trimNumber,
} from './format';
import {
  areaSqIn,
  blank,
  type Dims,
  findDims,
  inchesPer,
  NUMBER_SOURCE,
  readUnit,
  UNIT_SOURCE,
} from './query';
import type { HomeAnswer, HomeReading } from './types';

type BorderAnswer = Extract<HomeAnswer, { kind: 'border' }>;
type AspectRatioValue = NonNullable<
  PersistedBorderCalculatorState['aspectRatio']
>;
type PaperSizeValue = NonNullable<PersistedBorderCalculatorState['paperSize']>;

/** Round inches for a link param: enough for exact mm, no float noise. */
const linkInches = (inches: number): number => Number(inches.toFixed(4));

/* ------------------------------------------------------------------ *
   Easel borders
 * ------------------------------------------------------------------ */

interface Negative {
  label: string;
  ratio: AspectRatioValue;
  /** Landscape ratio, long side first. */
  w: number;
  h: number;
}

/** A border-calculator ratio by its value, landscape (the calculator's own numbers). */
const presetNegative = (label: string, ratio: AspectRatioValue): Negative => {
  const entry = ASPECT_RATIO_MAP.get(ratio);
  return { label, ratio, w: entry?.width ?? 3, h: entry?.height ?? 2 };
};

/** Negatives named by word, matched before sizes are read. */
const NAMED_NEGATIVES: readonly (readonly [
  RegExp,
  string,
  AspectRatioValue,
])[] = [
  [/\b(?:35\s*mm|135|full[\s-]*frame)\b/, '35mm', '3:2'],
  [/\bhalf[\s-]*frame\b/, 'Half frame', '4:3'],
  [/\bxpan\b/, 'XPan', '65:24'],
  [/\b645\b/, '6×4.5', '4:3'],
];

/** Negatives written as sizes, by `lo`x`hi`. */
const NEGATIVE_SIZES = new Map<string, readonly [string, AspectRatioValue]>([
  ['4.5x6', ['6×4.5', '4:3']],
  ['6x6', ['6×6', '1:1']],
  ['6x7', ['6×7', '7:6']],
  ['6x8', ['6×8', '4:3']],
  ['6x9', ['6×9', '3:2']],
  ['6x12', ['6×12', '2:1']],
  ['4x5', ['4×5', '5:4']],
  ['5x7', ['5×7', '7:5']],
  ['8x10', ['8×10', '5:4']],
]);

/** Inch papers the border calculator lists by name. */
const STANDARD_PAPERS = new Set<PaperSizeValue>([
  '5x7',
  '8x10',
  '11x14',
  '16x20',
  '20x24',
]);

interface Paper {
  label: string;
  /** Short and long sides, inches. */
  short: number;
  long: number;
  metric: boolean;
  standard: PaperSizeValue | null;
}

const DEFAULT_PAPER: Paper = {
  label: '8×10',
  short: 8,
  long: 10,
  metric: false,
  standard: BORDER_CALCULATOR_DEFAULTS.paperSize,
};

const DEFAULT_NEGATIVE = presetNegative('35mm', '3:2');

/** A size that is film notation, never paper ("6x7", "6x4.5"). */
export const isNegativeNotation = (dims: Dims): boolean =>
  dims.unit === 'mm' ||
  (dims.unit !== 'cm' && /^(?:4\.5x6|6x\d+)$/.test(dims.key));

const asPaperSize = (key: string): PaperSizeValue | null => {
  for (const value of STANDARD_PAPERS) if (value === key) return value;
  return null;
};

interface EaselReading {
  paper: Paper | null;
  negative: Negative | null;
  /** Border in inches, with the unit it was typed in. */
  border: { inches: number; unit: AnswerUnit } | null;
  /** A bare number too big to be an inch border, left out. */
  ignored: string | null;
  portrait: boolean;
  /** Whether anything here reads as an easel question at all. */
  any: boolean;
  /** Words the reading does not explain (perhaps a film name). */
  unread: boolean;
}

/**
 * A border length: a number that does not sit inside a word ("fp4") or
 * another number, with an optional unit.
 */
const BORDER_RE = new RegExp(
  String.raw`(?:^|[^\w.\/])(${NUMBER_SOURCE})(?:\s*(${UNIT_SOURCE}))?`,
  'g'
);

/** Words an easel question uses besides its sizes and numbers. */
const EASEL_WORDS =
  /\b(?:borders?|easel|blades?|landscape|horizontal|paper|negative|neg|print|min(?:imum)?|on|in|of|with|for|at|a|the)\b/g;

/**
 * Read paper, negative and border out of a query. `nameNumbers` are numbers
 * that belong to a film or developer name in it ("delta 100"), never a border.
 */
export function readEasel(
  text: string,
  nameNumbers: ReadonlySet<string> = new Set()
): EaselReading {
  let rest = text;
  let negative: Negative | null = null;
  for (const [pattern, label, ratio] of NAMED_NEGATIVES) {
    const match = pattern.exec(rest);
    if (match && !negative) {
      negative = presetNegative(label, ratio);
      rest = blank(rest, match.index, match[0].length);
    }
  }

  const dims = findDims(rest);
  for (const d of dims) rest = blank(rest, d.index, d.length);
  const lone4x5 = dims.length === 1 && dims[0].key === '4x5';
  let paper: Paper | null = null;
  for (const d of dims.toSorted((x, y) => areaSqIn(y) - areaSqIn(x))) {
    const canBePaper =
      !isNegativeNotation(d) && !lone4x5 && d.hi * d.toInches >= 5;
    if (!paper && canBePaper) {
      paper = {
        label: formatDims(d.lo, d.hi, d.unit),
        short: d.lo * d.toInches,
        long: d.hi * d.toInches,
        metric: d.unit !== 'in',
        standard: d.unit === 'in' ? asPaperSize(d.key) : null,
      };
    } else if (!negative) {
      const known = d.unit === 'in' ? NEGATIVE_SIZES.get(d.key) : undefined;
      negative = known
        ? presetNegative(known[0], known[1])
        : {
            label: `${formatDims(d.lo, d.hi, d.unit === 'mm' ? 'in' : d.unit)}${d.unit === 'mm' ? 'mm' : ''}`,
            ratio: 'custom',
            w: d.hi,
            h: d.lo,
          };
    }
  }

  let border: EaselReading['border'] = null;
  let ignored: string | null = null;
  const keyword = /\b(?:borders?|easel|blades?)\b/.test(text);
  const borderless = /\b(?:borderless|no borders?|full bleed)\b/.exec(rest);
  if (borderless) {
    border = { inches: 0, unit: 'in' };
    rest = blank(rest, borderless.index, borderless[0].length);
  } else {
    // The first number that reads as a border; a too-big bare one is noted
    // only when no other number does.
    for (const match of rest.matchAll(BORDER_RE)) {
      const typed = match[1].trim();
      if (nameNumbers.has(typed)) continue;
      const value = parseMatInput(typed);
      const unit = readUnit(match[2]);
      if (unit) border = { inches: value * inchesPer(unit), unit };
      else if (value <= 4 || keyword) border = { inches: value, unit: 'in' };
      if (border) {
        rest = blank(rest, match.index, match[0].length);
        ignored = null;
        break;
      }
      ignored ??= typed;
    }
  }

  const portrait = /\b(?:portrait|vertical)\b/.exec(rest);
  if (portrait) rest = blank(rest, portrait.index, portrait[0].length);

  return {
    paper,
    negative,
    border,
    ignored,
    portrait: portrait !== null,
    any: Boolean(paper || negative || (border && keyword)),
    unread: /[a-z]/.test(rest.replace(EASEL_WORDS, ' ')),
  };
}

/** The unit an easel answer leads with: the one the query was written in. */
function easelUnit(reading: EaselReading): AnswerUnit {
  if (reading.border?.unit === 'mm') return 'mm';
  if (reading.border?.unit === 'cm' || reading.paper?.metric) return 'cm';
  return 'in';
}

export function borderAnswer(reading: EaselReading): BorderAnswer {
  const paper = reading.paper ?? DEFAULT_PAPER;
  const negative = reading.negative ?? DEFAULT_NEGATIVE;
  const border = reading.border?.inches ?? BORDER_CALCULATOR_DEFAULTS.minBorder;
  const { portrait } = reading;
  const unit = easelUnit(reading);
  const alt: AnswerUnit = unit === 'in' ? 'cm' : 'in';

  const paperW = portrait ? paper.short : paper.long;
  const paperH = portrait ? paper.long : paper.short;
  const { printW, printH } = computePrintSize(
    paperW,
    paperH,
    portrait ? negative.h : negative.w,
    portrait ? negative.w : negative.h,
    border
  );
  const fits = printW > 0 && printH > 0;

  const borderText =
    border === 0
      ? 'no border'
      : unit === 'in'
        ? `${formatTypedInches(border)}″ min border`
        : `${formatLengthWithUnit(border, unit)} min border (${formatLengthWithUnit(border, 'in')})`;
  const readAs: HomeReading[] = [
    {
      text: `${paper.label} paper${reading.paper ? '' : ' (default)'}`,
      assumed: !reading.paper,
    },
    {
      text: `${negative.label} negative${reading.negative ? '' : ' (default)'}`,
      assumed: !reading.negative,
    },
    {
      text: `${borderText}${reading.border ? '' : ' (default)'}`,
      assumed: !reading.border,
    },
    ...(portrait ? [{ text: 'portrait', assumed: false }] : []),
  ];

  const notes: string[] = [];
  if (reading.ignored) {
    notes.push(
      `Ignored “${reading.ignored}”. For a border that size, add a unit, like “${reading.ignored}mm”.`
    );
  }
  if (!fits) {
    notes.push(
      `A ${formatLengthWithUnit(border, unit)} border on every side leaves no room on ${paper.label} paper. Try a smaller border.`
    );
  }

  const x = (paperW - printW) / 2;
  const y = (paperH - printH) / 2;
  const isCustomRatio = negative.ratio === 'custom';

  return {
    kind: 'border',
    title: `${paper.label} paper, ${negative.label} negative`,
    badge: 'Border',
    readAs,
    figure: fits
      ? {
          value: formatSize(printW, printH, unit),
          unit,
          caption: `print, ${formatSize(printW, printH, alt)} ${alt}`,
        }
      : null,
    facts: fits
      ? [
          fact(
            'Left / right',
            formatLengthWithUnit(x, unit),
            formatLengthWithUnit(x, alt)
          ),
          fact(
            'Top / bottom',
            formatLengthWithUnit(y, unit),
            formatLengthWithUnit(y, alt)
          ),
        ]
      : [],
    notes,
    footnote: fits
      ? 'Centred print. Blade readings are in the full calculator.'
      : null,
    diagram: fits
      ? { paperW, paperH, printX: x, printY: y, printW, printH }
      : null,
    link: {
      label: 'Open in Border Calculator',
      target: {
        to: '/border',
        search: borderCalculatorLink.build({
          paperSize: paper.standard ?? 'custom',
          // `build` gives no param for an undefined field.
          customPaperWidth: paper.standard
            ? undefined
            : linkInches(paper.short),
          customPaperHeight: paper.standard
            ? undefined
            : linkInches(paper.long),
          aspectRatio: negative.ratio,
          customAspectWidth: isCustomRatio ? negative.w : undefined,
          customAspectHeight: isCustomRatio ? negative.h : undefined,
          minBorder: linkInches(border),
          isLandscape: !portrait,
          isRatioFlipped: portrait,
        }),
      },
    },
  };
}

/* ------------------------------------------------------------------ *
   Print resize
 * ------------------------------------------------------------------ */

const RESIZE_WORDS =
  /\b(?:to|resize|resizing|scale|enlarge|bigger|smaller|from|into)\b|->|→/;

type ResizeAnswer = Extract<HomeAnswer, { kind: 'resize' }>;

interface ResizeSide {
  w: number;
  l: number;
  /** How the answer shows it ("11×14", "40 cm"). */
  label: string;
  /** How it is typed back into the box ("11x14", "40cm"). */
  typed: string;
}

interface ResizeReading {
  height: boolean;
  from: ResizeSide;
  to: ResizeSide;
}

/** Two sides in from-to order: "11x14 from 8x10" swaps them. */
function orderFromTo<T extends { index?: number }>(
  a: T,
  b: T,
  text: string
): [T, T] {
  const fromAt = text.search(/\bfrom\b/);
  return fromAt > (a.index ?? 0) && fromAt < (b.index ?? 0) ? [b, a] : [a, b];
}

/** Read a resize: two print sizes, or two enlarger heights. */
export function readResize(
  text: string,
  hasTime: boolean
): ResizeReading | null {
  if (/\b(?:height|head|column)\b/.test(text)) {
    const numbers = [
      ...text.matchAll(
        new RegExp(String.raw`(\d+(?:\.\d+)?)\s*(${UNIT_SOURCE})?`, 'g')
      ),
    ];
    if (numbers.length < 2) return null;
    const [first, second] = orderFromTo(numbers[0], numbers[1], text);
    // Each height keeps its own unit; one without falls back to the other's
    // ("height 40 to 60cm" is both cm), then to inches.
    const shared = readUnit(first[2] ?? second[2]) ?? 'in';
    const make = (n: RegExpMatchArray) => {
      const value = Number(n[1]);
      const unit = readUnit(n[2]) ?? shared;
      return {
        w: value * inchesPer(unit),
        l: 0,
        label: `${trimNumber(value, 2)}${unit === 'in' ? '″' : ` ${unit}`}`,
        typed: `${trimNumber(value, 2)}${unit}`,
      };
    };
    const from = make(first);
    const to = make(second);
    return from.w > 0 && to.w > 0 ? { height: true, from, to } : null;
  }
  const prints = findDims(text).filter(
    (d) => !isNegativeNotation(d) && d.hi * d.toInches >= 4
  );
  if (prints.length < 2 || !(hasTime || RESIZE_WORDS.test(text))) return null;
  const [a, b] = orderFromTo(prints[0], prints[1], text);
  const make = (d: Dims): ResizeSide => ({
    w: d.lo * d.toInches,
    l: d.hi * d.toInches,
    label: formatDims(d.lo, d.hi, d.unit),
    typed: formatTypedDims(d),
  });
  return { height: false, from: make(a), to: make(b) };
}

export function resizeAnswer(
  reading: ResizeReading,
  seconds: number | null
): ResizeAnswer | null {
  const input = {
    isEnlargerHeightMode: reading.height,
    originalWidth: reading.from.w,
    originalLength: reading.from.l,
    newWidth: reading.to.w,
    newLength: reading.to.l,
    originalHeight: reading.from.w,
    newHeight: reading.to.w,
  };
  const ratio = resizeExposureRatio(input);
  if (ratio === null) return null;
  const { newTime, stopsDifference } = calculateResizeExposure({
    ...input,
    originalTime: seconds ?? 1,
  });
  const sameProportions = matchesAspectRatio(input);
  const newSeconds = Number(newTime);

  const notes: string[] = [];
  if (seconds === null) {
    notes.push(
      `Add your base time for the new exposure, like “${reading.height ? 'height ' : ''}${reading.from.typed} to ${reading.to.typed} 12s”.`
    );
  }
  if (!sameProportions) {
    notes.push(
      'The two sizes have different proportions, so the new print crops part of the image.'
    );
  }

  const linkValues = reading.height
    ? {
        isEnlargerHeightMode: true,
        originalHeight: linkInches(reading.from.w),
        newHeight: linkInches(reading.to.w),
      }
    : {
        isEnlargerHeightMode: false,
        originalWidth: linkInches(reading.from.w),
        originalLength: linkInches(reading.from.l),
        newWidth: linkInches(reading.to.w),
        newLength: linkInches(reading.to.l),
      };

  return {
    kind: 'resize',
    title: reading.height
      ? `Enlarger height ${reading.from.label} → ${reading.to.label}`
      : `${reading.from.label} → ${reading.to.label}`,
    badge: 'Resize',
    readAs: [],
    figure:
      seconds === null
        ? {
            value: `×${trimNumber(ratio, 2)}`,
            unit: null,
            caption: 'exposure factor',
          }
        : {
            value: newTime,
            unit: 's',
            caption: `new exposure, from ${trimNumber(seconds, 1)}s${newSeconds >= 60 ? ` (${formatExposureTime(newSeconds)})` : ''}`,
          },
    facts: [
      fact('Change', `${signed(Number(stopsDifference))} stops`),
      fact('Factor', `×${trimNumber(ratio, 2)}`),
      fact(
        'Shape',
        reading.height ? 'Height mode' : sameProportions ? 'Same' : 'Different'
      ),
      fact('Based on', reading.height ? 'Enlarger height²' : 'Print area'),
    ],
    notes,
    footnote: 'Make a test strip at the new size to confirm.',
    link: {
      label: 'Open in Resize Calculator',
      target: {
        to: '/resize',
        search: resizeCalculatorLink.build({
          ...linkValues,
          originalTime: seconds ?? undefined,
        }),
      },
    },
  };
}

/* ------------------------------------------------------------------ *
   Mat window
 * ------------------------------------------------------------------ */

type MatAnswer = Extract<HomeAnswer, { kind: 'mat' }>;

const MAT_WORDS = /\b(?:mat|mats|matte|matted|window)\b/;

/** A mat question: outer board and artwork sizes, plus reveal and weighting. */
export function matAnswer(text: string): MatAnswer | null {
  if (!MAT_WORDS.test(text)) return null;
  const dims = findDims(text);
  if (dims.length < 2) return null;
  const [outer, art] = dims
    .slice(0, 2)
    .toSorted((x, y) => areaSqIn(y) - areaSqIn(x));
  const ow = outer.a * outer.toInches;
  const oh = outer.b * outer.toInches;
  const aw = art.a * art.toInches;
  const ah = art.b * art.toInches;

  const revealMatch = new RegExp(
    String.raw`\breveal\s*(${NUMBER_SOURCE})\s*(${UNIT_SOURCE})?`
  ).exec(text);
  const revealUnit = readUnit(revealMatch?.[2]) ?? 'in';
  const reveal = revealMatch
    ? parseMatInput(revealMatch[1].trim()) * inchesPer(revealUnit)
    : parseMatInput(MAT_CALCULATOR_DEFAULTS.reveal);
  const bottomWeight = /\bbottom[\s-]*weight/.test(text);

  const borders = bestFitBorders(
    ow,
    oh,
    aw,
    ah,
    reveal,
    bottomWeight,
    matSnapStep('imperial')
  );
  const winW = aw - 2 * reveal;
  const winH = ah - 2 * reveal;
  const outerLabel = formatDims(outer.a, outer.b, outer.unit);
  const artLabel = formatDims(art.a, art.b, art.unit);

  const side = (label: string, inches: number) =>
    fact(
      label,
      formatLengthWithUnit(inches, 'in'),
      formatLengthWithUnit(inches, 'cm')
    );

  return {
    kind: 'mat',
    title: `${outerLabel} mat, ${artLabel} print`,
    badge: 'Mat',
    readAs: [
      { text: `${outerLabel} mat`, assumed: false },
      { text: `${artLabel} print`, assumed: false },
      {
        text: `${formatLengthWithUnit(reveal, 'in')} reveal${revealMatch ? '' : ' (default)'}`,
        assumed: !revealMatch,
      },
      ...(bottomWeight ? [{ text: 'bottom weighted', assumed: false }] : []),
    ],
    figure: borders
      ? {
          value: `${formatInches(winW)}×${formatInches(winH)}`,
          unit: 'in',
          caption: `window opening, ${formatLength(winW, 'cm')}×${formatLength(winH, 'cm')} cm`,
        }
      : null,
    facts: borders
      ? [
          side('Top', borders.top),
          side('Bottom', borders.bottom),
          side('Left', borders.left),
          side('Right', borders.right),
        ]
      : [],
    notes: borders
      ? []
      : [
          'The print plus its reveal does not fit inside that mat. Try a bigger mat or a smaller print.',
        ],
    footnote: borders
      ? 'Best-fit borders. Cutter guide settings are in the full calculator.'
      : null,
    link: {
      label: 'Open in Mat Cut Calculator',
      target: {
        to: '/mat',
        search: matCalculatorLink.build({
          outerW: trimNumber(ow, 4),
          outerH: trimNumber(oh, 4),
          artW: trimNumber(aw, 4),
          artH: trimNumber(ah, 4),
          reveal: revealMatch
            ? matBorderToInput(reveal)
            : MAT_CALCULATOR_DEFAULTS.reveal,
          bottomWeight,
          borderTop: borders ? matBorderToInput(borders.top) : undefined,
          borderBottom: borders ? matBorderToInput(borders.bottom) : undefined,
          borderLeft: borders ? matBorderToInput(borders.left) : undefined,
          borderRight: borders ? matBorderToInput(borders.right) : undefined,
        }),
      },
    },
  };
}

/* ------------------------------------------------------------------ *
   Stops
 * ------------------------------------------------------------------ */

type StopsAnswer = Extract<HomeAnswer, { kind: 'stops' }>;

const STOP_PATTERNS: readonly RegExp[] = [
  // "+1/3 stop", "plus 2 stops", "down 1 stop", "1/2 stop"
  new RegExp(
    String.raw`(?:^|[^\w+.\/])(plus|minus|up|down|add|\+|-)?\s*(${NUMBER_SOURCE})\s*stops?\b`
  ),
  // "+1/3", "-0.5"
  new RegExp(String.raw`(?:^|[^\w+.\/])(\+|-)\s*(${NUMBER_SOURCE})(?![\w.\/])`),
];

/** A stop change written in a query, signed. */
export function findStops(text: string): number | null {
  for (const pattern of STOP_PATTERNS) {
    const match = pattern.exec(text);
    if (!match) continue;
    const value = parseMatInput(match[2].trim());
    if (!Number.isFinite(value)) continue;
    const negative =
      match[1] === '-' || match[1] === 'minus' || match[1] === 'down';
    return negative ? -value : value;
  }
  return null;
}

export function stopsAnswer(seconds: number, stops: number): StopsAnswer {
  const newTime = calculateNewExposureTime(seconds, stops);
  const stopText = `${signed(stops)} ${Math.abs(stops) === 1 ? 'stop' : 'stops'}`;
  return {
    kind: 'stops',
    title: `${formatExposureTime(seconds)} ${stopText}`,
    badge: 'Stops',
    readAs: [],
    figure: {
      value: formatExposureTime(newTime),
      unit: null,
      caption: 'new time',
    },
    facts: [
      fact('Base time', formatExposureTime(seconds)),
      fact('Change', stopText),
      fact('Added time', `${signed(newTime - seconds, 1)}s`),
    ],
    notes: [],
    footnote: 'Each stop doubles or halves the time.',
    link: {
      label: 'Open in Stops Calculator',
      target: {
        to: '/stops',
        search: exposureCalculatorLink.build({
          originalTime: seconds,
          stops: Number(stops.toFixed(4)),
        }),
      },
    },
  };
}
