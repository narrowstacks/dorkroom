/*
 * Link previews for shared calculator links (`/lenses?focal=80&from=…`).
 *
 * `api/meta.ts` uses this for the crawler's title, description and `og:image`
 * URL, and `api/og.tsx` for the card it draws. Everything comes from the
 * published `@dorkroom/logic/calculators` entry (pure modules, no React)
 * rather than copies, so a link's accepted params, its validation, and every
 * number on the card are the calculator's own:
 *
 * - param names: `constants/calculator-link-params.ts` (no runtime imports)
 * - parsing and validation: each calculator's `*Link.read`, which applies the
 *   calculator's persistence validators, so an invalid value is dropped
 *   exactly as the calculator drops it
 * - math and display formatting: the calculator's own functions
 *
 * A param a link leaves out takes the calculator's default, which is what a
 * first-time visitor sees when opening the link. The package root is never
 * imported here (it carries React hooks), and
 * `utils/__tests__/calculatorShare.test.ts` pins the output.
 */

import {
  ASPECT_RATIO_MAP,
  BORDER_CALCULATOR_LINK_PARAMS,
  borderCalculatorLink,
  borderStateFromLink,
  calculateExposureAdjustment,
  calculateExposureValue,
  calculateLensEquivalency,
  calculateMatLayout,
  calculateReciprocityForForm,
  calculateResizeExposure,
  type CalculatorLinkParamMap,
  type CalculatorLinkSearch,
  CAMERA_EXPOSURE_DEFAULTS,
  CAMERA_EXPOSURE_LINK_PARAMS,
  cameraExposureLink,
  computeBorderLayout,
  EXPOSURE_CALCULATOR_LINK_PARAMS,
  EXPOSURE_FORM_DEFAULTS,
  exposureCalculatorLink,
  formatAperture,
  formatDimensionPair,
  formatExposureTime,
  formatFocalLength,
  formatReciprocityTime,
  formatShutterSpeed,
  LENS_CALCULATOR_LINK_PARAMS,
  LENS_DEFAULTS,
  lensCalculatorLink,
  MAT_CALCULATOR_DEFAULTS,
  MAT_CALCULATOR_LINK_PARAMS,
  matCalculatorLink,
  PAPER_SIZE_MAP,
  RECIPROCITY_CALCULATOR_LINK_PARAMS,
  RECIPROCITY_FORM_DEFAULTS,
  reciprocityCalculatorLink,
  RESIZE_CALCULATOR_LINK_PARAMS,
  RESIZE_FORM_DEFAULTS,
  resizeCalculatorLink,
  toFraction,
} from '@dorkroom/logic/calculators';
import {
  BASE_URL,
  ROUTE_TITLES,
  type RouteMetadata,
  SITE_NAME,
} from './routeMetadata';

/** Each calculator route's link params, from @dorkroom/logic. */
const CALCULATOR_LINK_PARAMS = {
  '/border': BORDER_CALCULATOR_LINK_PARAMS,
  '/stops': EXPOSURE_CALCULATOR_LINK_PARAMS,
  '/resize': RESIZE_CALCULATOR_LINK_PARAMS,
  '/lenses': LENS_CALCULATOR_LINK_PARAMS,
  '/reciprocity': RECIPROCITY_CALCULATOR_LINK_PARAMS,
  '/mat': MAT_CALCULATOR_LINK_PARAMS,
  '/exposure': CAMERA_EXPOSURE_LINK_PARAMS,
} as const satisfies Partial<
  Record<keyof typeof ROUTE_TITLES, CalculatorLinkParamMap>
>;

/** A route whose calculator opens pre-filled from link params. */
export type CalculatorRoute = keyof typeof CALCULATOR_LINK_PARAMS;

/** Own-key check: `in` would also accept `constructor` and friends. */
export function isCalculatorRoute(route: string): route is CalculatorRoute {
  return Object.prototype.hasOwnProperty.call(CALCULATOR_LINK_PARAMS, route);
}

/**
 * The link params `route` accepts, or none for a route without a calculator
 * link. `route` must already be normalized (no trailing slash).
 */
export function calculatorLinkParamNames(route: string): readonly string[] {
  return isCalculatorRoute(route)
    ? Object.keys(CALCULATOR_LINK_PARAMS[route])
    : [];
}

