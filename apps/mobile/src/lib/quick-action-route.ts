import type { Action } from 'expo-quick-actions';
import { z } from 'zod';
import { resolveLegacyPath } from '@/lib/deep-link';

export type NavigateWithAnchor = (
  path: string,
  options: { withAnchor: true }
) => void;

/**
 * The `useQuickActionRouting` callback for the home-screen quick actions. Their
 * hrefs are baked into the native build (`app.json`) and still read
 * `/more/meter`. The hook calls `router.navigate(href)` itself, which skips
 * `redirectSystemPath`, so the href is resolved here and the hook told (by
 * returning true) not to navigate. Same navigation call the hook makes
 * (`navigate` with an anchor, deferred a tick), so the hub sits under the tool.
 * An action without a string href is left to the hook (false).
 */
export function createQuickActionRouter(navigate: NavigateWithAnchor) {
  return function routeQuickAction(action: Action): boolean {
    const href = z.string().safeParse(action.params?.href);
    if (!href.success) return false;
    setTimeout(() => {
      navigate(resolveLegacyPath(href.data), { withAnchor: true });
    });
    return true;
  };
}
