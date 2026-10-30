/**
 * Panel geometry shared by the share and save-before-share dialogs, layered
 * over the shared `Modal` panel. Their sections carry their own padding, so
 * the panel has none. On phones the panel sits at the bottom of the screen,
 * 5rem up to clear the mobile nav; from `sm` up it is centred.
 */
export const SHARE_DIALOG_PANEL_CLASS =
  'max-w-lg self-end mb-20 overflow-hidden p-0 sm:mb-0 sm:self-center';
