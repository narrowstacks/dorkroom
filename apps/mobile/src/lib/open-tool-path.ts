import { router } from 'expo-router';
import { toHref } from '@/lib/href';

/**
 * Opens a tool path from inside the app (a next-step link) with a plain
 * `router.navigate` and an anchor, the pattern Home uses. A timer already on
 * top is reused with the new params; otherwise one is pushed, so a second timer
 * screen can sit in the Develop stack when an older one is under another
 * screen (both show the same run). Two things were tried and rejected: the
 * warm-link handoff (`link-handoff.ts`) pushed a second Develop hub on top of
 * Recipes, and a singular timer screen made one Back collapse the visible stack
 * to its hub with an unhandled `REPLACE_PARAMS` (react-native-screens 4.26.2,
 * expo-router 57.0.29). With Recipes open in Develop, Back from the timer
 * returns to Recipes, not the hub.
 */
export function openToolPath(path: string): void {
  router.navigate(toHref(path), { withAnchor: true });
}
