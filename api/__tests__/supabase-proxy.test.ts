import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createMockRequest,
  createMockResponse,
  type MockVercelResponse,
} from '../../utils/__tests__/mock-vercel';
import { createSupabaseProxyHandler } from '../../utils/createSupabaseProxy';
import type { HandlerContext } from '../../utils/withHandler';
import { combinationsProxyConfig } from '../combinations';
import { developersProxyConfig } from '../developers';
import { filmsProxyConfig } from '../films';
import { statsProxyConfig } from '../stats';

/** A well-formed Supabase Edge Function list payload; the proxy forwards it verbatim. */
const LIST_PAYLOAD = JSON.stringify({ data: [{ id: 1, name: 'Test' }] });
const EMPTY_LIST_PAYLOAD = JSON.stringify({ data: [] });

function createUpstreamResponse(
  body: string,
  init: {
    status?: number;
    contentType?: string;
    contentLength?: string;
  } = {}
): Response {
  const headers = new Headers({
    'content-type': init.contentType ?? 'application/json',
  });
  if (init.contentLength !== undefined) {
    headers.set('content-length', init.contentLength);
  }

  return new Response(body, { status: init.status ?? 200, headers });
}

function respondWith(response: Response): void {
  globalThis.fetch = vi.fn().mockResolvedValue(response);
}

/**
 * The context `withHandler` hands the proxy once host auth has passed. With no
 * cache policy pinned (the website host), the envelope's `setCacheControl`
 * writes straight through to the response.
 */
function createContext(
  res?: MockVercelResponse,
  isPublicApi = false
): HandlerContext {
  return {
    requestId: 'test-request-id',
    startTime: Date.now(),
    userAgent: 'TestAgent/1.0',
    isPublicApi,
    setCacheControl: (value) => {
      res?.setHeader('Cache-Control', value);
    },
  };
}

const originalFetch = globalThis.fetch;

beforeEach(() => {
  // The proxy logs structured JSON through console (utils/serverlessLogger);
  // silence it so a passing run stays readable.
  for (const method of ['log', 'warn', 'error'] as const) {
    vi.spyOn(console, method).mockImplementation(() => {});
  }
  vi.stubEnv('SUPABASE_MASTER_API_KEY', 'test-master-key');
  vi.stubEnv('SUPABASE_ENDPOINT', 'https://test.supabase.co');
  vi.stubEnv('SUPABASE_PROXY_SECRET', 'test-proxy-secret');
  respondWith(createUpstreamResponse(LIST_PAYLOAD));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  globalThis.fetch = originalFetch;
});

