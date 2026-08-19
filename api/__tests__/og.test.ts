import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from 'vitest';
import handler from '../og';

const FONT_HOST = 'fonts.gstatic.com';

/** Exact host match — a substring test would also accept `fonts.gstatic.com.evil.test`. */
function isFontRequest(url: string): boolean {
  return URL.parse(url)?.hostname === FONT_HOST;
}

function jsonResponse(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

const EMPTY_LIST = JSON.stringify({ data: [], count: 0 });

/**
 * Stub global fetch. Font requests answer 404, so `loadFontData` returns null
 * and the renderer falls back to the face bundled with `@vercel/og` — the test
 * environment has no Google Fonts access. Every other URL goes to `respond`,
 * which is called afresh per request so each caller gets an unread body.
 */
function stubFetch(
  respond: (url: string, init?: RequestInit) => Promise<Response>
): Mock<typeof fetch> {
  const fetchMock = vi.fn<typeof fetch>((input, init) => {
    const url = String(input);
    if (isFontRequest(url)) {
      return Promise.resolve(new Response(null, { status: 404 }));
    }
    return respond(url, init);
  });
  globalThis.fetch = fetchMock;
  return fetchMock;
}

function makeRequest(params?: Record<string, string>): Request {
  const url = new URL('https://dorkroom.art/api/og');
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  return new Request(url.toString());
}

const originalFetch = globalThis.fetch;

beforeEach(() => {
  // Default: every upstream lookup answers empty (API unavailable).
  stubFetch(() => Promise.resolve(jsonResponse(EMPTY_LIST)));
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('og handler - static routes', () => {
  it('returns a 200 response for known route', async () => {
    const res = await handler(makeRequest({ route: '/border' }));
    expect(res.status).toBe(200);
  });

  it('returns image/png content type', async () => {
    const res = await handler(makeRequest({ route: '/border' }));
    expect(res.headers.get('content-type')).toBe('image/png');
  });

  it('sets cache-control header', async () => {
    const res = await handler(makeRequest({ route: '/border' }));
    expect(res.headers.get('cache-control')).toContain('s-maxage=86400');
  });

  it('defaults to home route when no route param', async () => {
    const res = await handler(makeRequest());
    expect(res.status).toBe(200);
  });

  it('handles unknown routes without throwing', async () => {
    const res = await handler(makeRequest({ route: '/some-unknown-page' }));
    expect(res.status).toBe(200);
  });
});

describe('og handler - film detail', () => {
  it('renders film card with API data', async () => {
    stubFetch(() =>
      Promise.resolve(
        jsonResponse(
          JSON.stringify({
            data: [
              {
                slug: 'adox-chs-100-ii',
                brand: 'Adox',
                name: 'CHS 100 II',
                iso_speed: 100,
                color_type: 'bw',
              },
            ],
            count: 1,
          })
        )
      )
    );

    const res = await handler(
      makeRequest({ route: '/films', film: 'adox-chs-100-ii' })
    );
    expect(res.status).toBe(200);
  });

  it('falls back to prettified slug when API fails', async () => {
    stubFetch(() => Promise.reject(new Error('Network error')));

    const res = await handler(
      makeRequest({ route: '/films', film: 'adox-chs-100-ii' })
    );
    expect(res.status).toBe(200);
  });
});

describe('og handler - development recipe', () => {
  it('renders recipe card with API data', async () => {
    stubFetch((url) => {
      if (url.includes('/api/films')) {
        return Promise.resolve(
          jsonResponse(
            JSON.stringify({
              data: [
                { slug: 'kodak-tri-x-400', brand: 'Kodak', name: 'Tri-X 400' },
              ],
            })
          )
        );
      }
      if (url.includes('/api/developers')) {
        return Promise.resolve(
          jsonResponse(
            JSON.stringify({
              data: [
                {
                  slug: 'ilford-perceptol',
                  name: 'Perceptol',
                  manufacturer: 'Ilford',
                },
              ],
            })
          )
        );
      }
      if (url.includes('/api/combinations')) {
        return Promise.resolve(
          jsonResponse(
            JSON.stringify({
              data: [
                {
                  uuid: 'abc-123',
                  time_minutes: 13,
                  temperature_celsius: 20,
                  shooting_iso: 400,
                  push_pull: 0,
                },
              ],
            })
          )
        );
      }
      return Promise.resolve(jsonResponse(JSON.stringify({ data: [] })));
    });

    const res = await handler(
      makeRequest({
        route: '/development',
        film: 'kodak-tri-x-400',
        developer: 'ilford-perceptol',
      })
    );
    expect(res.status).toBe(200);
  });

  it('renders recipe card with film only (no developer)', async () => {
    stubFetch(() =>
      Promise.resolve(jsonResponse(JSON.stringify({ data: [] })))
    );

    const res = await handler(
      makeRequest({ route: '/development', film: 'kodak-tri-x-400' })
    );
    expect(res.status).toBe(200);
  });

  it('renders developer-only card', async () => {
    stubFetch(() =>
      Promise.resolve(
        jsonResponse(
          JSON.stringify({
            data: [
              {
                slug: 'ilford-perceptol',
                name: 'Perceptol',
                manufacturer: 'Ilford',
                dilutions: [
                  { id: 1, name: 'Stock', ratio: '1+0' },
                  { id: 2, name: '1+1', ratio: '1+1' },
                ],
              },
            ],
          })
        )
      )
    );

    const res = await handler(
      makeRequest({ route: '/development', developer: 'ilford-perceptol' })
    );
    expect(res.status).toBe(200);
  });

  it('handles API timeout gracefully', async () => {
    // Stall every upstream lookup until the handler's own 3s timeout aborts it.
    stubFetch(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          const timer = setTimeout(() => {}, 30_000);
          init?.signal?.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(
              new DOMException('The operation was aborted.', 'AbortError')
            );
          });
        })
    );

    const res = await handler(
      makeRequest({
        route: '/development',
        film: 'kodak-tri-x-400',
        developer: 'ilford-perceptol',
      })
    );
    expect(res.status).toBe(200);
  }, 10_000);
});

