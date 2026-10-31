import {
  copyTextToClipboard,
  getShareBaseUrl,
  shareLink,
  type ShareLinkOutcome,
} from '@dorkroom/logic';
import { ROUTE_TITLES, ShareModal, useOptionalToast } from '@dorkroom/ui';
import { type ReactNode, useCallback, useState } from 'react';
import { stringifySearch } from '../../routes/search-params';
import {
  type CalculatorTool,
  type TrackedRoute,
  trackEvent,
} from './analytics/tracked-events';

/** The tools whose page state is shared as a plain link to their route. */
export type LinkShareTool = Exclude<CalculatorTool, 'border'> | 'film';

/** The route each tool's link points at. */
const SHARE_PATHS = {
  stops: '/stops',
  resize: '/resize',
  reciprocity: '/reciprocity',
  lenses: '/lenses',
  exposure: '/exposure',
  mat: '/mat',
  film: '/films',
} as const satisfies Record<LinkShareTool, TrackedRoute>;

/** Flat search params; a missing or empty value gets no param. */
export type ShareLinkSearch = Readonly<Partial<Record<string, string>>>;

export interface ShareLinkControls {
  /**
   * Shares a link to the tool's route with `search`, titled `title` in the
   * native share sheet (the route's page title by default).
   */
  share: (search: ShareLinkSearch, title?: string) => Promise<ShareLinkOutcome>;
  /**
   * The manual-copy dialog shown when neither the share sheet nor the
   * clipboard took the link. Render it once next to the Share button.
   */
  manualCopyDialog: ReactNode;
}

interface ManualLink {
  url: string;
  title: string;
}

/**
 * Shares a link to `tool`'s page through the common share flow (`shareLink`:
 * the share sheet on mobile, the clipboard otherwise) and reports the `share`
 * event. A copied link toasts "Link copied"; a cancelled share sheet stays
 * silent; a refused clipboard opens the shared manual-copy dialog with the
 * link, as border's preset sharing does.
 *
 * @example
 * ```tsx
 * const { share, manualCopyDialog } = useShareLink('lenses');
 * <CalculatorLayout onShare={() => share(lensCalculatorLink.build(values))} />
 * {manualCopyDialog}
 * ```
 */
export function useShareLink(tool: LinkShareTool): ShareLinkControls {
  const toast = useOptionalToast();
  const [manualLink, setManualLink] = useState<ManualLink | null>(null);

  const share = useCallback(
    async (search: ShareLinkSearch, title?: string) => {
      const path = SHARE_PATHS[tool];
      const url = `${getShareBaseUrl()}${path}${stringifySearch(search)}`;
      const shareTitle = title ?? ROUTE_TITLES[path] ?? 'Dorkroom';
      const outcome = await shareLink({
        url,
        title: shareTitle,
        legacyFallback: true,
      });
      if (outcome.status === 'shared') {
        trackEvent('share', { tool, method: outcome.method });
        if (outcome.method === 'clipboard') {
          toast?.showToast('Link copied', 'success');
        }
      } else if (outcome.status === 'manual') {
        trackEvent('share', { tool, method: 'manual' });
        setManualLink({ url, title: shareTitle });
      }
      return outcome;
    },
    [tool, toast]
  );

  const manualCopyDialog = (
    <ShareModal
      isOpen={manualLink !== null}
      onClose={() => setManualLink(null)}
      presetName={manualLink?.title ?? ''}
      webUrl={manualLink?.url ?? ''}
      onCopyToClipboard={async (url) => {
        await copyTextToClipboard(url, { legacyFallback: true });
      }}
    />
  );

  return { share, manualCopyDialog };
}
