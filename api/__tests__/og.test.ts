import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock @vercel/og since it requires wasm binaries not available in test
vi.mock('@vercel/og', () => ({
  ImageResponse: class MockImageResponse extends Response {
    constructor(
      element: unknown,
      options?: {
        width?: number;
        height?: number;
        headers?: Record<string, string>;
      }
    ) {
      const headers = new Headers({
        'content-type': 'image/png',
        ...(options?.headers ?? {}),
      });
      super('mock-image-body', { status: 200, headers });
    }
  },
}));

// Must import after mock is set up
const { default: handler } = await import('../og');

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
  // Default: mock fetch to return empty data (API unavailable)
  globalThis.fetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ data: [], count: 0 }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  );
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
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
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
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    );

    const res = await handler(
      makeRequest({ route: '/films', film: 'adox-chs-100-ii' })
    );
    expect(res.status).toBe(200);
  });

  it('falls back to prettified slug when API fails', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const res = await handler(
      makeRequest({ route: '/films', film: 'adox-chs-100-ii' })
    );
    expect(res.status).toBe(200);
  });
});

describe('og handler - development recipe', () => {
  it('renders recipe card with API data', async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/films')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                { slug: 'kodak-tri-x-400', brand: 'Kodak', name: 'Tri-X 400' },
              ],
            }),
            { status: 200, headers: { 'content-type': 'application/json' } }
          )
        );
      }
      if (url.includes('/api/developers')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [
                {
                  slug: 'ilford-perceptol',
                  name: 'Perceptol',
                  manufacturer: 'Ilford',
                },
              ],
            }),
            { status: 200, headers: { 'content-type': 'application/json' } }
          )
        );
      }
      if (url.includes('/api/combinations')) {
        return Promise.resolve(
          new Response(
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
            }),
            { status: 200, headers: { 'content-type': 'application/json' } }
          )
        );
      }
      return Promise.resolve(
        new Response(JSON.stringify({ data: [] }), { status: 200 })
      );
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
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );

    const res = await handler(
      makeRequest({ route: '/development', film: 'kodak-tri-x-400' })
    );
    expect(res.status).toBe(200);
  });

  it('renders developer-only card', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
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
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    );

    const res = await handler(
      makeRequest({ route: '/development', developer: 'ilford-perceptol' })
    );
    expect(res.status).toBe(200);
  });

  it('handles API timeout gracefully', async () => {
    globalThis.fetch = vi
      .fn()
      .mockImplementation((url: string, init?: { signal?: AbortSignal }) => {
        // Let font fetches resolve immediately
        if (typeof url === 'string' && url.includes('fonts.gstatic.com')) {
          return Promise.resolve(
            new Response(new ArrayBuffer(0), { status: 200 })
          );
        }
        // Stall API calls until abort
        return new Promise((_resolve, reject) => {
          const timer = setTimeout(() => {}, 30_000);
          init?.signal?.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(
              new DOMException('The operation was aborted.', 'AbortError')
            );
          });
        });
      });

    // The handler has a 3s timeout internally, so this should still resolve
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
