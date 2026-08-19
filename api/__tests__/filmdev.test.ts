import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createMockRequest,
  createMockResponse,
} from '../../utils/__tests__/mock-vercel';
import handler from '../filmdev';

/** A well-formed filmdev.org recipe lookup body; the proxy forwards it verbatim. */
const RECIPE_PAYLOAD = JSON.stringify({ recipe: { id: 12_345 } });

function createFilmdevResponse(
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

const originalFetch = globalThis.fetch;

beforeEach(() => {
  // The handler and its wrapper log structured JSON through console
  // (utils/serverlessLogger); silence it so a passing run stays readable.
  for (const method of ['log', 'warn', 'error'] as const) {
    vi.spyOn(console, method).mockImplementation(() => {});
  }
  // withHandler skips anonymous rate limiting when Unkey is unconfigured, so
  // the real wrapper runs end to end without reaching the network.
  vi.stubEnv('UNKEY_ROOT_KEY', '');
  respondWith(createFilmdevResponse(RECIPE_PAYLOAD));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  globalThis.fetch = originalFetch;
});

describe('filmdev endpoint', () => {
  describe('recipe ID validation', () => {
    it('should reject missing recipe ID', async () => {
      const res = createMockResponse();
      await handler(createMockRequest(), res);

      expect(res._status).toBe(400);
      expect(res._json).toMatchObject({ error: 'Invalid recipe ID' });
    });

    it('should reject non-numeric recipe ID', async () => {
      const res = createMockResponse();
      await handler(createMockRequest({ query: { id: 'abc' } }), res);

      expect(res._status).toBe(400);
    });

    it('should reject zero', async () => {
      const res = createMockResponse();
      await handler(createMockRequest({ query: { id: '0' } }), res);

      expect(res._status).toBe(400);
    });

    it('should reject negative numbers', async () => {
      const res = createMockResponse();
      await handler(createMockRequest({ query: { id: '-1' } }), res);

      expect(res._status).toBe(400);
    });

    it('should reject IDs exceeding max', async () => {
      const res = createMockResponse();
      await handler(createMockRequest({ query: { id: '10000000' } }), res);

      expect(res._status).toBe(400);
    });

    it('should accept valid recipe IDs', async () => {
      const res = createMockResponse();
      await handler(createMockRequest({ query: { id: '12345' } }), res);

      expect(res._status).toBe(200);
    });
  });

  describe('upstream error handling', () => {
    it('should return 502 for non-OK non-404 upstream responses', async () => {
      respondWith(createFilmdevResponse('', { status: 500 }));

      const res = createMockResponse();
      await handler(createMockRequest({ query: { id: '123' } }), res);

      expect(res._status).toBe(502);
      expect(res._json).toMatchObject({ error: 'External API error' });
      expect(res._json).not.toHaveProperty('status');
    });

    it('should return 404 when upstream returns 404', async () => {
      respondWith(createFilmdevResponse('', { status: 404 }));

      const res = createMockResponse();
      await handler(createMockRequest({ query: { id: '123' } }), res);

      expect(res._status).toBe(404);
      expect(res._json).toMatchObject({ error: 'Recipe not found' });
    });
  });

  describe('content type error handling', () => {
    it('should not include contentType in error response', async () => {
      respondWith(
        createFilmdevResponse('<html></html>', { contentType: 'text/html' })
      );

      const res = createMockResponse();
      await handler(createMockRequest({ query: { id: '123' } }), res);

      expect(res._status).toBe(502);
      expect(res._json).toMatchObject({ error: 'Invalid response format' });
      expect(res._json).not.toHaveProperty('contentType');
    });
  });

  describe('User-Agent', () => {
    it('should send fixed User-Agent to filmdev.org', async () => {
      const sent: (RequestInit | undefined)[] = [];
      globalThis.fetch = vi.fn(
        (_url: RequestInfo | URL, init?: RequestInit) => {
          sent.push(init);
          return Promise.resolve(createFilmdevResponse(RECIPE_PAYLOAD));
        }
      );

      await handler(
        createMockRequest({ query: { id: '123' } }),
        createMockResponse()
      );

      const headers = new Headers(sent[0]?.headers);
      expect(headers.get('user-agent')).toBe('Dorkroom-API/1.0');
    });
  });

  describe('response size limit', () => {
    it('should reject responses exceeding 1MB', async () => {
      respondWith(
        createFilmdevResponse(RECIPE_PAYLOAD, {
          contentLength: String(1024 * 1024 + 1),
        })
      );

      const res = createMockResponse();
      await handler(createMockRequest({ query: { id: '123' } }), res);

      expect(res._status).toBe(502);
      expect(res._json).toMatchObject({ error: 'Response too large' });
    });
  });
});