describe('og handler - film filters', () => {
  it('renders card for single color filter', async () => {
    const res = await handler(makeRequest({ route: '/films', color: 'bw' }));
    expect(res.status).toBe(200);
  });

  it('renders card for single brand filter', async () => {
    const res = await handler(makeRequest({ route: '/films', brand: 'Kodak' }));
    expect(res.status).toBe(200);
  });

  it('renders card for single iso filter', async () => {
    const res = await handler(makeRequest({ route: '/films', iso: '400' }));
    expect(res.status).toBe(200);
  });

  it('renders card for combined filters', async () => {
    const res = await handler(
      makeRequest({ route: '/films', color: 'bw', brand: 'Kodak', iso: '400' })
    );
    expect(res.status).toBe(200);
  });

  it('renders card with status subtitle', async () => {
    const res = await handler(
      makeRequest({ route: '/films', color: 'bw', status: 'active' })
    );
    expect(res.status).toBe(200);
  });

  it('falls through to generic card when status=all and no other filters', async () => {
    const res = await handler(makeRequest({ route: '/films', status: 'all' }));
    // Should still return 200 — just uses the generic /films card
    expect(res.status).toBe(200);
  });

  it('film slug takes priority over filters', async () => {
    const res = await handler(
      makeRequest({
        route: '/films',
        film: 'kodak-tri-x-400',
        color: 'bw',
        brand: 'Kodak',
      })
    );
    // film slug present → film detail card, not filter card
    expect(res.status).toBe(200);
  });
});

describe('og handler - unknown query params', () => {
  it('returns 400 for a request carrying an unknown param', async () => {
    const res = await handler(makeRequest({ route: '/', cachebust: 'abc123' }));

    expect(res.status).toBe(400);
  });

  it('does not call fetch when an unknown param is present', async () => {
    const fetchMock = stubFetch(() =>
      Promise.resolve(jsonResponse(EMPTY_LIST))
    );

    await handler(makeRequest({ route: '/', cachebust: 'abc123' }));

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sets a long cache-control header on the 400 so the CDN absorbs repeats', async () => {
    const res = await handler(makeRequest({ route: '/', cachebust: 'abc123' }));

    expect(res.headers.get('cache-control')).toContain('s-maxage=86400');
  });

  it('still returns 200 for a request with only legitimate params', async () => {
    const res = await handler(
      makeRequest({ route: '/films', film: 'kodak-tri-x-400' })
    );

    expect(res.status).toBe(200);
  });

  it('returns 400 for a duplicated allowed param', async () => {
    const fetchMock = stubFetch(() =>
      Promise.resolve(jsonResponse(EMPTY_LIST))
    );

    const url = new URL('https://dorkroom.art/api/og');
    url.searchParams.set('route', '/');
    url.searchParams.append('film', 'a');
    url.searchParams.append('film', 'b');

    const res = await handler(new Request(url.toString()));

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('og handler - border preset', () => {
  // 35mm on 8x10, landscape, minBorder=0.5 → encodes to this string
  const validPreset =
    'MzVtbSUyMG9uJTIwOHgxMCUyQyUyMDZ4OWluLTAtMi01MC0wLTEwMDAwLTg';

  it('renders custom card for valid encoded preset', async () => {
    const res = await handler(
      makeRequest({ route: '/border', preset: validPreset })
    );
    expect(res.status).toBe(200);
  });

  it('falls through to generic card for invalid preset string', async () => {
    const res = await handler(
      makeRequest({ route: '/border', preset: 'AAAA' })
    );
    // Still returns 200 — just the generic /border card
    expect(res.status).toBe(200);
  });

  it('renders generic card when no preset param', async () => {
    const res = await handler(makeRequest({ route: '/border' }));
    expect(res.status).toBe(200);
  });
});
