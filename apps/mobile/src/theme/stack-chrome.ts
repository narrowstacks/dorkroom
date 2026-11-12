import { SAFELIGHT } from '@/theme/safelight';
import { stackHeaderOptions } from '@/theme/stack-header-options';

type HeaderOptions = typeof stackHeaderOptions;

/**
 * The status bar for the current mode, as native-stack screen options. The app
 * runs with `UIViewControllerBasedStatusBarAppearance` true (`app.json`), so
 * the imperative `StatusBar` component is off the table (React Native logs an
 * error from it) and the bar is chosen per screen: light content always, and
 * hidden while safelight mode is on. Spread this into the root stack and every
 * phase stack; the root stack's `(tabs)` screen is the one iOS actually asks,
 * because `NativeTabs` is not a react-native-screens status bar container.
 */
export function statusBarOptions(safelightOn: boolean) {
  return { statusBarStyle: 'light', statusBarHidden: safelightOn } as const;
}

/**
 * Native-stack options for safelight mode: black header with red title, back
 * chevron and buttons, no blur material, and the home indicator auto-hidden.
 * The multiply overlay tints whatever the header still draws; this keeps it as
 * dark as the API allows. The status bar is hidden through `statusBarHidden`
 * (see `statusBarOptions`).
 */
export const safelightHeaderOptions: HeaderOptions = {
  ...stackHeaderOptions,
  headerBlurEffect: 'none',
  headerStyle: { backgroundColor: SAFELIGHT.background },
  headerTintColor: SAFELIGHT.text,
  headerTitleStyle: { color: SAFELIGHT.text },
  headerLargeTitleStyle: { color: SAFELIGHT.text },
  autoHideHomeIndicator: true,
  ...statusBarOptions(true),
};

/** The header options for the current mode. */
export function chromeOptions(safelightOn: boolean): HeaderOptions {
  return safelightOn
    ? safelightHeaderOptions
    : {
        ...stackHeaderOptions,
        autoHideHomeIndicator: false,
        ...statusBarOptions(false),
      };
}
