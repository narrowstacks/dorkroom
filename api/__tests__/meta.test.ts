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
});

describe('meta handler - unknown query params', () => {
  it('returns 400 for a request carrying an unknown param', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(MOCK_INDEX_HTML, { status: 200 }));
    globalThis.fetch = fetchMock;

    const req = createMockRequest({
      query: { path: '/', cachebust: 'abc123' },
    });
    const res = createMockResponse();

    await handler(req, res);

    expect(res._status).toBe(400);
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

  it('sets a long cache-control header on the 400 so the CDN absorbs repeats', async () => {
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