/** The paper with its print area, in inches. */
export interface BorderDrawing {
  kind: 'border';
  paperW: number;
  paperH: number;
  printLeft: number;
  printTop: number;
  printW: number;
  printH: number;
  printLabel: string;
  caption: string;
}

/** One format's frame in millimetres, labelled with its focal length. */
export interface LensFrame {
  w: number;
  h: number;
  label: string;
}

/** The source and target frames, overlaid on their centres. */
export interface LensDrawing {
  kind: 'lens';
  source: LensFrame;
  target: LensFrame;
}

/** One print (or projection) to scale, with its exposure time. */
export interface ResizePrint {
  w: number;
  h: number;
  label: string;
  time: string;
}

/** The original and new prints side by side, on one scale. */
export interface ResizeDrawing {
  kind: 'resize';
  from: ResizePrint;
  to: ResizePrint;
}

/** A rectangle on the mat board, in inches from the board's top left. */
export interface MatRect {
  left: number;
  top: number;
  w: number;
  h: number;
}

/** The board, its window opening and, when given, the artwork behind it. */
export interface MatDrawing {
  kind: 'mat';
  boardW: number;
  boardH: number;
  window: MatRect;
  art: MatRect | null;
  windowLabel: string;
  caption: string;
}

export type CalculatorDrawing =
  BorderDrawing | LensDrawing | ResizeDrawing | MatDrawing;

/** Link params that took effect: param name to its value as the link builds it. */
export type ShareSearch = Readonly<Record<string, string>>;

/** Everything a shared calculator link's preview shows. */
export interface CalculatorShare {
  route: CalculatorRoute;
  /**
   * The link params that took effect, rebuilt by the calculator's link from
   * the values it accepted. Invalid or unknown params are gone, so this is
   * the canonical query string for both the page and its card.
   */
  search: ShareSearch;
  /** Page title (without the site name) and the card's headline. */
  title: string;
  description: string;
  /** Line under the card's headline. */
  subtitle?: string;
  /** The card's pills. */
  details: string[];
  /** Picture for the card, or null for a text card. */
  drawing: CalculatorDrawing | null;
}

/** Fields of a share that every builder fills in. */
type ShareContent = Omit<CalculatorShare, 'route' | 'search'>;

/** A builder's result: the link's rebuilt params and the share's content. */
type ShareBuild = [Readonly<Partial<Record<string, string>>>, ShareContent];

/** A whole number or up to `digits` decimals, trailing zeros dropped. */
function trimmed(value: number, digits: number): string {
  return String(Number(value.toFixed(digits)));
}

