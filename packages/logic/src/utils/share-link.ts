import { debugError } from './debug-logger';
import { shouldUseWebShare } from './device-detection';
import { isBrowser } from './environment';

/**
 * The one share flow every share link goes through: work out the base URL,
 * offer the native share sheet, then the clipboard, then hand the link back
 * for manual copying. Each payload type (border preset, recipe, custom recipe)
 * keeps only a URL builder on top of {@link getShareBaseUrl}.
 */

export interface ShareBaseUrlOptions {
  /** Returned when there is no browser `window` to read the origin from. */
  fallback?: string;
  /**
   * Keep the port only on `localhost`/`127.0.0.1` and drop it on any other
   * host. Border preset links have always been built this way, so a LAN or
   * Tailscale dev host (`192.168.1.5:4503`) yields a port-less link there
   * while recipe links keep the port. Kept so no existing link changes host.
   */
  loopbackPortOnly?: boolean;
}

/**
 * Origin share links are built on: `protocol//host` of the current page, or
 * `fallback` outside a browser.
 */
export function getShareBaseUrl({
  fallback = '',
  loopbackPortOnly = false,
}: ShareBaseUrlOptions = {}): string {
  if (!isBrowser()) {
    return fallback;
  }

  const { protocol, host, hostname } = window.location;
  if (
    loopbackPortOnly &&
    hostname !== 'localhost' &&
    hostname !== '127.0.0.1'
  ) {
    return `${protocol}//${hostname}`;
  }
  return `${protocol}//${host}`;
}

/**
 * Checks if the current environment supports the Clipboard API.
 *
 * @returns True if `navigator.clipboard.writeText` exists
 */
export function isClipboardSupported(): boolean {
  return (
    globalThis.navigator !== undefined &&
    'clipboard' in navigator &&
    'writeText' in navigator.clipboard
  );
}

export interface CopyTextOptions {
  /**
   * Without the Clipboard API, copy through a hidden textarea and
   * `document.execCommand('copy')` instead of giving up.
   */
  legacyFallback?: boolean;
}

/**
 * Copies text to the clipboard.
 *
 * @returns True when the text was handed to a clipboard API, false when none
 *   is available
 * @throws Whatever `navigator.clipboard.writeText` rejects with
 */
export async function copyTextToClipboard(
  text: string,
  { legacyFallback = false }: CopyTextOptions = {}
): Promise<boolean> {
  if (isClipboardSupported()) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  if (!legacyFallback || globalThis.document === undefined) {
    return false;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  Object.assign(textarea.style, { position: 'fixed', opacity: '0' });
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
  return true;
}

export interface ShareLinkOptions extends CopyTextOptions {
  url: string;
  /** Title for the native share sheet. */
  title: string;
  /** Optional body text for the native share sheet. */
  text?: string;
  /**
   * Treat a cancelled share sheet like a failed one and copy the link anyway.
   * Only the custom recipe path has ever done this; it is kept so that path's
   * behaviour does not change.
   */
  copyOnCancel?: boolean;
}

export type ShareLinkOutcome =
  /** The link reached the user through the share sheet or the clipboard. */
  | { status: 'shared'; method: 'native' | 'clipboard' }
  /** The user dismissed the share sheet; nothing else should happen. */
  | { status: 'cancelled' }
  /**
   * Neither the sheet nor the clipboard took the link, so the caller should
   * show it for manual copying. `errorMessage` is set when a clipboard write
   * failed with an `Error`.
   */
  | { status: 'manual'; errorMessage?: string };

/**
 * Shares a link: native share sheet (on mobile, when the Web Share API is
 * present), then the clipboard, then manual copying.
 */
export async function shareLink({
  url,
  title,
  text,
  legacyFallback,
  copyOnCancel = false,
}: ShareLinkOptions): Promise<ShareLinkOutcome> {
  if (shouldUseWebShare()) {
    try {
      await navigator.share(
        text === undefined ? { title, url } : { title, text, url }
      );
      return { status: 'shared', method: 'native' };
    } catch (error) {
      const cancelled = error instanceof Error && error.name === 'AbortError';
      if (cancelled && !copyOnCancel) {
        return { status: 'cancelled' };
      }
      debugError('Native share failed, falling back to clipboard:', error);
    }
  }

  try {
    const copied = await copyTextToClipboard(url, { legacyFallback });
    return copied
      ? { status: 'shared', method: 'clipboard' }
      : { status: 'manual' };
  } catch (error) {
    debugError('Failed to copy to clipboard:', error);
    return {
      status: 'manual',
      errorMessage: error instanceof Error ? error.message : undefined,
    };
  }
}
