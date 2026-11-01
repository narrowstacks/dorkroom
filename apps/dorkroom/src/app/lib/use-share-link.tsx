import {
  copyTextToClipboard,
  getShareBaseUrl,
  SHARED_LINK_MARKER,
  shareLink,
  type ShareLinkOutcome,
} from '@dorkroom/logic';
import { ROUTE_TITLES, ShareModal, useOptionalToast } from '@dorkroom/ui';
import { type ReactNode, useCallback, useState } from 'react';
import {
  type CalculatorTool,
  type TrackedRoute,
} from './analytics/tracked-events';
import { useShareTracker } from './analytics/use-share-analytics';

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

/**
 * Flat search params. A missing value gets no param; an empty one gets an
 * empty param (`artW=`), because a calculator link uses it to keep a cleared
 * field cleared. That is why this does not reuse the router's
 * `stringifySearch`, which drops empty values.
 */
export type ShareLinkSearch = Readonly<Partial<Record<string, string>>>;

/**
 * The query of a shared link: the page's own params, then the shared-link
 * marker (`source=share`), which tells the page that opens it the visit came
 * from a share.
 */
const toShareQuery = (search: ShareLinkSearch): string => {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(search)) {
    if (value !== undefined) params.set(name, value);
  }
  params.set(SHARED_LINK_MARKER.param, SHARED_LINK_MARKER.value);
  return `?${params.toString()}`;
};

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
 * event, once per link while the page is mounted (`useShareTracker`). The
 * link carries the shared-link marker, so opening it reports `share_opened`.
 * A copied link toasts "Link copied"; a cancelled share sheet stays silent; a
 * refused clipboard opens the shared manual-copy dialog with the link, as
 * border's preset sharing does.
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
  const trackShare = useShareTracker();

  const share = useCallback(
    async (search: ShareLinkSearch, title?: string) => {
      const path = SHARE_PATHS[tool];
      const url = `${getShareBaseUrl()}${path}${toShareQuery(search)}`;
      const shareTitle = title ?? ROUTE_TITLES[path] ?? 'Dorkroom';
      const outcome = await shareLink({
        url,
        title: shareTitle,
        legacyFallback: true,
      });
      if (outcome.status === 'shared') {
        trackShare(url, tool, outcome.method);
        if (outcome.method === 'clipboard') {
          toast?.showToast('Link copied', 'success');
        }
      } else if (outcome.status === 'manual') {
        trackShare(url, tool, 'manual');
        setManualLink({ url, title: shareTitle });
      }
      return outcome;
    },
    [tool, toast, trackShare]
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
