import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from 'vitest';
import { ACCENT_TONE_HEX, ROUTE_TITLES } from '../../utils/routeMetadata';
import handler, {
  clearFontCache,
  getDilutionLabel,
  getRouteAccent,
  getRouteIcon,
  loadFontData,
  lookupCombination,
} from '../og';

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

/** UUID-shaped, as `meta.ts` only ever emits; a malformed `recipe` is ignored. */
const TARGET_UUID = '6f1c2d3e-4a5b-4c6d-8e7f-901234567890';

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

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/**
 * `ImageResponse` answers 200 + image/png before anything is drawn and renders
 * lazily, so a status check passes even when the render is broken. Reading the
 * body forces the render; the PNG signature proves it produced an image.
 */
async function pngBytes(res: Response): Promise<Buffer> {
  expect(res.status).toBe(200);
  const bytes = Buffer.from(await res.arrayBuffer());
  expect(Array.from(bytes.subarray(0, PNG_MAGIC.length))).toEqual(PNG_MAGIC);
  return bytes;
}

/** Render `params` against the default stub (every upstream lookup is empty). */
async function renderCard(params?: Record<string, string>): Promise<Buffer> {
  return pngBytes(await handler(makeRequest(params)));
}

const originalFetch = globalThis.fetch;

beforeEach(() => {
  clearFontCache();
  // `bun run` loads the repo .env, which may carry a real root key. Keep the
  // limiter unconfigured unless a test opts in.
  vi.stubEnv('UNKEY_ROOT_KEY', '');
  // Default: every upstream lookup answers empty (API unavailable).
  stubFetch(() => Promise.resolve(jsonResponse(EMPTY_LIST)));
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.unstubAllEnvs();
});

describe('og handler - static routes', () => {
  it('renders a PNG for a known route', async () => {
    await renderCard({ route: '/border' });
  });

  it('sets cache-control header', async () => {
    const res = await handler(makeRequest({ route: '/border' }));
    expect(res.headers.get('cache-control')).toContain('s-maxage=86400');
  });

  it('draws a different card for each page', async () => {
    const [home, border, settings] = await Promise.all([
      renderCard({ route: '/' }),
      renderCard({ route: '/border' }),
      renderCard({ route: '/settings' }),
    ]);

    expect(border.equals(home)).toBe(false);
    expect(settings.equals(home)).toBe(false);
    expect(settings.equals(border)).toBe(false);
  });

  it('defaults to the home card when there is no route param', async () => {
    const [bare, home] = await Promise.all([
      renderCard(),
      renderCard({ route: '/' }),
    ]);

    expect(bare.equals(home)).toBe(true);
  });

  it('renders an unknown route as a generic card without any upstream lookup', async () => {
    const fetchMock = stubFetch(() =>
      Promise.resolve(jsonResponse(EMPTY_LIST))
    );

    await renderCard({ route: '/some-unknown-page' });

    expect(upstreamCalls(fetchMock)).toEqual([]);
  });

  it('selects a dedicated icon and accent for /settings instead of the home fallback', () => {
    const settingsIcon = getRouteIcon('/settings');

    expect(settingsIcon).not.toBeNull();
    expect(settingsIcon).not.toEqual(getRouteIcon('/'));
    // An unknown route takes the home treatment; /settings must not.
    expect(settingsIcon).not.toEqual(getRouteIcon('/some-unknown-page'));
    expect(getRouteAccent('/settings')).not.toBe(getRouteAccent('/'));
  });

  it('colours a page with its manifest accent tone (dark theme value)', () => {
    expect(getRouteAccent('/border')).toBe(ACCENT_TONE_HEX.indigo);
    expect(getRouteAccent('/lenses')).toBe(ACCENT_TONE_HEX.emerald);
    expect(getRouteAccent('/negative-inverter')).toBe(ACCENT_TONE_HEX.violet);
    expect(getRouteAccent('/films')).toBe(ACCENT_TONE_HEX.cyan);
    // Pages without a manifest tone keep their fixed colour.
    expect(getRouteAccent('/')).toBe('#6ef3a4');
    expect(getRouteAccent('/docs')).toBe('#c4b5fd');
  });
});

