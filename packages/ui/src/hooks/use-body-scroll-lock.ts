import { useEffect } from 'react';

// One lock shared by every overlay on the page. Overlays can overlap (a form
// drawer opened from a detail drawer, a modal over a panel) and they acquire
// and release in whatever order React runs their effects, so each one saving
// and restoring `overflow` itself lets a later release write back another
// overlay's 'hidden'. Counting holders instead means only the last release
// restores, and it restores the value from before the first acquire.
let holders = 0;
let overflowBeforeLock = '';

function acquireBodyScrollLock(): void {
  if (holders === 0) {
    overflowBeforeLock = document.body.style.overflow;
  }
  holders += 1;
  document.body.style.overflow = 'hidden';
}

function releaseBodyScrollLock(): void {
  if (holders === 0) return;
  holders -= 1;
  if (holders === 0) {
    document.body.style.overflow = overflowBeforeLock;
  }
}

/**
 * Lock page scroll while `isLocked` is true. Safe to nest: the page scrolls
 * again only when every holder has released, and then gets back whatever
 * `overflow` it had before the first lock. A component that mounts unlocked
 * writes nothing.
 */
export function useBodyScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (!isLocked) return;
    acquireBodyScrollLock();
    return releaseBodyScrollLock;
  }, [isLocked]);
}