// Everything below is the factory's behaviour, identical for every endpoint,
// so it runs once against a neutral config. What differs per endpoint (target
// URL and allowed params) is pinned in the per-endpoint suite at the bottom.
describe('createSupabaseProxyHandler', () => {
  const handler = createSupabaseProxyHandler({
    name: 'example',
    allowedParams: [],
  });

  describe('upstream error handling', () => {
    it.each([401, 403, 404, 500, 503])(
      'answers an upstream %i with a generic 502 that leaks nothing from upstream',
      async (upstreamStatus) => {
        respondWith(
          createUpstreamResponse(
            JSON.stringify({ error: 'internal upstream detail' }),
            { status: upstreamStatus }
          )
        );

        const res = createMockResponse();
        await handler(createMockRequest(), res, createContext());

        expect(res._status).toBe(502);
        expect(res._json).toMatchObject({ error: 'External API error' });
        expect(res._json).not.toHaveProperty('status');
        expect(JSON.stringify(res._json)).not.toContain(
          'internal upstream detail'
        );
      }
    );

    it('should pass an upstream 400 through with its error string and requestId', async () => {
      respondWith(
        createUpstreamResponse(
          JSON.stringify({ error: 'Invalid query parameter' }),
          { status: 400 }
        )
      );

      const res = createMockResponse();
      await handler(createMockRequest(), res, createContext());

      expect(res._status).toBe(400);
      expect(res._json).toEqual({
        error: 'Invalid query parameter',
        requestId: 'test-request-id',
      });
    });

    it('should fall back to a safe 400 message for unusable upstream bodies', async () => {
      const bodies = [
        '',
        '<html>oops</html>',
        JSON.stringify({ error: { nested: true } }),
        JSON.stringify({ error: 'x'.repeat(500) }),
      ];
      for (const body of bodies) {
        respondWith(createUpstreamResponse(body, { status: 400 }));
        const res = createMockResponse();
        await handler(createMockRequest(), res, createContext());

        expect(res._status).toBe(400);
        expect(res._json).toEqual({
          error: 'Invalid request parameter',
          requestId: 'test-request-id',
        });
      }
    });

    it('should use the fallback for an oversized 400 body without reading it', async () => {
      const upstream = createUpstreamResponse(
        JSON.stringify({ error: 'big' }),
        { status: 400, contentLength: String(2 * 1024 * 1024) }
      );
      const textSpy = vi.spyOn(upstream, 'text');
      respondWith(upstream);

      const res = createMockResponse();
      await handler(createMockRequest(), res, createContext());

      expect(res._status).toBe(400);
      expect(res._json).toMatchObject({ error: 'Invalid request parameter' });
      expect(textSpy).not.toHaveBeenCalled();
    });

    it('should use the fallback for an oversized 400 body without content-length', async () => {
      // `error` alone is valid and short, so only the body-size guard in
      // readUpstreamError can turn this into the fallback.
      respondWith(
        createUpstreamResponse(
          JSON.stringify({ error: 'big', pad: 'x'.repeat(2 * 1024 * 1024) }),
          { status: 400 }
        )
      );

      const res = createMockResponse();
      await handler(createMockRequest(), res, createContext());

      expect(res._status).toBe(400);
      expect(res._json).toMatchObject({ error: 'Invalid request parameter' });
    });

    it('should send an AbortSignal.timeout signal and rethrow a TimeoutError', async () => {
      const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');
      const fetchMock = vi
        .fn()
        .mockRejectedValue(new DOMException('timed out', 'TimeoutError'));
      globalThis.fetch = fetchMock;

      const res = createMockResponse();
      await expect(
        handler(createMockRequest(), res, createContext())
      ).rejects.toMatchObject({ name: 'TimeoutError' });
      expect(timeoutSpy).toHaveBeenCalledWith(30_000);
      expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
      timeoutSpy.mockRestore();
    });

    it('should rethrow a body read abort instead of falling back', async () => {
      const upstream = createUpstreamResponse('{}', { status: 400 });
      vi.spyOn(upstream, 'text').mockRejectedValue(
        new DOMException('aborted', 'AbortError')
      );
      respondWith(upstream);

      const res = createMockResponse();
      await expect(
        handler(createMockRequest(), res, createContext())
      ).rejects.toMatchObject({ name: 'AbortError' });
    });

    it('should answer 502 External API error when the 400 body is truncated', async () => {
      const upstream = createUpstreamResponse('{}', { status: 400 });
      vi.spyOn(upstream, 'text').mockRejectedValue(new TypeError('terminated'));
      respondWith(upstream);

      const res = createMockResponse();
      await handler(createMockRequest(), res, createContext());

      expect(res._status).toBe(502);
      expect(res._json).toMatchObject({
        error: 'External API error',
        message: 'Upstream service returned an error',
        requestId: expect.any(String),
      });
    });

    it('should let network failures propagate to withHandler (which maps them to 502)', async () => {
      globalThis.fetch = vi
        .fn()
        .mockRejectedValue(new TypeError('fetch failed'));

      const res = createMockResponse();
      await expect(
        handler(createMockRequest(), res, createContext())
      ).rejects.toThrow('fetch failed');
    });
  });

  describe('content type error handling', () => {
    it('should not include contentType in error response body', async () => {
      respondWith(
        createUpstreamResponse('<html></html>', { contentType: 'text/html' })
      );

      const res = createMockResponse();
      await handler(createMockRequest(), res, createContext());

      expect(res._status).toBe(502);
      expect(res._json).toMatchObject({ error: 'Invalid response format' });
      expect(res._json).not.toHaveProperty('contentType');
    });
  });

  describe('response size limit', () => {
    it('should reject responses exceeding 1MB', async () => {
      respondWith(
        createUpstreamResponse(EMPTY_LIST_PAYLOAD, {
          contentLength: String(1024 * 1024 + 1),
        })
      );

      const res = createMockResponse();
      await handler(createMockRequest(), res, createContext());

      expect(res._status).toBe(502);
      expect(res._json).toMatchObject({ error: 'Response too large' });
    });

    it('should allow responses within 1MB', async () => {
      respondWith(
        createUpstreamResponse(EMPTY_LIST_PAYLOAD, {
          contentLength: String(1024 * 1024),
        })
      );

      const res = createMockResponse();
      await handler(createMockRequest(), res, createContext());

      expect(res._status).toBe(200);
    });

    it('should allow responses without content-length header', async () => {
      respondWith(createUpstreamResponse(EMPTY_LIST_PAYLOAD));

      const res = createMockResponse();
      await handler(createMockRequest(), res, createContext());

      expect(res._status).toBe(200);
    });
  });

  describe('successful responses', () => {
    it('should return 200 with data for successful upstream response', async () => {
      const res = createMockResponse();
      await handler(createMockRequest(), res, createContext());

      expect(res._status).toBe(200);
      expect(res._json).toEqual(JSON.parse(LIST_PAYLOAD));
    });
  });

  describe('cache-control header', () => {
    it('should set an edge-cacheable Cache-Control header for website requests', async () => {
      const res = createMockResponse();
      await handler(createMockRequest(), res, createContext(res));

      expect(res._headers['cache-control']).toContain('s-maxage=300');
    });

    it('should leave the public API cache policy to the envelope instead of branching on host', async () => {
      // `private, no-store` on api.dorkroom.art is pinned by the envelope and
      // asserted in withHandler.test.ts; the proxy asks for the same value on
      // every host and never writes Cache-Control itself.
      const res = createMockResponse();
      const setCacheControl = vi.fn();
      await handler(createMockRequest(), res, {
        ...createContext(res, true),
        setCacheControl,
      });

      expect(setCacheControl).toHaveBeenCalledExactlyOnceWith(
        'public, max-age=60, s-maxage=300, stale-while-revalidate=600'
      );
      expect(res._headers['cache-control']).toBeUndefined();
    });
  });

  describe('shared secret', () => {
    it('should send x-proxy-secret on the outbound fetch to Supabase', async () => {
      const sent: (RequestInit | undefined)[] = [];
      globalThis.fetch = vi.fn(
        (_url: RequestInfo | URL, init?: RequestInit) => {
          sent.push(init);
          return Promise.resolve(createUpstreamResponse(EMPTY_LIST_PAYLOAD));
        }
      );

      await handler(createMockRequest(), createMockResponse(), createContext());

      expect(sent).toHaveLength(1);
      const headers = new Headers(sent[0]?.headers);
      expect(headers.get('x-proxy-secret')).toBe('test-proxy-secret');
    });
  });
});

