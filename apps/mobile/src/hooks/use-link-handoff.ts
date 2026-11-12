import { router, usePathname } from 'expo-router';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { toHref } from '@/lib/href';
import {
  clearPendingLink,
  decideHandoff,
  getPendingLink,
  PENDING_LINK_TTL_MS,
  type PhaseLink,
  setCurrentPath,
  subscribePendingLink,
  takePendingLink,
} from '@/lib/link-handoff';

// Let the native tab bar finish selecting the tab before the target is pushed.
const SETTLE_MS = 60;

/**
 * Second step of a warm link (see `link-handoff.ts`): once the hub of the
 * pending link's phase is the current route, open the target on top of it.
 * The pending link is dropped when the user lands somewhere else first, or
 * after `PENDING_LINK_TTL_MS`. It also reports the route on screen, which
 * decides whether a link needs the handoff at all. Mounted once, in the tabs
 * layout.
 */
export function useLinkHandoff(): void {
  const pathname = usePathname();
  const pending = useSyncExternalStore(
    subscribePendingLink,
    getPendingLink,
    getPendingLink
  );
  // Re-armed whenever a newer link replaces the pending one: the route and the
  // time it arrived, so a change to some other route can be told apart from
  // the hop to the hub.
  const armedFor = useRef<PhaseLink | null>(null);
  const armedPath = useRef('');
  const armedAt = useRef(0);

  useEffect(() => {
    setCurrentPath(pathname);
  }, [pathname]);

  useEffect(() => {
    if (pending === null) {
      armedFor.current = null;
      return;
    }
    if (armedFor.current !== pending) {
      armedFor.current = pending;
      armedPath.current = pathname;
      armedAt.current = Date.now();
    }
    const ageMs = Date.now() - armedAt.current;
    const step = decideHandoff({
      hub: pending.hub,
      armedPath: armedPath.current,
      pathname,
      ageMs,
    });
    if (step === 'clear') {
      clearPendingLink();
      return;
    }
    if (step === 'navigate') {
      const timer = setTimeout(() => {
        const target = takePendingLink();
        if (target !== null) router.navigate(toHref(target));
      }, SETTLE_MS);
      return () => clearTimeout(timer);
    }
    const expiry = setTimeout(clearPendingLink, PENDING_LINK_TTL_MS - ageMs);
    return () => clearTimeout(expiry);
  }, [pending, pathname]);
}
