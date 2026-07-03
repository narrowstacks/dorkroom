import { resolveToolPath } from '@/lib/deep-link';
import { getPinnedIds } from '@/lib/tab-bar-settings';

// Rewrites incoming external URLs (e.g. `dorkroom://exposure`) so they land
// on a route that's actually reachable: single-screen tool tab routes are
// only navigable while pinned into the native tab bar, so unpinned tools get
// redirected to their always-available More-stack detail route. See
// `src/lib/deep-link.ts` for the pure resolver.
export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}): string {
  try {
    return resolveToolPath(path, getPinnedIds());
  } catch {
    // Never break inbound links on a resolver bug.
    return path;
  }
}