describe('og handler - film detail', () => {
  const ADOX = {
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
  };

  it('looks the film up and draws its API data on the card', async () => {
    const fetchMock = stubFetch(() =>
      Promise.resolve(jsonResponse(JSON.stringify(ADOX)))
    );
    const withData = await renderCard({
      route: '/films',
      film: 'adox-chs-100-ii',
    });

    expect(upstreamCalls(fetchMock)).toEqual([
      expect.stringContaining('/api/films?slug=adox-chs-100-ii'),
    ]);

    // Same slug, nothing returned: the card shows the prettified slug instead
    stubFetch(() => Promise.resolve(jsonResponse(EMPTY_LIST)));
    const slugOnly = await renderCard({
      route: '/films',
      film: 'adox-chs-100-ii',
    });
    expect(withData.equals(slugOnly)).toBe(false);
  });

  it('falls back to the prettified slug when the API fails', async () => {
    const empty = await renderCard({
      route: '/films',
      film: 'adox-chs-100-ii',
    });

    const fetchMock = stubFetch(() =>
      Promise.reject(new Error('Network error'))
    );
    const failed = await renderCard({
      route: '/films',
      film: 'adox-chs-100-ii',
    });

    expect(upstreamCalls(fetchMock)).toHaveLength(1);
    expect(failed.equals(empty)).toBe(true);
  });
});

/**
 * Mirrors the upstream pagination contract in
 * `supabase/functions/combinations/index.ts`: `page` is honoured only when the
 * page size is sent as `count`. A `limit` request always yields page 1, which
 * is exactly the trap #252's first fix fell into.
 */
function requestedPage(url: string): number {
  const params = new URL(url).searchParams;
  if (!params.has('count')) return 1;
  return Number.parseInt(params.get('page') ?? '1', 10);
}

