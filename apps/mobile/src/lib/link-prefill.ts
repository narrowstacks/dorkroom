// Calculator links open a screen pre-filled: the link's params ride on the
// route as search params, the screen reads them with the calculator's
// `xCalculatorLink.read`, and the shared hook applies them as `overrides`
// (the way the web page does). This is the pure half of that.
import type { CalculatorLinkSearch } from '@dorkroom/logic';

type RouteParams = Record<string, string | string[] | undefined>;

/** expo-router's params (a repeated key is an array) as the flat strings `link.read` takes. */
export function linkSearchFromParams(
  params: RouteParams
): CalculatorLinkSearch {
  const search: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (first !== undefined) search[key] = first;
  }
  return search;
}

/** Param every Home-opened link carries, so opening the same answer twice still re-applies it. */
export const LINK_OPENED_PARAM = 'at';

/**
 * Identity of the prefill a screen was opened with, from the overrides as
 * JSON. A screen re-mounts when it changes, since the shared hooks apply
 * overrides on mount only: a tab that is already open would otherwise ignore
 * a new link. `'none'` when the link set nothing.
 */
export function prefillKey(overridesJson: string, params: RouteParams): string {
  if (overridesJson === '{}') return 'none';
  const opened = params[LINK_OPENED_PARAM];
  return `${Array.isArray(opened) ? opened[0] : (opened ?? '')}:${overridesJson}`;
}
