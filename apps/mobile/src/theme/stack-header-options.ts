import type { Stack } from 'expo-router';
import type { ComponentProps } from 'react';

type StackScreenOptions = Extract<
  ComponentProps<typeof Stack>['screenOptions'],
  object
>;

/**
 * Shared native-stack header config for every `(tabs)` stack that opts into
 * `headerLargeTitle` (the Shoot, Develop and Print phase stacks).
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
 *
 * The blur is the bar's scrolled look. At the top of a large-title screen the
 * bar is clear (`headerLargeStyle`, the scroll-edge appearance): on iOS 26 the
 * expanded large title is drawn inside the screen's scroll view, under the
 * bar, so a blurred bar there would hide it. A screen with a standard title
 * spreads `STANDARD_TITLE` instead, which keeps the blur at the top too (a
 * stage screen has no scroll view, so its bar is always "at the top").
 */
export const stackHeaderOptions: StackScreenOptions = {
  headerShown: true,
  headerLargeTitle: true,
  headerLargeStyle: { backgroundColor: 'transparent' },
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

/** Per-screen options for a standard (never large) title in these stacks. */
export const STANDARD_TITLE = {
  headerLargeTitle: false,
  headerLargeStyle: undefined,
} as const satisfies StackScreenOptions;