describe('og handler - development recipe', () => {
  const FILM_ROW = {
    slug: 'kodak-tri-x-400',
    brand: 'Kodak',
    name: 'Tri-X 400',
  };
  const DEVELOPER_ROW = {
    slug: 'ilford-perceptol',
    name: 'Perceptol',
    manufacturer: 'Ilford',
    dilutions: [
      { id: 1, name: 'Stock', ratio: '1+0' },
      { id: 2, name: '1+1', ratio: '1+1' },
    ],
  };

  /** Answers the film and developer lookups with real rows, nothing else. */
  function stubKnownFilmAndDeveloper(): Mock<typeof fetch> {
    return stubFetch((url) => {
      if (url.includes('/api/films')) {
        return Promise.resolve(
          jsonResponse(JSON.stringify({ data: [FILM_ROW] }))
        );
      }
      if (url.includes('/api/developers')) {
        return Promise.resolve(
          jsonResponse(JSON.stringify({ data: [DEVELOPER_ROW] }))
        );
      }
      return Promise.resolve(jsonResponse(EMPTY_LIST));
    });
  }

  it('looks up the film and developer, but no combination, for the search card', async () => {
    const fetchMock = stubKnownFilmAndDeveloper();
    const params = {
      route: '/development',
      film: 'kodak-tri-x-400',
      developer: 'ilford-perceptol',
    };

    const withData = await renderCard(params);

    const calls = upstreamCalls(fetchMock);
    expect(calls).toHaveLength(2);
    expect(calls).toEqual(
      expect.arrayContaining([
        expect.stringContaining('/api/films?slug=kodak-tri-x-400'),
        expect.stringContaining('/api/developers?slug=ilford-perceptol'),
      ])
    );

    stubFetch(() => Promise.resolve(jsonResponse(EMPTY_LIST)));
    expect(withData.equals(await renderCard(params))).toBe(false);
  });

  it('looks up only the film for a film-only card', async () => {
    const fetchMock = stubKnownFilmAndDeveloper();

    await renderCard({ route: '/development', film: 'kodak-tri-x-400' });

    expect(upstreamCalls(fetchMock)).toEqual([
      expect.stringContaining('/api/films?slug=kodak-tri-x-400'),
    ]);
  });

  it('looks up only the developer for a developer-only card, and lists its dilutions', async () => {
    const fetchMock = stubKnownFilmAndDeveloper();
    const params = { route: '/development', developer: 'ilford-perceptol' };

    const withData = await renderCard(params);

    expect(upstreamCalls(fetchMock)).toEqual([
      expect.stringContaining('/api/developers?slug=ilford-perceptol'),
    ]);

    stubFetch(() => Promise.resolve(jsonResponse(EMPTY_LIST)));
    expect(withData.equals(await renderCard(params))).toBe(false);
  });

  it('handles API timeout gracefully', async () => {
    // Stall every upstream lookup until the handler's own 3s timeout aborts it.
    const fetchMock = stubFetch(
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

    const stalled = await renderCard({
      route: '/development',
      film: 'kodak-tri-x-400',
      developer: 'ilford-perceptol',
    });

    // Both lookups were attempted and abandoned; the card is the slug-only one
    expect(upstreamCalls(fetchMock)).toHaveLength(2);
    stubFetch(() => Promise.resolve(jsonResponse(EMPTY_LIST)));
    const slugOnly = await renderCard({
      route: '/development',
      film: 'kodak-tri-x-400',
      developer: 'ilford-perceptol',
    });
    expect(stalled.equals(slugOnly)).toBe(true);
  }, 10_000);

  it('pages through /api/combinations when the recipe uuid is not on page 1', async () => {
    const combinationUrls: string[] = [];
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
        combinationUrls.push(url);
        if (requestedPage(url) === 2) {
          return Promise.resolve(
            jsonResponse(
              JSON.stringify({
                data: [
                  {
                    uuid: TARGET_UUID,
                    time_minutes: 13,
                    temperature_celsius: 20,
                    shooting_iso: 400,
                    push_pull: 0,
                  },
                ],
                count: 51,
              })
            )
          );
        }
        return Promise.resolve(
          jsonResponse(
            JSON.stringify({
              data: Array.from({ length: 50 }, (_, i) => ({
                uuid: `other-${i}`,
                time_minutes: 1,
                temperature_celsius: 20,
                shooting_iso: 400,
              })),
              count: 51,
            })
          )
        );
      }
      return Promise.resolve(jsonResponse(JSON.stringify({ data: [] })));
    });

    await pngBytes(
      await handler(
        makeRequest({
          route: '/development',
          film: 'kodak-tri-x-400',
          developer: 'ilford-perceptol',
          recipe: TARGET_UUID,
        })
      )
    );

    expect(combinationUrls.some((url) => requestedPage(url) === 2)).toBe(true);
  });
});

describe('getDilutionLabel', () => {
  it('prefers name, then dilution, then ratio', () => {
    expect(getDilutionLabel({ id: 1, name: '1+1', dilution: '1:1' })).toBe(
      '1+1'
    );
    expect(getDilutionLabel({ id: 2, dilution: '1+9' })).toBe('1+9');
    expect(getDilutionLabel({ id: 3, ratio: '1:14' })).toBe('1:14');
  });

  it('returns null for a dilution with no label', () => {
    expect(getDilutionLabel({ id: 4 })).toBeNull();
  });

  it('skips whitespace-only fields and trims the label', () => {
    expect(getDilutionLabel({ id: 5, name: '  ', dilution: ' 1+9 ' })).toBe(
      '1+9'
    );
    expect(
      getDilutionLabel({ id: 6, name: ' ', dilution: '', ratio: ' ' })
    ).toBeNull();
  });

  it('skips non-string fields instead of throwing', () => {
    expect(getDilutionLabel({ id: 7, name: 25, dilution: '1+4' })).toBe('1+4');
    expect(
      getDilutionLabel({ id: 8, name: null, dilution: { v: 1 }, ratio: 1 })
    ).toBeNull();
  });
});

