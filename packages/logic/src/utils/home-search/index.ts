/**
 * Home search: one box that answers darkroom questions. `searchHome` reads a
 * query into a calculator answer or a recipe plus grouped matches;
 * `suggestHome` offers completions and query templates while typing. Both
 * are pure and platform-free, shared by the web home page and the iOS app.
 */
export { searchHome } from './search';
export { suggestHome } from './suggest';
export type {
  BorderDiagram,
  HomeAnswer,
  HomeAnswerKind,
  HomeLinkTarget,
  HomeResultGroup,
  HomeSearchData,
  HomeSearchOptions,
  HomeSearchResult,
  HomeSuggestion,
  HomeSuggestionHint,
} from './types';