describe.each([
  {
    name: 'films',
    config: filmsProxyConfig,
    kept: {
      query: 'tri',
      fuzzy: 'true',
      limit: '10',
      colorType: 'bw',
      brand: 'kodak',
      slug: 'tri-x',
    },
    dropped: { type: 'concentrate', manufacturer: 'ilford', film: 'x' },
  },
  {
    name: 'developers',
    config: developersProxyConfig,
    kept: {
      query: 'hc',
      fuzzy: 'false',
      limit: '10',
      type: 'concentrate',
      manufacturer: 'ilford',
      slug: 'hc-110',
    },
    dropped: { colorType: 'bw', brand: 'kodak', film: 'x' },
  },
  {
    name: 'combinations',
    config: combinationsProxyConfig,
    kept: {
      film: 'tri-x',
      developer: 'hc-110',
      count: '25',
      page: '2',
      id: 'abc',
      query: 'x',
      fuzzy: 'true',
      limit: '10',
    },
    dropped: { slug: 'tri-x', brand: 'kodak', manufacturer: 'ilford' },
  },
  {
    name: 'stats',
    config: statsProxyConfig,
    kept: {},
    dropped: { query: 'x', limit: '5', slug: 'tri-x' },
  },
])('$name endpoint wiring', ({ name, config, kept, dropped }) => {
  const handler = createSupabaseProxyHandler(config);

  it('calls the matching Supabase Edge Function', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(createUpstreamResponse(EMPTY_LIST_PAYLOAD));
    globalThis.fetch = fetchMock;

    await handler(createMockRequest(), createMockResponse(), createContext());

    expect(fetchMock.mock.calls[0][0]).toBe(
      `https://test.supabase.co/functions/v1/${name}`
    );
  });

  it('forwards its own params and drops everything else', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(createUpstreamResponse(EMPTY_LIST_PAYLOAD));
    globalThis.fetch = fetchMock;

    await handler(
      createMockRequest({ query: { ...kept, ...dropped } }),
      createMockResponse(),
      createContext()
    );

    const target = new URL(fetchMock.mock.calls[0][0]);
    expect(Object.fromEntries(target.searchParams)).toEqual(kept);
  });
});