describe('lookupCombination', () => {
  function combinationsResponse(
    data: Array<{ uuid: string; time_minutes: number }>,
    count: number
  ): Response {
    return jsonResponse(
      JSON.stringify({
        data: data.map((c) => ({
          ...c,
          temperature_celsius: 20,
          shooting_iso: 400,
        })),
        count,
      })
    );
  }

  it('returns the row when the uuid is on page 1', async () => {
    stubFetch(() =>
      Promise.resolve(
        combinationsResponse([{ uuid: 'target', time_minutes: 10 }], 1)
      )
    );

    const result = await lookupCombination(
      'kodak-tri-x-400',
      'ilford-perceptol',
      'target'
    );

    expect(result?.time_minutes).toBe(10);
  });

  it('fetches page 2 and returns the row when the uuid is not on page 1', async () => {
    const requestedUrls: string[] = [];
    stubFetch((url) => {
      requestedUrls.push(url);
      if (requestedPage(url) === 2) {
        return Promise.resolve(
          combinationsResponse([{ uuid: 'target', time_minutes: 20 }], 75)
        );
      }
      const page1 = Array.from({ length: 50 }, (_, i) => ({
        uuid: `other-${i}`,
        time_minutes: 1,
      }));
      return Promise.resolve(combinationsResponse(page1, 75));
    });

    const result = await lookupCombination(
      'kodak-tri-x-400',
      'ilford-perceptol',
      'target'
    );

    expect(result?.time_minutes).toBe(20);
    expect(requestedUrls.some((url) => requestedPage(url) === 2)).toBe(true);
    expect(requestedUrls.every((url) => url.includes('count=50'))).toBe(true);
  });

  it('returns null, never the first row, when the uuid is absent', async () => {
    stubFetch((url) => {
      if (requestedPage(url) === 2) {
        const page2 = Array.from({ length: 10 }, (_, i) => ({
          uuid: `other-page2-${i}`,
          time_minutes: 2,
        }));
        return Promise.resolve(combinationsResponse(page2, 60));
      }
      const page1 = Array.from({ length: 50 }, (_, i) => ({
        uuid: `other-page1-${i}`,
        time_minutes: 1,
      }));
      return Promise.resolve(combinationsResponse(page1, 60));
    });

    const result = await lookupCombination(
      'kodak-tri-x-400',
      'ilford-perceptol',
      'target'
    );

    expect(result).toBeNull();
  });

  it('stops at the page cap and returns null when the uuid is never found', async () => {
    const fetchMock = stubFetch((url) => {
      const page = Array.from({ length: 50 }, (_, i) => ({
        uuid: `${url}-${i}`,
        time_minutes: 1,
      }));
      // count far exceeds what MAX_COMBINATION_PAGES * 50 rows can cover.
      return Promise.resolve(combinationsResponse(page, 10_000));
    });

    const result = await lookupCombination(
      'kodak-tri-x-400',
      'ilford-perceptol',
      'target'
    );

    expect(result).toBeNull();
    // 10 combination pages (MAX_COMBINATION_PAGES) — no font requests here.
    expect(fetchMock).toHaveBeenCalledTimes(10);
  });

  it('requests limit=1 and returns the first row when no uuid is given', async () => {
    const requestedUrls: string[] = [];
    stubFetch((url) => {
      requestedUrls.push(url);
      return Promise.resolve(
        combinationsResponse([{ uuid: 'first', time_minutes: 5 }], 1)
      );
    });

    const result = await lookupCombination(
      'kodak-tri-x-400',
      'ilford-perceptol'
    );

    expect(result?.time_minutes).toBe(5);
    expect(requestedUrls.every((url) => url.includes('limit=1'))).toBe(true);
    expect(requestedUrls.some((url) => url.includes('page='))).toBe(false);
  });
});

