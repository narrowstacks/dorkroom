import {
  APP_SCHEME,
  resolveIncomingLink,
  splitSearchLink,
  stampTimerExposureLink,
} from '@/lib/deep-link';
import { noteInitialUrl, pushSearchLink } from '@/lib/home/search-link-store';
import { handOffWarmLink } from '@/lib/link-handoff';

// Rewrites incoming external URLs so they land on a route that exists now.
// expo-router passes the FULL URL here (`dorkroom://meter`), not a path, and
// only strips the scheme afterwards. App Intents open `dorkroom://meter` and
// old links use `/more/<tool>`, from before the Shoot / Develop / Print tabs.
// See `src/lib/deep-link.ts` for the pure resolver. Quick actions skip this hook; `src/lib/quick-action.ts`
// resolves them.
export function redirectSystemPath({
  path,
  initial,
}: {
  path: string;
  initial: boolean;
}): string {
  try {
    // A timer exposure link without `at` is stamped with the arrival time so
    // every opening is ordered (see `stampTimerExposureLink`).
    const resolved = stampTimerExposureLink(
      resolveIncomingLink(path),
      Date.now()
    );
    const asPath = resolved
      .replace(new RegExp(`^${APP_SCHEME}://`, 'i'), '/')
      .replace(/^\/+/, '/');
    // A search link (`dorkroom://search?q=...`) is an event for Home, not route
    // params: the same query twice must refill the box, and a Home that is
    // not the one shown must not decide it. The path carries on as plain Home.
    const search = splitSearchLink(asPath);
    // The first initial call of the session is the launch, whatever its URL;
    // later ones (a container re-render) must not replay a search.
    if (initial) noteInitialUrl(search.query);
    if (search.query !== null) {
      if (initial) return search.path;
      // Warm: the linking action carries `pop` down to the Search tab's stack,
      // so Home is reused even with Settings on top (see CLAUDE.md).
      pushSearchLink(search.query);
      return search.path;
    }
    // A cold link builds the stack from scratch, which is right as it is. A
    // warm link into a tab that is not on screen selects that phase's hub
    // first and opens the target once it shows; a link into the tab on screen
    // navigates directly (see `link-handoff.ts`).
    if (initial) return resolved;
    return handOffWarmLink(asPath) ?? resolved;
  } catch {
    // Never break inbound links on a resolver bug.
    return path;
  }
}
