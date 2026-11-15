import {
  APP_SCHEME,
  resolveIncomingLink,
  stampTimerExposureLink,
} from '@/lib/deep-link';
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
    // A cold link builds the stack from scratch, which is right as it is. A
    // warm link into a tab that is not on screen selects that phase's hub
    // first and opens the target once it shows; a link into the tab on screen
    // navigates directly (see `link-handoff.ts`).
    if (initial) return resolved;
    const asPath = resolved
      .replace(new RegExp(`^${APP_SCHEME}://`, 'i'), '/')
      .replace(/^\/+/, '/');
    return handOffWarmLink(asPath) ?? resolved;
  } catch {
    // Never break inbound links on a resolver bug.
    return path;
  }
}
