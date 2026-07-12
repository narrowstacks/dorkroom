import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createMockRequest,
  createMockResponse,
} from '../../utils/__tests__/mock-vercel';
import handler from '../meta';

const MOCK_INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Dorkroom - Photography Calculators and Resources</title>
    <base href="/" />
    <meta
      name="description"
      content="Explore Dorkroom.art, a knowledgebase and toolset for film photography."
    />
    <meta property="og:title" content="Dorkroom" />
    <meta
      property="og:description"
      content="Explore film-developer data, calculators, and resources for analog photography."
    />
    <meta property="og:url" content="https://dorkroom.art/" />
    <meta property="og:image" content="https://dorkroom.art/api/og?route=%2F" />
    <meta name="twitter:title" content="Dorkroom" />
    <meta
      name="twitter:description"
      content="Explore film-developer data, calculators, and resources for analog photography."
    />
    <meta name="twitter:image" content="https://dorkroom.art/api/og?route=%2F" />
  </head>
  <body></body>
</html>
`;

const originalFetch = globalThis.fetch;

beforeEach(() => {
  globalThis.fetch = vi
    .fn()
    .mockResolvedValue(new Response(MOCK_INDEX_HTML, { status: 200 }));
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('meta handler - border preset injection', () => {
  // Encodes a border preset whose name segment URI-decodes to
  // `"><svg onload=alert(1)>` — built the way decodeBorderPreset expects:
  // <uri-encoded name>-<aspectIdx>-<paperIdx>-<minBorder100>-<hOffset>-<vOffset>-<boolMask>
  // aspectIdx=0 (35mm), paperIdx=2 (8x10) are valid indices into the minified
  // lookup tables in utils/routeMetadata.ts, so decodeBorderPreset succeeds.
  const maliciousPreset =
    'JTIyJTNFJTNDc3ZnJTIwb25sb2FkJTNEYWxlcnQoMSklM0UtMC0yLTUwLTAtMTAwMDAtOA';

  it('neutralizes markup embedded in a decoded preset name', async () => {
    const req = createMockRequest({
      query: { path: '/border', preset: maliciousPreset },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res._sent).not.toContain('<svg');
    expect(res._sent).not.toContain('onload=alert(1)>');
    expect(res._sent).toContain('&lt;svg');
    expect(res._sent).toContain('&quot;&gt;&lt;svg');
  });

  it('still renders a 200 with the escaped title in <title> and og:title', async () => {
    const req = createMockRequest({
      query: { path: '/border', preset: maliciousPreset },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._sent).toContain(
      '<title>&quot;&gt;&lt;svg onload=alert(1)&gt; | Dorkroom</title>'
    );
    expect(res._sent).toContain(
      'property="og:title" content="&quot;&gt;&lt;svg onload=alert(1)&gt; | Dorkroom"'
    );
  });

  // Encodes a preset whose name segment URI-decodes to `Foo$`Bar` — built
  // the same way as `maliciousPreset` above (`<uri-encoded name>-0-2-50-0-
  // 10000-8`, base64url-encoded). The backtick survives decodeURIComponent
  // via %60, and the `$` survives via %24; escapeHtml does not touch either
  // character. A `String.replace(pattern, someString)` call treats `$\``
  // in `someString` as "insert everything before the match" — if any
  // rewrite in meta.ts still passes a plain string replacement, this splices
  // a duplicate copy of the preceding document into the output.
  const backtickPreset = 'Rm9vJTI0JTYwQmFyLTAtMi01MC0wLTEwMDAwLTg';

  it('treats a `$`-and-backtick decoded preset name as a literal string, not a replacement pattern', async () => {
    const req = createMockRequest({
      query: { path: '/border', preset: backtickPreset },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._sent).toContain('<title>Foo$`Bar | Dorkroom</title>');
    // No document content got spliced in via `$\`` — the doctype/html
    // opening tags must each appear exactly once.
    expect(res._sent.match(/<!DOCTYPE/gi)?.length).toBe(1);
    expect(res._sent.match(/<html/gi)?.length).toBe(1);
    // Telltale spliced fragment: the real <head> preamble reappearing
    // inside the title text.
    expect(res._sent).not.toContain('Foo$<!DOCTYPE');
  });
});

describe('meta handler - unknown query params', () => {
  it('redirects with a 308 for a request carrying an unknown param', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(MOCK_INDEX_HTML, { status: 200 }));
    globalThis.fetch = fetchMock;

    const req = createMockRequest({
      query: { path: '/', cachebust: 'abc123' },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res._status).toBe(308);
  });

  it('redirects to the canonical URL, stripping the junk param but keeping an allowed one', async () => {
    const req = createMockRequest({
      query: { path: '/films', film: 'kodak-tri-x-400', cachebust: 'abc123' },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res._status).toBe(308);
    const location = String(res.getHeader('location'));
    expect(location).toBe('https://dorkroom.art/films?film=kodak-tri-x-400');
    expect(location).not.toContain('cachebust');
  });

  it('does not call fetch when an unknown param is present', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(MOCK_INDEX_HTML, { status: 200 }));
    globalThis.fetch = fetchMock;

    const req = createMockRequest({
      query: { path: '/', cachebust: 'abc123' },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sets a long cache-control header on the redirect so the CDN absorbs repeats', async () => {
    const req = createMockRequest({
      query: { path: '/', cachebust: 'abc123' },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res.getHeader('cache-control')).toContain('s-maxage=86400');
  });

  it('still returns 200 for a request with only legitimate params', async () => {
    const req = createMockRequest({
      query: { path: '/films', film: 'kodak-tri-x-400' },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res._status).toBe(200);
  });
});

describe('meta handler - redirect target is pinned on-origin', () => {
  // /api/meta is publicly reachable (vercel.json routes /api/(.*) without a
  // bot-UA check), so the canonical redirect must never follow an
  // attacker-controlled `path` off-origin — WHATWG URL resolves inputs like
  // `//evil.com` and `https://evil.com` against the base to a foreign host,
  // and a pathname like `//evil.com` (via `path=/.//evil.com`) would be
  // protocol-relative if naively re-parsed.
  const hostilePaths = [
    '//evil.com',
    'https://evil.com',
    '/\\/evil.com',
    '\\\\evil.com',
  ];

  for (const path of hostilePaths) {
    it(`keeps the redirect on https://dorkroom.art for path=${JSON.stringify(path)}`, async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(new Response(MOCK_INDEX_HTML, { status: 200 }));
      globalThis.fetch = fetchMock;

      // Junk param triggers the redirect branch.
      const req = createMockRequest({
        query: { path, utm_source: 'x' },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res._status).toBe(308);
      const location = String(res.getHeader('location'));
      expect(location).toBe('https://dorkroom.art/');
      expect(new URL(location).origin).toBe('https://dorkroom.art');
      expect(location).not.toContain('evil.com');
      expect(fetchMock).not.toHaveBeenCalled();
    });
  }

  it('stays on-origin even when the parsed pathname itself starts with // (path=/.//evil.com)', async () => {
    // `new URL('/.//evil.com', base).pathname` is `//evil.com`; if the
    // handler re-parsed that pathname as a URL string it would become
    // protocol-relative and escape to https://evil.com/. The pathname
    // *setter* used by buildCanonicalUrl cannot change the host, so the
    // Location keeps the explicit dorkroom.art authority (`evil.com` is
    // just a path segment there, not a host).
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(MOCK_INDEX_HTML, { status: 200 }));
    globalThis.fetch = fetchMock;

    const req = createMockRequest({
      query: { path: '/.//evil.com', utm_source: 'x' },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res._status).toBe(308);
    const location = String(res.getHeader('location'));
    expect(location).toBe('https://dorkroom.art//evil.com');
    expect(new URL(location).origin).toBe('https://dorkroom.art');
    expect(new URL(location).hostname).toBe('dorkroom.art');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('meta handler - duplicated allowed query params', () => {
  it('redirects to the canonical URL using the first value of a duplicated allowed param', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(MOCK_INDEX_HTML, { status: 200 }));
    globalThis.fetch = fetchMock;

    // Vercel collapses `?film=a&film=b` into an array-valued `query.film`.
    const req = createMockRequest({
      query: { path: '/films', film: ['kodak-tri-x-400', 'ilford-hp5'] },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res._status).toBe(308);
    expect(res.getHeader('location')).toBe(
      'https://dorkroom.art/films?film=kodak-tri-x-400'
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('meta handler - non-regression', () => {
  it('renders the generic /border card when no preset is given', async () => {
    const req = createMockRequest({ query: { path: '/border' } });
    const res = createMockResponse();

    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._sent).toContain('<title>Border Calculator | Dorkroom</title>');
    expect(res._sent).toContain(
      'name="description" content="Figure out where to set your easel blades for even borders. Punch in paper size and negative format, get blade positions."'
    );
  });

  it('renders the home route metadata for an unspecified path', async () => {
    const req = createMockRequest({ query: {} });
    const res = createMockResponse();

    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._sent).toContain(
      '<title>Dorkroom - Photography Calculators and Resources</title>'
    );
  });

  it('escapes a legitimate ampersand from the color label rather than dropping it', async () => {
    // color=bw resolves to COLOR_LABELS.bw === 'Black & White', a real
    // ampersand that reaches the title/description through the normal
    // (non-injection) film-filter path.
    const req = createMockRequest({
      query: { path: '/films', color: 'bw' },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._sent).toContain('Black &amp; White Films');
    expect(res._sent).not.toContain('Black & White Films');
  });

  it('escapes a legitimate apostrophe in a brand filter rather than dropping it', async () => {
    // BRAND_RE (`/^[\w\s.'-]{1,50}$/`) allows apostrophes, so a brand name
    // like "O'Keefe" reaches the title/description unescaped from
    // getRouteMetadata and must be escaped at the HTML boundary.
    const req = createMockRequest({
      query: { path: '/films', brand: "O'Keefe" },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._sent).toContain('O&#39;Keefe Films');
    expect(res._sent).not.toContain("O'Keefe Films");
  });

  it('sets the canonical link with an escaped href', async () => {
    const req = createMockRequest({ query: { path: '/border' } });
    const res = createMockResponse();

    await handler(req, res);

    expect(res._sent).toContain(
      '<link rel="canonical" href="https://dorkroom.art/border" />'
    );
  });
});