describe('og handler - film filters', () => {
  it('draws a filter card, not the generic /films card, with no upstream lookup', async () => {
    const fetchMock = stubFetch(() =>
      Promise.resolve(jsonResponse(EMPTY_LIST))
    );
    const generic = await renderCard({ route: '/films' });

    const byColor = await renderCard({ route: '/films', color: 'bw' });
    const byBrand = await renderCard({ route: '/films', brand: 'Kodak' });
    const byIso = await renderCard({ route: '/films', iso: '400' });

    expect(byColor.equals(generic)).toBe(false);
    expect(byBrand.equals(generic)).toBe(false);
    expect(byIso.equals(generic)).toBe(false);
    // Each filter names itself on the card
    expect(byColor.equals(byBrand)).toBe(false);
    expect(byBrand.equals(byIso)).toBe(false);
    expect(upstreamCalls(fetchMock)).toEqual([]);
  });

  it('adds every filter in a combined card', async () => {
    const byColor = await renderCard({ route: '/films', color: 'bw' });
    const combined = await renderCard({
      route: '/films',
      color: 'bw',
      brand: 'Kodak',
      iso: '400',
    });

    expect(combined.equals(byColor)).toBe(false);
  });

  it('adds a status subtitle', async () => {
    const byColor = await renderCard({ route: '/films', color: 'bw' });
    const withStatus = await renderCard({
      route: '/films',
      color: 'bw',
      status: 'active',
    });

    expect(withStatus.equals(byColor)).toBe(false);
  });

  it('falls through to the generic /films card for status=all with no other filter', async () => {
    const generic = await renderCard({ route: '/films' });
    const statusAll = await renderCard({ route: '/films', status: 'all' });

    expect(statusAll.equals(generic)).toBe(true);
  });

  it('film slug takes priority over filters', async () => {
    const fetchMock = stubFetch(() =>
      Promise.resolve(jsonResponse(EMPTY_LIST))
    );
    const filmOnly = await renderCard({
      route: '/films',
      film: 'kodak-tri-x-400',
    });
    const filterOnly = await renderCard({
      route: '/films',
      color: 'bw',
      brand: 'Kodak',
    });
    fetchMock.mockClear();

    const both = await renderCard({
      route: '/films',
      film: 'kodak-tri-x-400',
      color: 'bw',
      brand: 'Kodak',
    });

    expect(upstreamCalls(fetchMock)).toEqual([
      expect.stringContaining('/api/films?slug=kodak-tri-x-400'),
    ]);
    expect(both.equals(filmOnly)).toBe(true);
    expect(both.equals(filterOnly)).toBe(false);
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

  it('still renders a request with only legitimate params', async () => {
    await renderCard({ route: '/films', film: 'kodak-tri-x-400' });
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

  it('draws a custom card for a valid encoded preset', async () => {
    const generic = await renderCard({ route: '/border' });
    const custom = await renderCard({ route: '/border', preset: validPreset });

    expect(custom.equals(generic)).toBe(false);
  });

  it('falls through to the generic card for an invalid preset string', async () => {
    const generic = await renderCard({ route: '/border' });
    const invalid = await renderCard({ route: '/border', preset: 'AAAA' });

    expect(invalid.equals(generic)).toBe(true);
  });
});

describe('og handler - shared calculator links', () => {
  const shares: [string, Record<string, string>][] = [
    ['/border', { paper: '8x10', ratio: '3:2', border: '0.5' }],
    ['/lenses', { focal: '80', from: 'film-6x6', to: 'full-frame' }],
    ['/resize', { fromW: '8', fromL: '10', toW: '11', toL: '14', time: '12' }],
    ['/resize', { height: 'true', fromH: '20', toH: '30', time: '10' }],
    [
      '/mat',
      { outerW: '16', outerH: '20', artW: '11', artH: '14', reveal: '1/4' },
    ],
    ['/mat', { outerW: '16', outerH: '20', artW: '', artH: '' }],
    ['/stops', { time: '10', stops: '1' }],
    ['/reciprocity', { film: 'tri-x', time: '30s' }],
    ['/exposure', { aperture: '16', shutter: '1/125', iso: '100' }],
  ];

  it.each(shares)(
    'draws a share card for %s, not the generic one, with no upstream lookup',
    async (route, params) => {
      const fetchMock = stubFetch(() =>
        Promise.resolve(jsonResponse(EMPTY_LIST))
      );
      const generic = await renderCard({ route });
      const share = await renderCard({ route, ...params });

      expect(share.equals(generic)).toBe(false);
      expect(
        fetchMock.mock.calls.filter(([input]) => !isFontRequest(String(input)))
      ).toHaveLength(0);
    }
  );

  it('draws different cards for different values', async () => {
    const [a, b] = await Promise.all([
      renderCard({ route: '/lenses', focal: '80' }),
      renderCard({ route: '/lenses', focal: '50' }),
    ]);

    expect(a.equals(b)).toBe(false);
  });

  it.each([
    ['/lenses', { focal: 'abc' }],
    ['/lenses', { from: 'not-a-format' }],
    ['/stops', { time: '-5' }],
    ['/mat', { outerW: '8', left: '4', right: '4' }],
    ['/exposure', { aperture: '0' }],
  ])(
    'falls back to the generic card for %s when no value is usable',
    async (route, params) => {
      const generic = await renderCard({ route });
      const invalid = await renderCard({ route, ...params });

      expect(invalid.equals(generic)).toBe(true);
    }
  );

  it('rejects another calculator’s param with a 400', async () => {
    const res = await handler(
      makeRequest({ route: '/stops', time: '10', focal: '80' })
    );
    expect(res.status).toBe(400);
  });

  it('rejects link params on a non-calculator route', async () => {
    const res = await handler(makeRequest({ route: '/films', focal: '80' }));
    expect(res.status).toBe(400);
  });

  it('rejects the share marker, which meta.ts never puts in a card URL', async () => {
    const res = await handler(
      makeRequest({ route: '/lenses', focal: '80', source: 'share' })
    );
    expect(res.status).toBe(400);
  });

  it('keeps the long success cache header', async () => {
    const res = await handler(makeRequest({ route: '/lenses', focal: '80' }));
    expect(res.headers.get('cache-control')).toContain('s-maxage=86400');
  });
});

describe('loadFontData - module-scope cache', () => {
  const FONT = 'https://fonts.gstatic.com/s/test/font.ttf';

  it('fetches a font once and reuses it across invocations', async () => {
    const fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(new Response(new Uint8Array([1, 2, 3])))
    );
    globalThis.fetch = fetchMock;

    const first = await loadFontData(FONT);
    const second = await loadFontData(FONT);

    expect(first?.byteLength).toBe(3);
    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('shares one in-flight download between concurrent callers', async () => {
    const fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(new Response(new Uint8Array([1])))
    );
    globalThis.fetch = fetchMock;

    await Promise.all([loadFontData(FONT), loadFontData(FONT)]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not cache a failed download', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(new Response(new Uint8Array([7])));
    globalThis.fetch = fetchMock;

    expect(await loadFontData(FONT)).toBeNull();
    expect(await loadFontData(FONT)).toBeNull();
    const data = await loadFontData(FONT);

    expect(data?.byteLength).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

/** Every non-font URL the handler fetched. */
function upstreamCalls(fetchMock: Mock<typeof fetch>): string[] {
  return fetchMock.mock.calls
    .map(([input]) => String(input))
    .filter((url) => !isFontRequest(url));
}

describe('og handler - param validation before upstream work', () => {
  it.each([
    ['uppercase', 'Kodak-Tri-X'],
    ['path characters', '../../stats'],
    ['query smuggling', 'x&limit=1000'],
    ['over-long', 'a'.repeat(101)],
  ])(
    'skips the film lookup for a malformed slug (%s)',
    async (_label, film) => {
      const fetchMock = stubFetch(() =>
        Promise.resolve(jsonResponse(EMPTY_LIST))
      );

      await pngBytes(await handler(makeRequest({ route: '/films', film })));

      expect(upstreamCalls(fetchMock)).toEqual([]);
    }
  );

  it('skips the developer lookup for a malformed developer slug', async () => {
    const fetchMock = stubFetch(() =>
      Promise.resolve(jsonResponse(EMPTY_LIST))
    );

    await handler(
      makeRequest({ route: '/development', developer: 'Not A Slug' })
    );

    expect(upstreamCalls(fetchMock)).toEqual([]);
  });

  it('ignores a malformed recipe instead of paging /api/combinations', async () => {
    const fetchMock = stubFetch(() =>
      Promise.resolve(jsonResponse(EMPTY_LIST))
    );

    await handler(
      makeRequest({
        route: '/development',
        film: 'kodak-tri-x-400',
        developer: 'ilford-perceptol',
        recipe: 'not-a-uuid',
      })
    );

    const calls = upstreamCalls(fetchMock);
    expect(calls.some((url) => url.includes('/api/combinations'))).toBe(false);
    expect(calls).toHaveLength(2); // film + developer lookups only
  });

  it('still looks up a well-formed slug', async () => {
    const fetchMock = stubFetch(() =>
      Promise.resolve(jsonResponse(EMPTY_LIST))
    );

    await handler(makeRequest({ route: '/films', film: 'kodak-tri-x-400' }));

    expect(upstreamCalls(fetchMock)).toEqual([
      expect.stringContaining('/api/films?slug=kodak-tri-x-400'),
    ]);
  });

  it('does no upstream work for an unknown route, even with slugs attached', async () => {
    const fetchMock = stubFetch(() =>
      Promise.resolve(jsonResponse(EMPTY_LIST))
    );

    await pngBytes(
      await handler(
        makeRequest({
          route: '/not-a-page',
          film: 'kodak-tri-x-400',
          developer: 'ilford-perceptol',
        })
      )
    );

    expect(upstreamCalls(fetchMock)).toEqual([]);
  });

  it('keeps the long success cache header', async () => {
    const res = await handler(
      makeRequest({ route: '/films', film: 'kodak-tri-x-400' })
    );

    // @vercel/og prepends its own defaults; the CDN honours s-maxage.
    expect(res.headers.get('cache-control')).toContain(
      'public, s-maxage=86400, stale-while-revalidate=3600'
    );
  });
});

const UNKEY_URL = 'https://api.unkey.com/v2/ratelimit.limit';

/**
 * Stub fetch with a fake Unkey limiter in front of the default upstream
 * stub. `unkey` answers the rate-limit call; everything else behaves as in
 * `stubFetch`.
 */
function stubFetchWithUnkey(
  unkey: (init?: RequestInit) => Promise<Response>
): Mock<typeof fetch> {
  return stubFetch((url, init) =>
    url === UNKEY_URL ? unkey(init) : Promise.resolve(jsonResponse(EMPTY_LIST))
  );
}

function unkeyAnswer(success: boolean): Promise<Response> {
  return Promise.resolve(
    jsonResponse(
      JSON.stringify({
        meta: { requestId: 'req_test' },
        data: {
          limit: 30,
          remaining: success ? 29 : 0,
          reset: Date.now() + 42_000,
          success,
        },
      })
    )
  );
}

describe('og handler - rate limiting', () => {
  beforeEach(() => {
    vi.stubEnv('UNKEY_ROOT_KEY', 'unkey_test_root');
    vi.stubEnv('UNKEY_API_ID', 'api_test');
    vi.stubEnv('UNKEY_ANON_NAMESPACE', '');
  });

  function ogRequest(params: Record<string, string>, ip = '203.0.113.7') {
    const req = makeRequest(params);
    req.headers.set('x-real-ip', ip);
    return req;
  }

  it('checks dynamic cards against the anonymous namespace, keyed by IP', async () => {
    const fetchMock = stubFetchWithUnkey(() => unkeyAnswer(true));

    await pngBytes(
      await handler(ogRequest({ route: '/films', film: 'kodak-tri-x-400' }))
    );

    const unkeyCall = fetchMock.mock.calls.find(
      ([input]) => String(input) === UNKEY_URL
    );
    expect(unkeyCall).toBeDefined();
    const init = unkeyCall?.[1];
    expect(new Headers(init?.headers).get('authorization')).toBe(
      'Bearer unkey_test_root'
    );
    expect(JSON.parse(String(init?.body))).toEqual({
      namespace: 'api_test-anonymous',
      identifier: 'og:203.0.113.7',
      limit: 30,
      duration: 60_000,
    });
  });

  it('never consults the limiter for a static page card', async () => {
    const fetchMock = stubFetchWithUnkey(() => unkeyAnswer(false));

    for (const params of [{}, { route: '/' }, { route: '/border' }]) {
      await pngBytes(await handler(ogRequest(params)));
    }

    expect(fetchMock.mock.calls.map(([input]) => String(input))).not.toContain(
      UNKEY_URL
    );
  });

  it('limits an unknown route and a known route with a trailing slash', async () => {
    stubFetchWithUnkey(() => unkeyAnswer(false));

    expect((await handler(ogRequest({ route: '/random-123' }))).status).toBe(
      307
    );
    expect((await handler(ogRequest({ route: '/films/' }))).status).toBe(307);
  });

  it('redirects an over-limit request to the static card, uncached, with no upstream work', async () => {
    const fetchMock = stubFetchWithUnkey(() => unkeyAnswer(false));

    const res = await handler(
      ogRequest({
        route: '/development',
        film: 'kodak-tri-x-400',
        developer: 'ilford-perceptol',
      })
    );

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(
      'https://dorkroom.art/api/og?route=%2Fdevelopment'
    );
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(Number(res.headers.get('retry-after'))).toBeGreaterThan(0);
    expect(res.headers.get('x-ratelimit-remaining')).toBe('0');
    expect(fetchMock.mock.calls.map(([input]) => String(input))).toEqual([
      UNKEY_URL,
    ]);
  });

  it('sends an over-limit calculator link to that calculator’s static card', async () => {
    stubFetchWithUnkey(() => unkeyAnswer(false));

    const res = await handler(
      ogRequest({ route: '/lenses', focal: '80', from: 'film-6x6' })
    );

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(
      'https://dorkroom.art/api/og?route=%2Flenses'
    );
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('sends an over-limit unknown route to the home card', async () => {
    stubFetchWithUnkey(() => unkeyAnswer(false));

    const res = await handler(ogRequest({ route: '/nope', film: 'x' }));

    expect(res.headers.get('location')).toBe('https://dorkroom.art/api/og');
  });

  it.each([
    [
      'a non-2xx answer',
      () => Promise.resolve(new Response('', { status: 500 })),
    ],
    ['a network failure', () => Promise.reject(new TypeError('fetch failed'))],
    ['an unexpected body', () => Promise.resolve(jsonResponse('{"data":{}}'))],
  ])('fails open on %s from Unkey', async (_label, answer) => {
    stubFetchWithUnkey(answer);

    await pngBytes(
      await handler(ogRequest({ route: '/films', film: 'kodak-tri-x-400' }))
    );
  });

  it('skips the limiter when Unkey is not configured', async () => {
    vi.stubEnv('UNKEY_ROOT_KEY', '');
    const fetchMock = stubFetchWithUnkey(() => unkeyAnswer(false));

    await pngBytes(
      await handler(ogRequest({ route: '/films', film: 'kodak-tri-x-400' }))
    );

    expect(fetchMock.mock.calls.map(([input]) => String(input))).not.toContain(
      UNKEY_URL
    );
  });

  it('does not rate limit the cheap 400 for unknown params', async () => {
    const fetchMock = stubFetchWithUnkey(() => unkeyAnswer(false));

    const res = await handler(ogRequest({ route: '/', cachebust: '1' }));

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('getRouteIcon coverage', () => {
  it.each(Object.keys(ROUTE_TITLES))('has an icon for %s', (route) => {
    expect(getRouteIcon(route)).not.toBeNull();
  });
});
