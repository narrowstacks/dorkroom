import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import {
  ANNOUNCE_DEBOUNCE_MS,
  normalizeAnnouncement,
  resolveAnnouncement,
} from '@/lib/announce-result';

/**
 * Tells VoiceOver about a calculator result once it settles. Debounced so
 * typing a number is announced once, not per keystroke; the first render only
 * records a baseline (opening a screen is not a change); and the same text is
 * never spoken twice in a row. Pass null or an empty string while the inputs
 * are invalid and nothing is spoken.
 */
export function useAnnounceResult(
  text: string | null | undefined,
  delayMs = ANNOUNCE_DEBOUNCE_MS
): void {
  // Mutable holder, created once from the first render's text (the baseline).
  const [memory] = useState(() => ({
    settled: normalizeAnnouncement(text),
  }));

  useEffect(() => {
    const handle = setTimeout(() => {
      const decision = resolveAnnouncement(memory.settled, text);
      memory.settled = decision.settled;
      if (decision.speak) {
        AccessibilityInfo.announceForAccessibility(decision.speak);
      }
    }, delayMs);
    return () => clearTimeout(handle);
  }, [memory, text, delayMs]);
}
