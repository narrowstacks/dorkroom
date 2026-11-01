import { ToastProvider } from '@dorkroom/ui';
import { act, renderHook, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type ShareLinkSearch, useShareLink } from '../use-share-link';

/** The slice of `navigator` the share flow reads. */
interface FakeNavigator {
  userAgent: string;
  maxTouchPoints: number;
  share?: (data: ShareData) => Promise<void>;
  clipboard?: { writeText: (text: string) => Promise<void> };
}

/** A desktop browser: no share sheet, so the link goes to the clipboard. */
function stubDesktop(writeText: (text: string) => Promise<void>) {
  const fake: FakeNavigator = {
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
    maxTouchPoints: 0,
    clipboard: { writeText },
  };
  vi.stubGlobal('navigator', fake);
}

/** A touch phone with the Web Share API. */
function stubPhone(nativeShare: (data: ShareData) => Promise<void>) {
  const fake: FakeNavigator = {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    maxTouchPoints: 5,
    share: nativeShare,
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  };
  vi.stubGlobal('navigator', fake);
}

const LENS_SEARCH: ShareLinkSearch = {
  focal: '80',
  from: undefined,
  to: 'full-frame',
};

const LENS_URL = `${window.location.origin}/lenses?focal=80&to=full-frame&source=share`;

/**
 * Mounts the lens calculator's share hook, rendering its manual-copy dialog
 * the way a page does. `share` can be called repeatedly on the one mount.
 */
function mountShare() {
  let dialog: ReactNode = null;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ToastProvider>
      {children}
      {dialog}
    </ToastProvider>
  );
  const { result, rerender } = renderHook(() => useShareLink('lenses'), {
    wrapper,
  });
  return async (search: ShareLinkSearch = LENS_SEARCH) => {
    const outcome = await act(() => result.current.share(search));
    dialog = result.current.manualCopyDialog;
    rerender();
    return outcome;
  };
}

/** Shares `search` once from a fresh mount. */
const share = (search: ShareLinkSearch = LENS_SEARCH) => mountShare()(search);

/** The `share` events sent so far. */
const shareEvents = () =>
  vi
    .mocked(window.va ?? vi.fn())
    .mock.calls.filter((call) => JSON.stringify(call).includes('"share"'));

/**
 * `window.va` is the queue `@vercel/analytics` forwards to, so the `share`
 * event travels through the real `trackEvent` -> `track` chain.
 */
describe('useShareLink', () => {
  beforeEach(() => {
    window.va = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    delete window.va;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('copies the page link with its search params and reports the share', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubDesktop(writeText);

    const outcome = await share();

    expect(outcome).toEqual({ status: 'shared', method: 'clipboard' });
    expect(writeText).toHaveBeenCalledWith(LENS_URL);
    expect(window.va).toHaveBeenCalledWith('event', {
      name: 'share',
      data: { tool: 'lenses', method: 'clipboard' },
      options: undefined,
    });
    expect(screen.getByText('Link copied')).toBeInTheDocument();
  });

  it('adds only the shared-link marker when there are no params', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubDesktop(writeText);

    await share({});

    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/lenses?source=share`
    );
  });

  it('keeps an empty value as an empty param and skips a missing one', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubDesktop(writeText);

    await share({ focal: '80', from: '', to: undefined });

    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/lenses?focal=80&from=&source=share`
    );
  });

  it('opens the share sheet on a phone and reports a native share', async () => {
    const nativeShare = vi.fn().mockResolvedValue(undefined);
    stubPhone(nativeShare);

    const outcome = await share();

    expect(outcome).toEqual({ status: 'shared', method: 'native' });
    expect(nativeShare).toHaveBeenCalledWith({
      title: 'Lens Equivalency Calculator',
      url: LENS_URL,
    });
    expect(window.va).toHaveBeenCalledWith('event', {
      name: 'share',
      data: { tool: 'lenses', method: 'native' },
      options: undefined,
    });
    expect(screen.queryByText('Link copied')).not.toBeInTheDocument();
  });

  it('stays silent when the share sheet is dismissed', async () => {
    stubPhone(
      vi
        .fn()
        .mockRejectedValue(
          Object.assign(new Error('Share canceled'), { name: 'AbortError' })
        )
    );

    const outcome = await share();

    expect(outcome).toEqual({ status: 'cancelled' });
    expect(window.va).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByText(/link/i)).not.toBeInTheDocument();
  });

  it('shows the link for manual copying when the clipboard refuses it', async () => {
    stubDesktop(vi.fn().mockRejectedValue(new Error('Permission denied')));

    const outcome = await share();

    expect(outcome).toEqual({
      status: 'manual',
      errorMessage: 'Permission denied',
    });
    const dialog = screen.getByRole('dialog', {
      name: 'Share "Lens Equivalency Calculator"',
    });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Web Link' })).toHaveValue(
      LENS_URL.replace(/^https?:\/\//, '')
    );
    expect(window.va).toHaveBeenCalledWith('event', {
      name: 'share',
      data: { tool: 'lenses', method: 'manual' },
      options: undefined,
    });
    expect(screen.queryByText('Link copied')).not.toBeInTheDocument();
  });

  it('reports the same link once, however often it is shared', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubDesktop(writeText);
    const shareAgain = mountShare();

    await shareAgain();
    await shareAgain();
    await shareAgain();

    expect(writeText).toHaveBeenCalledTimes(3);
    expect(shareEvents()).toHaveLength(1);
  });

  it('reports a new link after the inputs change', async () => {
    stubDesktop(vi.fn().mockResolvedValue(undefined));
    const shareAgain = mountShare();

    await shareAgain({ focal: '80' });
    await shareAgain({ focal: '80' });
    await shareAgain({ focal: '50' });
    await shareAgain({ focal: '80' });

    expect(shareEvents()).toHaveLength(2);
  });

  it('does not count a cancelled share sheet, so a later share still reports', async () => {
    const nativeShare = vi
      .fn()
      .mockRejectedValueOnce(
        Object.assign(new Error('Share canceled'), { name: 'AbortError' })
      )
      .mockResolvedValue(undefined);
    stubPhone(nativeShare);
    const shareAgain = mountShare();

    await shareAgain();
    expect(shareEvents()).toHaveLength(0);
    await shareAgain();
    expect(shareEvents()).toHaveLength(1);
  });

  it('never puts the link in the event', async () => {
    stubDesktop(vi.fn().mockResolvedValue(undefined));

    await share();

    const sent = JSON.stringify(vi.mocked(window.va ?? vi.fn()).mock.calls);
    expect(sent).not.toContain('focal');
    expect(sent).not.toContain('/lenses');
  });
});
