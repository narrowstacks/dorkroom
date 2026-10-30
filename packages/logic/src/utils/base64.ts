// The Encoding API (TextEncoder/TextDecoder) is missing from the engines the
// legacy bundle targets (the Kindle Experimental Browser, IE 11, old Safari),
// and core-js does not polyfill it. Never touch it at module load: detect it
// per call and fall back to the pure-JS UTF-8 codec below, which produces the
// same bytes and the same strings.

let cachedUtf8Decoder: TextDecoder | undefined;

function getUtf8Decoder(): TextDecoder | undefined {
  if (cachedUtf8Decoder === undefined && globalThis.TextDecoder !== undefined) {
    cachedUtf8Decoder = new TextDecoder('utf-8', { fatal: true });
  }
  return cachedUtf8Decoder;
}

/**
 * Pure-JS UTF-8 encoding, byte-identical to `TextEncoder#encode`: lone
 * surrogates become U+FFFD (EF BF BD), exactly as the Encoding API does.
 */
function encodeUtf8Fallback(input: string): Uint8Array {
  const bytes: number[] = [];
  for (let i = 0; i < input.length; i++) {
    let codePoint = input.charCodeAt(i);

    if (codePoint >= 0xd800 && codePoint <= 0xdfff) {
      const next = i + 1 < input.length ? input.charCodeAt(i + 1) : 0;
      if (codePoint <= 0xdbff && next >= 0xdc00 && next <= 0xdfff) {
        codePoint = 0x10000 + ((codePoint - 0xd800) << 10) + (next - 0xdc00);
        i++;
      } else {
        codePoint = 0xfffd;
      }
    }

    if (codePoint < 0x80) {
      bytes.push(codePoint);
    } else if (codePoint < 0x800) {
      bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint < 0x10000) {
      bytes.push(
        0xe0 | (codePoint >> 12),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f)
      );
    } else {
      bytes.push(
        0xf0 | (codePoint >> 18),
        0x80 | ((codePoint >> 12) & 0x3f),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f)
      );
    }
  }
  return new Uint8Array(bytes);
}

/**
 * Pure-JS strict UTF-8 decoding, matching `new TextDecoder('utf-8',
 * { fatal: true })`: throws on any ill-formed sequence (bad continuation
 * bytes, overlong forms, surrogates, code points above U+10FFFF, truncation)
 * and strips a leading byte order mark.
 */
function decodeUtf8Fallback(bytes: Uint8Array): string {
  let result = '';
  let i =
    bytes.length >= 3 &&
    bytes[0] === 0xef &&
    bytes[1] === 0xbb &&
    bytes[2] === 0xbf
      ? 3
      : 0;

  while (i < bytes.length) {
    const lead = bytes[i];
    let needed: number;
    let codePoint: number;
    // Valid range for the first continuation byte (rules out overlongs,
    // surrogates and code points above U+10FFFF, per the WHATWG decoder).
    let lower = 0x80;
    let upper = 0xbf;

    if (lead < 0x80) {
      result += String.fromCharCode(lead);
      i++;
      continue;
    } else if (lead >= 0xc2 && lead <= 0xdf) {
      needed = 1;
      codePoint = lead & 0x1f;
    } else if (lead >= 0xe0 && lead <= 0xef) {
      needed = 2;
      codePoint = lead & 0x0f;
      if (lead === 0xe0) lower = 0xa0;
      if (lead === 0xed) upper = 0x9f;
    } else if (lead >= 0xf0 && lead <= 0xf4) {
      needed = 3;
      codePoint = lead & 0x07;
      if (lead === 0xf0) lower = 0x90;
      if (lead === 0xf4) upper = 0x8f;
    } else {
      throw new TypeError('Invalid UTF-8 lead byte');
    }

    if (i + needed >= bytes.length) {
      throw new TypeError('Truncated UTF-8 sequence');
    }
    for (let k = 1; k <= needed; k++) {
      const byte = bytes[i + k];
      if (byte < lower || byte > upper) {
        throw new TypeError('Invalid UTF-8 continuation byte');
      }
      lower = 0x80;
      upper = 0xbf;
      codePoint = (codePoint << 6) | (byte & 0x3f);
    }
    i += needed + 1;

    if (codePoint >= 0x10000) {
      const offset = codePoint - 0x10000;
      result += String.fromCharCode(
        0xd800 + (offset >> 10),
        0xdc00 + (offset & 0x3ff)
      );
    } else {
      result += String.fromCharCode(codePoint);
    }
  }
  return result;
}

function encodeUtf8(input: string): Uint8Array {
  if (globalThis.TextEncoder !== undefined) {
    return new TextEncoder().encode(input);
  }
  return encodeUtf8Fallback(input);
}

/** Strict UTF-8 decode; throws if the bytes are not valid UTF-8. */
function decodeUtf8(bytes: Uint8Array): string {
  const decoder = getUtf8Decoder();
  return decoder ? decoder.decode(bytes) : decodeUtf8Fallback(bytes);
}

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
  const bytes = encodeUtf8(input);

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
    return decodeUtf8(bytes);
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