/** Inches as the border calculator prints them (`formatDimensionPair`, 3 decimals max). */
function inches(value: number): string {
  return `${trimmed(value, 3)}in`;
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${Math.abs(count) === 1 ? '' : 's'}`;
}

/**
 * Drop the `undefined` entries a link's `build` leaves for absent fields, so
 * the canonical search holds only params that took effect.
 */
function definedEntries(
  search: Readonly<Partial<Record<string, string>>>
): ShareSearch {
  return Object.fromEntries(
    Object.entries(search).flatMap(([key, value]) =>
      value === undefined ? [] : [[key, value] as const]
    )
  );
}

/**
 * Short ratio label: the parenthesised ratio of a long label
 * ("35mm standard frame, 6x9 (3:2)" -> "3:2"), short labels as they are.
 */
function ratioLabel(
  aspectRatio: string,
  customWidth: number,
  customHeight: number
): string {
  if (aspectRatio === 'custom') {
    return `${trimmed(customWidth, 2)}:${trimmed(customHeight, 2)}`;
  }
  if (aspectRatio === 'even-borders') return 'Even borders';
  const label = ASPECT_RATIO_MAP.get(aspectRatio)?.label ?? aspectRatio;
  return label.match(/\(([^)]+)\)$/)?.[1] ?? label;
}

function paperLabel(
  paperSize: string,
  customWidth: number,
  customHeight: number
): string {
  if (paperSize === 'custom') {
    return formatDimensionPair(customWidth, customHeight, 'imperial', {
      maxPrecision: 3,
    });
  }
  return PAPER_SIZE_MAP.get(paperSize)?.label ?? paperSize;
}

function borderShare(search: CalculatorLinkSearch): ShareBuild | null {
  const link = borderCalculatorLink.read(search);
  if (Object.keys(link).length === 0) return null;

  const state = borderStateFromLink(link);
  const { calculation } = computeBorderLayout(state, {
    viewport: { width: 0, height: 0 },
  });
  const { printWidth, printHeight, paperWidth, paperHeight } = calculation;
  if (!(printWidth > 0 && printHeight > 0 && paperWidth > 0)) return null;

  const ratio = ratioLabel(
    state.aspectRatio,
    state.lastValidCustomAspectWidth,
    state.lastValidCustomAspectHeight
  );
  const paper = paperLabel(
    state.paperSize,
    state.lastValidCustomPaperWidth,
    state.lastValidCustomPaperHeight
  );
  const print = formatDimensionPair(printWidth, printHeight, 'imperial', {
    maxPrecision: 3,
  });
  const left = inches(calculation.leftBorder);
  const right = inches(calculation.rightBorder);
  const top = inches(calculation.topBorder);
  const bottom = inches(calculation.bottomBorder);

  return [
    borderCalculatorLink.build(link),
    {
      title: `${ratio} on ${paper} paper: ${print} print`,
      description: `A ${print} ${ratio} print on ${paper} paper, with borders of ${left} left, ${right} right, ${top} top and ${bottom} bottom. Blade readings and easel setup in the border calculator.`,
      details: [
        `${left} left · ${right} right`,
        `${top} top · ${bottom} bottom`,
      ],
      drawing: {
        kind: 'border',
        paperW: paperWidth,
        paperH: paperHeight,
        printLeft: calculation.leftBorder,
        printTop: calculation.topBorder,
        printW: printWidth,
        printH: printHeight,
        printLabel: print,
        caption: `${paper} paper`,
      },
    },
  ];
}

function lensShare(search: CalculatorLinkSearch): ShareBuild | null {
  const link = lensCalculatorLink.read(search);
  if (Object.keys(link).length === 0) return null;

  const result = calculateLensEquivalency({ ...LENS_DEFAULTS, ...link });
  if (!result) return null;

  const { sourceFormat, targetFormat } = result;
  const focal = formatFocalLength(result.focalLength);
  const equivalent = formatFocalLength(result.equivalentFocalLength);
  const fieldOfView = `${result.fieldOfView.toFixed(1)}°`;

  return [
    lensCalculatorLink.build(link),
    {
      title: `${focal} on ${sourceFormat.shortName} ≈ ${equivalent} on ${targetFormat.shortName}`,
      description: `${focal} on ${sourceFormat.name} gives the same field of view as ${equivalent} on ${targetFormat.name}: ${fieldOfView} diagonal.`,
      details: [
        `${fieldOfView} field of view`,
        `Crop ${sourceFormat.cropFactor.toFixed(2)}× to ${targetFormat.cropFactor.toFixed(2)}×`,
      ],
      drawing: {
        kind: 'lens',
        source: {
          w: sourceFormat.width,
          h: sourceFormat.height,
          label: `${sourceFormat.shortName} · ${focal}`,
        },
        target: {
          w: targetFormat.width,
          h: targetFormat.height,
          label: `${targetFormat.shortName} · ${equivalent}`,
        },
      },
    },
  ];
}

function resizeShare(search: CalculatorLinkSearch): ShareBuild | null {
  const link = resizeCalculatorLink.read(search);
  if (Object.keys(link).length === 0) return null;

  const values = { ...RESIZE_FORM_DEFAULTS, ...link };
  const { newTime, stopsDifference } = calculateResizeExposure(values);
  if (!newTime) return null;

  const fromTime = `${trimmed(values.originalTime, 2)}s`;
  const toTime = `${newTime}s`;
  const stops = `${stopsDifference} stops`;
  const build = resizeCalculatorLink.build(link);

  if (values.isEnlargerHeightMode) {
    const from = inches(values.originalHeight);
    const to = inches(values.newHeight);
    return [
      build,
      {
        title: `${fromTime} at ${from} ≈ ${toTime} at ${to}`,
        description: `Raising the enlarger head from ${from} to ${to}: expose ${newTime} seconds instead of ${trimmed(values.originalTime, 2)} (${stops}).`,
        details: [stops, 'Enlarger height'],
        drawing: {
          kind: 'resize',
          from: {
            w: values.originalHeight,
            h: values.originalHeight,
            label: `${from} height`,
            time: fromTime,
          },
          to: {
            w: values.newHeight,
            h: values.newHeight,
            label: `${to} height`,
            time: toTime,
          },
        },
      },
    ];
  }

  const from = `${trimmed(values.originalWidth, 3)}×${trimmed(values.originalLength, 3)}in`;
  const to = `${trimmed(values.newWidth, 3)}×${trimmed(values.newLength, 3)}in`;
  return [
    build,
    {
      title: `${fromTime} at ${from} ≈ ${toTime} at ${to}`,
      description: `Resizing a print from ${from} to ${to}: expose ${newTime} seconds instead of ${trimmed(values.originalTime, 2)} (${stops}).`,
      details: [stops],
      drawing: {
        kind: 'resize',
        from: {
          w: values.originalWidth,
          h: values.originalLength,
          label: from,
          time: fromTime,
        },
        to: {
          w: values.newWidth,
          h: values.newLength,
          label: to,
          time: toTime,
        },
      },
    },
  ];
}

function matShare(search: CalculatorLinkSearch): ShareBuild | null {
  const link = matCalculatorLink.read(search);
  if (Object.keys(link).length === 0) return null;

  const layout = calculateMatLayout({ ...MAT_CALCULATOR_DEFAULTS, ...link });
  if (!layout.valid) return null;

  // toFraction is the calculator's imperial display (nearest 1/16"). The
  // no-break space keeps a mixed number ("10 1/2") on one line of the card.
  const fmt = (value: number) => toFraction(value).replace(' ', ' ');
  const board = `${fmt(layout.ow)} × ${fmt(layout.oh)}`;
  const opening = `${fmt(layout.windowW)} × ${fmt(layout.windowH)}`;
  const borders = `${fmt(layout.bt)} top, ${fmt(layout.bb)} bottom, ${fmt(layout.bl)} left, ${fmt(layout.br)} right`;
  const artwork = layout.artValid
    ? ` For ${fmt(layout.aw)} × ${fmt(layout.ah)} artwork.`
    : '';

  return [
    matCalculatorLink.build(link),
    {
      title: `${board} mat with a ${opening} window`,
      description: `A ${board} mat with a ${opening} window: borders of ${borders}.${artwork} Guide-bar settings in the mat cut calculator.`,
      details: [
        `${fmt(layout.bt)} top · ${fmt(layout.bb)} bottom`,
        `${fmt(layout.bl)} left · ${fmt(layout.br)} right`,
      ],
      drawing: {
        kind: 'mat',
        boardW: layout.ow,
        boardH: layout.oh,
        window: {
          left: layout.bl,
          top: layout.bt,
          w: layout.windowW,
          h: layout.windowH,
        },
        // The art is centred on the window, overlapping it by the reveal.
        art: layout.artValid
          ? {
              left: layout.bl - layout.overlapLeft,
              top: layout.bt - layout.overlapTop,
              w: layout.aw,
              h: layout.ah,
            }
          : null,
        windowLabel: opening,
        caption: `${board} board`,
      },
    },
  ];
}

function stopsShare(search: CalculatorLinkSearch): ShareBuild | null {
  const link = exposureCalculatorLink.read(search);
  if (Object.keys(link).length === 0) return null;

  const values = { ...EXPOSURE_FORM_DEFAULTS, ...link };
  const result = calculateExposureAdjustment(values.originalTime, values.stops);
  if (!result) return null;

  const stops = Number(result.stopsValue.toFixed(2));
  const stopsLabel = `${stops > 0 ? '+' : ''}${plural(stops, 'stop')}`;
  const from = formatExposureTime(result.originalTimeValue);
  const to = formatExposureTime(result.newTimeValue);
  const change = `${result.addedTime >= 0 ? 'Add' : 'Remove'} ${formatExposureTime(Math.abs(result.addedTime))}`;
  const percent = `${Math.abs(result.percentageIncrease).toFixed(1)}% change`;

  return [
    exposureCalculatorLink.build(link),
    {
      title: `${from} ${stopsLabel} = ${to}`,
      description: `${from} adjusted by ${stopsLabel} is ${to}: ${change.toLowerCase()} (${percent}).`,
      details: [change, percent],
      drawing: null,
    },
  ];
}

function reciprocityShare(search: CalculatorLinkSearch): ShareBuild | null {
  const link = reciprocityCalculatorLink.read(search);
  if (Object.keys(link).length === 0) return null;

  const result = calculateReciprocityForForm({
    ...RECIPROCITY_FORM_DEFAULTS,
    ...link,
  });
  if (!result) return null;

  const factor = result.factor.toFixed(2);
  const film =
    result.filmName === 'Custom'
      ? `a custom ${factor} factor`
      : result.filmName;
  const metered = formatReciprocityTime(result.originalTime);
  const adjusted = formatReciprocityTime(result.adjustedTime);

  return [
    reciprocityCalculatorLink.build(link),
    {
      title: `${metered} metered ≈ ${adjusted} exposure`,
      description: `Reciprocity failure correction for ${film}: a ${metered} metered exposure needs ${adjusted}.`,
      subtitle: `on ${film}`,
      details: [
        `Factor ${factor}`,
        `+${Math.round(result.percentageIncrease)}% time`,
      ],
      drawing: null,
    },
  ];
}

function cameraExposureShare(search: CalculatorLinkSearch): ShareBuild | null {
  const link = cameraExposureLink.read(search);
  if (Object.keys(link).length === 0) return null;

  const values = { ...CAMERA_EXPOSURE_DEFAULTS, ...link };
  const ev = calculateExposureValue(
    values.aperture,
    values.shutterSpeed,
    values.iso
  );
  if (!ev.isValid) return null;

  const aperture = formatAperture(values.aperture);
  const shutter = formatShutterSpeed(values.shutterSpeed);
  const iso = `ISO ${trimmed(values.iso, 2)}`;
  const scene = ev.description ? ` (${ev.description.toLowerCase()})` : '';

  return [
    cameraExposureLink.build(link),
    {
      title: `EV ${ev.ev}: ${aperture} at ${shutter}, ${iso}`,
      description: `${aperture} at ${shutter} on ${iso} is EV ${ev.ev}${scene}. Equivalent exposures in the exposure calculator.`,
      subtitle: ev.description || undefined,
      details: [aperture, shutter, iso],
      drawing: null,
    },
  ];
}

const SHARE_BUILDERS = {
  '/border': borderShare,
  '/stops': stopsShare,
  '/resize': resizeShare,
  '/lenses': lensShare,
  '/reciprocity': reciprocityShare,
  '/mat': matShare,
  '/exposure': cameraExposureShare,
} as const satisfies Record<
  CalculatorRoute,
  (search: CalculatorLinkSearch) => ShareBuild | null
>;

/**
 * Read a calculator link's params into its preview. Unknown params are
 * ignored and invalid values dropped (the calculator's own `read`); when no
 * param takes effect, or the values leave the calculator without a result,
 * this returns null and the route's generic card is used instead.
 *
 * @param route - normalized route path (`/lenses`)
 * @param search - the request's params; extra keys are ignored
 * @example
 * ```typescript
 * readCalculatorShare('/lenses', {
 *   focal: '80',
 *   from: 'film-6x6',
 *   to: 'full-frame',
 * })?.title; // '80mm on 6×6 ≈ 43.7mm on Full Frame'
 * ```
 */
export function readCalculatorShare(
  route: string,
  search: CalculatorLinkSearch
): CalculatorShare | null {
  if (!isCalculatorRoute(route)) return null;
  const built = SHARE_BUILDERS[route](search);
  if (!built) return null;
  const [linkSearch, content] = built;
  return { route, search: definedEntries(linkSearch), ...content };
}

/**
 * Crawler metadata for a shared calculator link: the share's title and
 * description, a canonical URL that keeps the link params that took effect
 * (and nothing else), and the matching `/api/og` card URL.
 */
export function getCalculatorShareMetadata(
  share: CalculatorShare
): RouteMetadata {
  const query = new URLSearchParams(share.search).toString();
  const card = new URLSearchParams({ route: share.route, ...share.search });
  return {
    title: `${share.title} | ${SITE_NAME}`,
    description: share.description,
    url: `${BASE_URL}${share.route}${query ? `?${query}` : ''}`,
    ogImageUrl: `${BASE_URL}/api/og?${card.toString()}`,
  };
}
