import type { CalculatorLinkParamMap } from '../utils/calculator-url-params';

/*
 * Each calculator's link params: URL param name -> the persisted field it
 * sets. These maps are the single source for a calculator's link:
 * `defineCalculatorLink` binds each one to its persistence definition (next
 * to the calculator's schema), which type-checks every field name, and the
 * web app's route search schemas read the param names from here.
 *
 * They live apart from the links, in a module with no runtime imports, so a
 * route can declare its search params without pulling the calculator's
 * schemas and constants into the app's entry chunk.
 *
 * Param names are a public contract: shared links and the home-page search
 * build them, so renaming one breaks every link already out there.
 */

/**
 * Border calculator. Lengths and offsets are inches. The names stay clear of
 * `preset`, which carries a shared preset.
 */
export const BORDER_CALCULATOR_LINK_PARAMS = {
  paper: 'paperSize',
  paperW: 'customPaperWidth',
  paperH: 'customPaperHeight',
  ratio: 'aspectRatio',
  ratioW: 'customAspectWidth',
  ratioH: 'customAspectHeight',
  border: 'minBorder',
  landscape: 'isLandscape',
  flip: 'isRatioFlipped',
  offsets: 'enableOffset',
  offsetH: 'horizontalOffset',
  offsetV: 'verticalOffset',
  ignoreMin: 'ignoreMinBorder',
} as const satisfies CalculatorLinkParamMap;

/** Stops calculator: the original time in seconds and the stops to add. */
export const EXPOSURE_CALCULATOR_LINK_PARAMS = {
  time: 'originalTime',
  stops: 'stops',
} as const satisfies CalculatorLinkParamMap;

/**
 * Resize calculator. Lengths are inches and the time is seconds;
 * `height=true` selects enlarger height mode.
 */
export const RESIZE_CALCULATOR_LINK_PARAMS = {
  height: 'isEnlargerHeightMode',
  fromW: 'originalWidth',
  fromL: 'originalLength',
  toW: 'newWidth',
  toL: 'newLength',
  time: 'originalTime',
  fromH: 'originalHeight',
  toH: 'newHeight',
} as const satisfies CalculatorLinkParamMap;

/**
 * Lens calculator: the focal length in millimetres and the source and target
 * format ids (`SENSOR_FORMATS`).
 */
export const LENS_CALCULATOR_LINK_PARAMS = {
  focal: 'focalLength',
  from: 'sourceFormat',
  to: 'targetFormat',
} as const satisfies CalculatorLinkParamMap;

/**
 * Reciprocity calculator: the film id (`RECIPROCITY_FILM_TYPES`, or
 * `custom`), the metered time ("30s", "1m30s") and the custom factor.
 */
export const RECIPROCITY_CALCULATOR_LINK_PARAMS = {
  film: 'filmType',
  time: 'meteredTime',
  factor: 'customFactor',
} as const satisfies CalculatorLinkParamMap;

/**
 * Mat calculator. Lengths are inches, as decimals or fractions ("3 1/2");
 * `bottomWeight` is a boolean.
 */
export const MAT_CALCULATOR_LINK_PARAMS = {
  outerW: 'outerW',
  outerH: 'outerH',
  top: 'borderTop',
  bottom: 'borderBottom',
  left: 'borderLeft',
  right: 'borderRight',
  artW: 'artW',
  artH: 'artH',
  reveal: 'reveal',
  bottomWeight: 'bottomWeight',
} as const satisfies CalculatorLinkParamMap;

/**
 * Camera exposure calculator: the f-number, the shutter speed in seconds
 * ("1/125" or "0.008"), the ISO, and which of the three to solve for.
 */
export const CAMERA_EXPOSURE_LINK_PARAMS = {
  aperture: 'aperture',
  shutter: 'shutterSpeed',
  iso: 'iso',
  solve: 'solveFor',
} as const satisfies CalculatorLinkParamMap;

/**
 * The marker a link handed over through a Share button carries on top of its
 * own params: `?source=share`. The page that opens it counts the arrival as an
 * opened share, then strips the marker with the link's other params. Links the
 * app builds for its own navigation (the home and nav search answers, built
 * with `link.build`) never carry it, so following one is not an opened share.
 *
 * `/development` recipe links carried the same marker before calculator links
 * existed, so one name covers every shared link. No calculator's param map
 * may use `source` as a param name.
 */
export const SHARED_LINK_MARKER = { param: 'source', value: 'share' } as const;
