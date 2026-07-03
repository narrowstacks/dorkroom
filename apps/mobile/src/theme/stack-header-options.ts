import type { Stack } from 'expo-router';
import type { ComponentProps } from 'react';

type StackScreenOptions = Extract<
  ComponentProps<typeof Stack>['screenOptions'],
  object
>;

/**
 * Shared native-stack header config for every `(tabs)` stack that opts into
 * `headerLargeTitle` (More, Film Log, Development/Recipes).
 *
 * `headerLargeTitle: true` alone does not give the header a background once
 * content scrolls under it — react-native-screens' native stack header stays
 * fully transparent, so scrolled content (and its own screen title, under a
 * keyboard-inset scroll) draws straight through the large title text. The
 * fix is to make the header opt into the native scroll-edge blur explicitly:
 * `headerTransparent` + `headerBlurEffect` (the effect requires transparent
 * to be `true`) puts a real blurred surface behind the title at all times,
 * so scrolled text is always occluded instead of double-drawn.
 *
 * Any new stack added under `(tabs)` that wants a large-title header should
 * spread this const into its `screenOptions` rather than re-declaring these
 * options, so header behavior stays consistent across the app.
 *
 * `scrollEdgeEffects` is set to `'hidden'` on every edge because iOS 26's
 * native scroll-edge effect and `headerBlurEffect` both try to draw a
 * blurred surface under the header — react-native-screens warns ("Using
 * both `blurEffect` and `scrollEdgeEffects` simultaneously may cause
 * overlapping effects") unless every edge is explicitly `'hidden'` (leaving
 * any edge unset defaults it to `'automatic'`, which still counts as "on"
 * for that check). `headerBlurEffect` is the one that actually engages
 * here, so the redundant scroll-edge effect is turned off everywhere.
 */
export const stackHeaderOptions: StackScreenOptions = {
  headerShown: true,
  headerLargeTitle: true,
  headerTransparent: true,
  headerBlurEffect: 'systemChromeMaterialDark',
  headerStyle: { backgroundColor: 'transparent' },
  scrollEdgeEffects: {
    top: 'hidden',
    bottom: 'hidden',
    left: 'hidden',
    right: 'hidden',
  },
};
