const utf8Decoder = new TextDecoder('utf-8', { fatal: true });

/** Maps each byte to the char with that code point (the form btoa expects). */
function bytesToBinary(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return binary;
}

/**
 * Cross-environment base64 encoding of a string's UTF-8 bytes.
 * Works in both browser (btoa) and Node.js (Buffer) environments, and both
 * produce the same output for any input, including text outside Latin-1.
 */
export function encodeBase64(input: string): string {
  const bytes = new TextEncoder().encode(input);

  if (globalThis.window !== undefined && window.btoa !== undefined) {
    // btoa throws on any char above U+00FF, so hand it bytes, not text.
    return window.btoa(bytesToBinary(bytes));
  }

  if (globalThis.Buffer !== undefined) {
    return Buffer.from(bytes).toString('base64');
  }

  throw new Error('Base64 encoding not supported in this environment');
}

function decodeBase64Bytes(input: string): Uint8Array {
  if (globalThis.window !== undefined && window.atob !== undefined) {
    return Uint8Array.from(window.atob(input), (char) => char.charCodeAt(0));
  }

  if (globalThis.Buffer !== undefined) {
    return new Uint8Array(Buffer.from(input, 'base64'));
  }

  throw new Error('Base64 decoding not supported in this environment');
}

/**
 * Cross-environment base64 decoding to a string, the inverse of
 * {@link encodeBase64}. Works in both browser (atob) and Node.js (Buffer).
 *
 * Links shared from a browser before UTF-8 encoding was introduced carry
 * Latin-1 bytes (one byte per char, e.g. `é` as 0xE9). Those are almost never
 * valid UTF-8, so a strict UTF-8 decode that fails falls back to Latin-1.
 * Pure-ASCII payloads are identical in both formats.
 */
export function decodeBase64(input: string): string {
  const bytes = decodeBase64Bytes(input);
  try {
    return utf8Decoder.decode(bytes);
  } catch {
    return bytesToBinary(bytes);
  }
}

/**
 * Converts standard base64 to a URL-safe variant.
 * Replaces `+` with `-`, `/` with `_`, and strips trailing `=` padding.
 */
export function toUrlSafe(base64: string): string {
  // `={1,2}$` (bounded) rather than `=+$`: valid base64 has at most two
  // padding chars, and the bound keeps the match linear (no ReDoS backtracking).
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/={1,2}$/, '');
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
