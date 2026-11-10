import { SAFELIGHT } from '@/theme/safelight';
import { stackHeaderOptions } from '@/theme/stack-header-options';

type HeaderOptions = typeof stackHeaderOptions;

/**
 * Native-stack options for safelight mode: black header with red title, back
 * chevron and buttons, no blur material, and the home indicator auto-hidden.
 * The multiply overlay tints whatever the header still draws; this keeps it as
 * dark as the API allows. The status bar is NOT dimmed or hidden (see the
 * Safelight mode section of CLAUDE.md).
 */
export const safelightHeaderOptions: HeaderOptions = {
  ...stackHeaderOptions,
  headerBlurEffect: 'none',
  headerStyle: { backgroundColor: SAFELIGHT.background },
  headerTintColor: SAFELIGHT.text,
  headerTitleStyle: { color: SAFELIGHT.text },
  headerLargeTitleStyle: { color: SAFELIGHT.text },
  autoHideHomeIndicator: true,
};

/** The header options for the current mode. */
export function chromeOptions(safelightOn: boolean): HeaderOptions {
  return safelightOn
    ? safelightHeaderOptions
    : {
        ...stackHeaderOptions,
        autoHideHomeIndicator: false,
      };
}
