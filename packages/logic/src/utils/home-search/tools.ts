import type { HomeAnswerKind, HomeToolRoute } from './types';

/**
 * The words that find each tool. The first is the word a suggestion fills
 * in. Names and descriptions belong to the host, which already lists them.
 */
const TOOL_WORDS = {
  '/border': ['border', 'borders', 'easel', 'blade', 'blades', 'trim'],
  '/stops': ['stops', 'stop', 'fstop', 'test', 'strip'],
  '/resize': ['resize', 'scale', 'enlarge', 'enlargement', 'magnification'],
  '/mat': ['mat', 'matte', 'window', 'frame', 'cut', 'board'],
  '/reciprocity': ['reciprocity', 'night', 'schwarzschild'],
  '/development': [
    'development',
    'recipe',
    'recipes',
    'develop',
    'developer',
    'developing',
  ],
  '/lenses': ['lens', 'lenses', 'equivalent', 'equivalency', 'crop', 'focal'],
  '/exposure': ['exposure', 'camera', 'aperture', 'shutter', 'ev', 'meter'],
  '/films': ['films', 'film', 'stock', 'stocks', 'database', 'brand'],
  '/negative-inverter': [
    'invert',
    'inverter',
    'inversion',
    'negative',
    'negatives',
    'positive',
    'scan',
    'scanning',
    'digitize',
    'convert',
  ],
} as const satisfies Record<HomeToolRoute, readonly string[]>;

// SAFETY: TOOL_WORDS is a Record over exactly HomeToolRoute; Object.keys
// widens its keys to string.
const TOOL_ROUTES = Object.keys(TOOL_WORDS) as HomeToolRoute[];

/** The tools whose words the query tokens name (prefixes of 3+ letters count). */
export function toolsForTokens(tokens: readonly string[]): HomeToolRoute[] {
  return TOOL_ROUTES.filter((route) =>
    tokens.some((token) =>
      TOOL_WORDS[route].some(
        (word) =>
          word === token || (token.length >= 3 && word.startsWith(token))
      )
    )
  );
}

/** Tools worth showing beside an answer. */
export const RELATED_TOOLS = {
  recipe: ['/development'],
  no_recipe: ['/development'],
  reciprocity: ['/reciprocity'],
  border: ['/border', '/mat'],
  resize: ['/resize', '/stops'],
  lens: ['/lenses'],
  stops: ['/stops'],
  mat: ['/mat', '/border'],
  camera_exposure: ['/exposure'],
} as const satisfies Record<HomeAnswerKind, readonly HomeToolRoute[]>;

/** Tool completions for a word being typed: each matching tool and its fill word. */
export function toolCompletions(
  prefix: string
): { route: HomeToolRoute; word: string }[] {
  if (prefix.length < 2) return [];
  return TOOL_ROUTES.filter((route) =>
    TOOL_WORDS[route].some((w) => w.startsWith(prefix))
  ).map((route) => ({ route, word: TOOL_WORDS[route][0] }));
}
