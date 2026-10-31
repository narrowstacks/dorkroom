import type { Combination, Developer, Film } from '@dorkroom/api';
import type {
  BORDER_CALCULATOR_LINK_PARAMS,
  CAMERA_EXPOSURE_LINK_PARAMS,
  EXPOSURE_CALCULATOR_LINK_PARAMS,
  LENS_CALCULATOR_LINK_PARAMS,
  MAT_CALCULATOR_LINK_PARAMS,
  RECIPROCITY_CALCULATOR_LINK_PARAMS,
  RESIZE_CALCULATOR_LINK_PARAMS,
} from '../../constants/calculator-link-params';
import type { RecipeUrlParams } from '../../types/development-recipes-url';
import type { CalculatorLinkSearch } from '../calculator-url-params';
import type { TemperatureUnit } from '../temperature';

/**
 * The catalog the home search reads. Every list is optional: while the data
 * is loading the search still answers calculator queries, and reports
 * `pending` for anything that needs the catalog.
 */
export interface HomeSearchData {
  films?: readonly Film[];
  developers?: readonly Developer[];
  combinations?: readonly Combination[];
}

/** How the viewer wants answers shown. */
export interface HomeSearchOptions {
  /** Recipe temperatures lead with this unit. Defaults to Celsius. */
  temperatureUnit?: TemperatureUnit;
}

type LinkSearch<M> = CalculatorLinkSearch<keyof M & string>;

/** The `/development` page's search params a home answer links with. */
export type DevelopmentLinkSearch = Pick<
  RecipeUrlParams,
  'film' | 'developer' | 'iso' | 'dilution' | 'recipe'
>;

/**
 * Where an answer or result opens: a route plus the search params it reads.
 * Calculator params come from each calculator's `link.build`, so the page
 * opens pre-filled with the values the answer shows.
 */
export type HomeLinkTarget =
  | { to: '/border'; search: LinkSearch<typeof BORDER_CALCULATOR_LINK_PARAMS> }
  | { to: '/stops'; search: LinkSearch<typeof EXPOSURE_CALCULATOR_LINK_PARAMS> }
  | { to: '/resize'; search: LinkSearch<typeof RESIZE_CALCULATOR_LINK_PARAMS> }
  | { to: '/lenses'; search: LinkSearch<typeof LENS_CALCULATOR_LINK_PARAMS> }
  | { to: '/mat'; search: LinkSearch<typeof MAT_CALCULATOR_LINK_PARAMS> }
  | {
      to: '/reciprocity';
      search: LinkSearch<typeof RECIPROCITY_CALCULATOR_LINK_PARAMS>;
    }
  | { to: '/exposure'; search: LinkSearch<typeof CAMERA_EXPOSURE_LINK_PARAMS> }
  | { to: '/development'; search: DevelopmentLinkSearch }
  | { to: '/films'; search: { film?: string } };

/** Every route the home search can point at. */
export type HomeToolRoute = HomeLinkTarget['to'];

type TargetFor<T extends HomeToolRoute> = Extract<HomeLinkTarget, { to: T }>;

/** One part of how the query was read; `assumed` marks a default. */
export interface HomeReading {
  text: string;
  assumed: boolean;
}

/** The answer's headline number. */
export interface HomeAnswerFigure {
  value: string;
  /** Short unit set next to the number ("min", "mm", "in"). */
  unit: string | null;
  caption: string;
}

export interface HomeAnswerFact {
  label: string;
  value: string;
  /** Secondary text after the value (another unit, a push label). */
  detail: string | null;
  /** True when the source has no value ("Not in source"). */
  missing: boolean;
  /** An external page the value links to (a recipe's source). */
  href?: string;
}

interface AnswerOf<K extends string, T extends HomeToolRoute> {
  kind: K;
  title: string;
  /** Short tag: the calculator, or a recipe's source ("Official Ilford"). */
  badge: string;
  /** How the query was read, defaults marked. Empty when nothing to show. */
  readAs: HomeReading[];
  /**
   * Shown above the figure: the answer is not for what was asked (no recipe
   * at the EI typed, so the figure is another EI's time).
   */
  notice?: string;
  figure: HomeAnswerFigure | null;
  facts: HomeAnswerFact[];
  notes: string[];
  /** Small print beside the link. */
  footnote: string | null;
  link: { label: string; target: TargetFor<T> };
}

/**
 * Paper and print on the easel, in inches, as drawn (oriented). The print
 * sits at (`printX`, `printY`) from the paper's top left.
 */
export interface BorderDiagram {
  paperW: number;
  paperH: number;
  printX: number;
  printY: number;
  printW: number;
  printH: number;
}

export type HomeAnswer =
  | AnswerOf<'recipe', '/development'>
  | AnswerOf<'no_recipe', '/development'>
  | AnswerOf<'reciprocity', '/reciprocity'>
  | (AnswerOf<'border', '/border'> & { diagram: BorderDiagram | null })
  | AnswerOf<'resize', '/resize'>
  | AnswerOf<'lens', '/lenses'>
  | AnswerOf<'stops', '/stops'>
  | AnswerOf<'mat', '/mat'>
  | AnswerOf<'camera_exposure', '/exposure'>;

export type HomeAnswerKind = HomeAnswer['kind'];

export interface HomeResultItem {
  title: string;
  detail: string;
  meta: string;
  target: HomeLinkTarget;
}

export type HomeResultGroup =
  | {
      key: 'recipes' | 'films' | 'developers';
      label: string;
      /** Every match, of which `items` is the first few. */
      total: number;
      items: HomeResultItem[];
    }
  | {
      key: 'tools';
      label: string;
      total: number;
      /** Tools by route; the host names and describes them. */
      tools: HomeToolRoute[];
    };

export interface HomeSearchResult {
  answer: HomeAnswer | null;
  groups: HomeResultGroup[];
  /** The query names something the catalog would answer, but it has not loaded. */
  pending: boolean;
  /** How many results the groups hold in all (every match, not just those shown). */
  count: number;
}

/** What a suggestion is: a kind of answer it leads to, or a name it completes. */
export type HomeSuggestionHint =
  Exclude<HomeAnswerKind, 'no_recipe'> | 'film' | 'developer' | 'tool';

export interface HomeSuggestion {
  /** What the list shows. */
  label: string;
  /** What selecting it puts in the box (and searches). */
  query: string;
  hint: HomeSuggestionHint;
}
