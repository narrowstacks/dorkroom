import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import {
  ANNOUNCE_DEBOUNCE_MS,
  ANNOUNCE_SETTLE_MS,
  normalizeAnnouncement,
  resolveAnnouncement,
} from '@/lib/announce-result';

/**
 * Tells VoiceOver about a calculator result once it settles. Debounced so
 * typing a number is announced once, not per keystroke; the first render only
 * records a baseline (opening a screen is not a change); and the same text is
 * never spoken twice in a row. Pass null or an empty string while the inputs
 * are invalid and nothing is spoken.
 *
 * Persisted calculators restore saved inputs in an effect after the first
 * render, so changes within ANNOUNCE_SETTLE_MS of mounting re-baseline
 * silently: opening a screen with saved values is not a change either.
 *
 * Tabs stay mounted once visited, so a hidden screen whose text changes (a
 * unit flipped in Settings) stays silent and re-baselines instead of talking
 * over the visible screen.
 */
export function useAnnounceResult(
  text: string | null | undefined,
  delayMs = ANNOUNCE_DEBOUNCE_MS
): void {
  const focused = useIsFocused();
  // Mutable holder, created once from the first render's text (the baseline).
  const [memory] = useState(() => ({
    settled: normalizeAnnouncement(text),
    mountedAt: Date.now(),
  }));

  useEffect(() => {
    const settling = Date.now() - memory.mountedAt < ANNOUNCE_SETTLE_MS;
    if (!focused || settling) {
      memory.settled = resolveAnnouncement(memory.settled, text, false).settled;
      return;
    }
    const handle = setTimeout(() => {
      const decision = resolveAnnouncement(memory.settled, text, true);
      memory.settled = decision.settled;
      if (decision.speak) {
        AccessibilityInfo.announceForAccessibility(decision.speak);
      }
    }, delayMs);
    return () => clearTimeout(handle);
  }, [focused, memory, text, delayMs]);
}
