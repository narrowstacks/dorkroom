import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createMockRequest,
  createMockResponse,
} from '../../utils/__tests__/mock-vercel';
import { createSupabaseProxyHandler } from '../../utils/createSupabaseProxy';
import type { HandlerContext } from '../../utils/withHandler';
import { combinationsProxyConfig } from '../combinations';
import { developersProxyConfig } from '../developers';
import { filmsProxyConfig } from '../films';

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

/** The context `withHandler` hands the proxy once host auth has passed. */
function createContext(isPublicApi = false): HandlerContext {
  return {
    requestId: 'test-request-id',
    startTime: Date.now(),
    userAgent: 'TestAgent/1.0',
    isPublicApi,
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

describe.each([
  { endpoint: 'films', config: filmsProxyConfig },
  { endpoint: 'developers', config: developersProxyConfig },
  { endpoint: 'combinations', config: combinationsProxyConfig },
])('$endpoint endpoint', ({ config }) => {
  const handler = createSupabaseProxyHandler(config);

  describe('upstream error handling', () => {
    it('should return 502 for non-OK upstream responses (not reflected status)', async () => {
      respondWith(createUpstreamResponse('', { status: 403 }));

      const res = createMockResponse();
      await handler(createMockRequest(), res, createContext());

      expect(res._status).toBe(502);
      expect(res._json).toMatchObject({ error: 'External API error' });
      expect(res._json).not.toHaveProperty('status');
    });

    it.each([
      401, 403, 500, 503,
    ])('should not include upstream status %i in the response', async (upstreamStatus) => {
      respondWith(createUpstreamResponse('', { status: upstreamStatus }));

      const res = createMockResponse();
      await handler(createMockRequest(), res, createContext());

      expect(res._status).toBe(502);
      expect(res._json).not.toHaveProperty('status');
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
      await handler(createMockRequest(), res, createContext());

      expect(res._headers['cache-control']).toContain('s-maxage=300');
    });

    it('should keep the public API Cache-Control header as private, no-store', async () => {
      const res = createMockResponse();
      await handler(createMockRequest(), res, createContext(true));

      expect(res._headers['cache-control']).toBe('private, no-store');
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

    it('should mask an upstream 401 as a 502 with no upstream detail', async () => {
      respondWith(
        createUpstreamResponse(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
        })
      );

      const res = createMockResponse();
      await handler(createMockRequest(), res, createContext());

      expect(res._status).toBe(502);
      expect(JSON.stringify(res._json)).not.toContain('Unauthorized');
    });
  });
});
