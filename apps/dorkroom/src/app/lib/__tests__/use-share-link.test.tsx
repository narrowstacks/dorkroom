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

const LENS_URL = `${window.location.origin}/lenses?focal=80&to=full-frame`;

/**
 * Shares `search` from the lens calculator, rendering the hook's manual-copy
 * dialog the way a page does.
 */
async function share(search: ShareLinkSearch = LENS_SEARCH) {
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
  const outcome = await act(() => result.current.share(search));
  dialog = result.current.manualCopyDialog;
  rerender();
  return outcome;
}

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

  it('adds no query string when there are no params', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubDesktop(writeText);

    await share({});

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/lenses`);
  });

  it('keeps an empty value as an empty param and skips a missing one', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubDesktop(writeText);

    await share({ focal: '80', from: '', to: undefined });

    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/lenses?focal=80&from=`
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
});
