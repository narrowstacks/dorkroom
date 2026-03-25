/**
 * Cross-environment base64 encoding.
 * Works in both browser (btoa) and Node.js (Buffer) environments.
 */
export function encodeBase64(input: string): string {
  if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
    return window.btoa(input);
  }

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(input, 'utf8').toString('base64');
  }

  throw new Error('Base64 encoding not supported in this environment');
}

/**
 * Cross-environment base64 decoding.
 * Works in both browser (atob) and Node.js (Buffer) environments.
 */
export function decodeBase64(input: string): string {
  if (typeof window !== 'undefined' && typeof window.atob === 'function') {
    return window.atob(input);
  }

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(input, 'base64').toString('utf8');
  }

  throw new Error('Base64 decoding not supported in this environment');
}

/**
 * Converts standard base64 to a URL-safe variant.
 * Replaces `+` with `-`, `/` with `_`, and strips trailing `=` padding.
 */
export function toUrlSafe(base64: string): string {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Converts a URL-safe base64 string back to standard base64.
 * Replaces `-` with `+`, `_` with `/`, and restores `=` padding.
 */
export function fromUrlSafe(urlSafe: string): string {
  let base64 = urlSafe.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return base64;
}
