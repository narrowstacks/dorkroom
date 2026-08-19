import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HandlerConfig, UnkeyClient } from '../withHandler';
import { createMockRequest, createMockResponse } from './mock-vercel';

type VerifyKeyResponse = Awaited<ReturnType<UnkeyClient['keys']['verifyKey']>>;
type RateLimitResponse = Awaited<ReturnType<UnkeyClient['ratelimit']['limit']>>;

const verifyKeyMock = vi.fn<UnkeyClient['keys']['verifyKey']>();
const ratelimitLimitMock = vi.fn<UnkeyClient['ratelimit']['limit']>();

/** Stands in for the SDK client `withHandler` builds from `UNKEY_ROOT_KEY`. */
const fakeUnkey: UnkeyClient = {
  keys: { verifyKey: verifyKeyMock },
  ratelimit: { limit: ratelimitLimitMock },
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** A rate-limit-passing verifyKey response with no configured ratelimits. */
function validVerification(): VerifyKeyResponse {
  return {
    meta: { requestId: 'unkey-request' },
    data: {
      valid: true,
      code: 'VALID',
      ratelimits: [],
    },
  };
}

/** A successful (under-limit) ratelimit.limit response. */
function passingLimit(limit: number): RateLimitResponse {
  return {
    meta: { requestId: 'unkey-request' },
    data: {
      limit,
      remaining: limit - 1,
      reset: Date.now() + 60_000,
      success: true,
    },
  };
}

/** An exceeded ratelimit.limit response. */
function exceededLimit(limit: number): RateLimitResponse {
  return {
    meta: { requestId: 'unkey-request' },
    data: {
      limit,
      remaining: 0,
      reset: Date.now() + 60_000,
      success: false,
    },
  };
}

describe('withHandler', () => {
  beforeEach(() => {
    vi.resetModules();
    // The real serverlessLogger runs; swallow its JSON lines to keep the
    // suite output readable.
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    delete process.env.UNKEY_ROOT_KEY;
    delete process.env.UNKEY_API_ID;
    delete process.env.UNKEY_API_KEY_PERMISSION;
    delete process.env.UNKEY_ANON_NAMESPACE;
    delete process.env.UNKEY_CLIENT_NAMESPACE;
    verifyKeyMock.mockReset();
    ratelimitLimitMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Each test imports `withHandler` fresh, since it caches the Unkey client in
   * module state after the first request.
   */
  async function buildHandler(
    config: Omit<HandlerConfig, 'createUnkeyClient'>
  ) {
    const { withHandler } = await import('../withHandler');
    return withHandler({ ...config, createUnkeyClient: () => fakeUnkey });
  }

  describe('request ID generation', () => {
    it('should generate a UUID request ID', async () => {
      let capturedRequestId = '';
      const handler = await buildHandler({
        name: 'test',
        handler: async (_req, _res, ctx) => {
          capturedRequestId = ctx.requestId;
        },
      });

      const req = createMockRequest();
      const res = createMockResponse();
      await handler(req, res);

      expect(capturedRequestId).toMatch(UUID_REGEX);
    });

    it('should include requestId in error responses', async () => {
      const handler = await buildHandler({
        name: 'test',
        handler: async () => {},
      });

      const req = createMockRequest({ method: 'POST' });
      const res = createMockResponse();
      await handler(req, res);

      expect(res._status).toBe(405);
      expect(res._json).toEqual({
        error: 'Method not allowed',
        allowed: ['GET', 'OPTIONS'],
        requestId: expect.stringMatching(UUID_REGEX),
      });
    });
  });

  describe('security headers', () => {
    it('should set X-Content-Type-Options: nosniff', async () => {
      const handler = await buildHandler({
        name: 'test',
        handler: async (_req, res) => {
          res.status(200).json({ ok: true });
        },
      });

      const req = createMockRequest();
      const res = createMockResponse();
      await handler(req, res);

      expect(res._headers['x-content-type-options']).toBe('nosniff');
    });

    it('should set X-Content-Type-Options on preflight responses', async () => {
      const handler = await buildHandler({
        name: 'test',
        handler: async () => {},
      });

      const req = createMockRequest({ method: 'OPTIONS' });
      const res = createMockResponse();
      await handler(req, res);

      expect(res._status).toBe(200);
      expect(res._headers['x-content-type-options']).toBe('nosniff');
    });
  });

  describe('CORS headers', () => {
    it('should set CORS headers for public API host (api.dorkroom.art)', async () => {
      const handler = await buildHandler({
        name: 'test',
        handler: async () => {},
      });

      const req = createMockRequest({
        headers: { host: 'api.dorkroom.art' },
      });
      const res = createMockResponse();
      await handler(req, res);

      expect(res._headers['access-control-allow-origin']).toBe('*');
      expect(res._headers['access-control-allow-methods']).toBe('GET, OPTIONS');
      expect(res._headers['access-control-max-age']).toBe('86400');
    });

    it('should NOT set CORS headers for internal host (dorkroom.art)', async () => {
      const handler = await buildHandler({
        name: 'test',
        handler: async (_req, res) => {
          res.status(200).json({ ok: true });
        },
      });

      const req = createMockRequest();
      const res = createMockResponse();
      await handler(req, res);

      expect(res._headers['access-control-allow-origin']).toBeUndefined();
      expect(res._headers['access-control-allow-methods']).toBeUndefined();
      expect(res._headers['access-control-max-age']).toBeUndefined();
    });

    it('should handle OPTIONS preflight and return 200', async () => {
      const handler = await buildHandler({
        name: 'test',
        handler: async () => {
          throw new Error('Should not reach handler');
        },
      });

      const req = createMockRequest({ method: 'OPTIONS' });
      const res = createMockResponse();
      await handler(req, res);

      expect(res._status).toBe(200);
      expect(res._ended).toBe(true);
    });
  });

  describe('method guard', () => {
    it('should reject non-GET methods with 405', async () => {
      const handler = await buildHandler({
        name: 'test',
        handler: async () => {},
      });

      const results = await Promise.all(
        ['POST', 'PUT', 'DELETE', 'PATCH'].map(async (method) => {
          const req = createMockRequest({ method });
          const res = createMockResponse();
          await handler(req, res);
          return res;
        })
      );

      for (const res of results) {
        expect(res._status).toBe(405);
        expect(res._json).toMatchObject({ error: 'Method not allowed' });
      }
    });
  });

  describe('required environment variables', () => {
    it('should return 500 when required env vars are missing', async () => {
      const handler = await buildHandler({
        name: 'test',
        requiredEnv: ['SOME_MISSING_VAR'],
        handler: async () => {},
      });

      const req = createMockRequest();
      const res = createMockResponse();
      await handler(req, res);

      expect(res._status).toBe(500);
      expect(res._json).toEqual({
        error: 'API configuration error',
        message: 'Missing required environment configuration',
        requestId: expect.stringMatching(UUID_REGEX),
      });
    });
  });

  describe('host-based routing', () => {
    it('should treat dorkroom.art as anonymous (non-public API)', async () => {
      let capturedIsPublic = true;
      const handler = await buildHandler({
        name: 'test',
        handler: async (_req, _res, ctx) => {
          capturedIsPublic = ctx.isPublicApi;
          _res.status(200).json({ ok: true });
        },
      });

      const req = createMockRequest({
        headers: { host: 'dorkroom.art' },
      });
      const res = createMockResponse();
      await handler(req, res);

      expect(capturedIsPublic).toBe(false);
    });

    it('should treat api.dorkroom.art as public API', async () => {
      const handler = await buildHandler({
        name: 'test',
        handler: async () => {},
      });

      const req = createMockRequest({
        headers: { host: 'api.dorkroom.art' },
      });
      const res = createMockResponse();
      await handler(req, res);

      // Without UNKEY_API_ID, public API returns 500
      expect(res._status).toBe(500);
    });

    it('should treat unknown hosts as public API (require key)', async () => {
      const handler = await buildHandler({
        name: 'test',
        handler: async () => {},
      });

      const req = createMockRequest({
        headers: { host: 'evil.example.com' },
      });
      const res = createMockResponse();
      await handler(req, res);

      // Without UNKEY_API_ID, public API returns 500
      expect(res._status).toBe(500);
    });

    it('should treat .vercel.app hosts as anonymous', async () => {
      let capturedIsPublic = true;
      const handler = await buildHandler({
        name: 'test',
        handler: async (_req, _res, ctx) => {
          capturedIsPublic = ctx.isPublicApi;
          _res.status(200).json({ ok: true });
        },
      });

      const req = createMockRequest({
        headers: { host: 'dorkroom-abc123.vercel.app' },
      });
      const res = createMockResponse();
      await handler(req, res);

      expect(capturedIsPublic).toBe(false);
    });

    it('should set Vary: Host header', async () => {
      const handler = await buildHandler({
        name: 'test',
        handler: async (_req, res) => {
          res.status(200).json({ ok: true });
        },
      });

      const req = createMockRequest();
      const res = createMockResponse();
      await handler(req, res);

      const vary = res._headers.vary;
      expect(vary).toContain('Host');
    });
  });

  describe('client identity rate limiting (keyed path)', () => {
    function setupKeyedEnv() {
      process.env.UNKEY_ROOT_KEY = 'root-key';
      process.env.UNKEY_API_ID = 'test-api';
      process.env.UNKEY_API_KEY_PERMISSION = 'read';
    }

    function keyedRequest(headers: Record<string, string> = {}) {
      return createMockRequest({
        headers: {
          host: 'api.dorkroom.art',
          'x-api-key': 'valid-key',
          ...headers,
        },
      });
    }

    it("valid key, no X-Client-Id: does not call ratelimit.limit (today's behavior)", async () => {
      setupKeyedEnv();
      verifyKeyMock.mockResolvedValueOnce(validVerification());

      let handlerRan = false;
      const handler = await buildHandler({
        name: 'test',
        handler: async (_req, res) => {
          handlerRan = true;
          res.status(200).json({ ok: true });
        },
      });

      const req = keyedRequest();
      const res = createMockResponse();
      await handler(req, res);

      expect(handlerRan).toBe(true);
      expect(res._status).toBe(200);
      expect(ratelimitLimitMock).not.toHaveBeenCalled();
    });

    it('valid key + valid X-Client-Id: checks both client and IP namespaces; both pass -> headers reflect the client-id result', async () => {
      setupKeyedEnv();
      verifyKeyMock.mockResolvedValueOnce(validVerification());
      ratelimitLimitMock.mockImplementation(async (opts) =>
        opts.identifier.startsWith('client:')
          ? passingLimit(60)
          : passingLimit(240)
      );

      let handlerRan = false;
      const handler = await buildHandler({
        name: 'test',
        handler: async (_req, res) => {
          handlerRan = true;
          res.status(200).json({ ok: true });
        },
      });

      const req = keyedRequest({
        'x-client-id': 'client-abc-123',
        'x-forwarded-for': '203.0.113.5',
      });
      const res = createMockResponse();
      await handler(req, res);

      expect(handlerRan).toBe(true);
      expect(ratelimitLimitMock).toHaveBeenCalledTimes(2);

      const calls = ratelimitLimitMock.mock.calls;
      const identifiers = calls.map(([opts]) => opts.identifier);
      expect(identifiers).toContain('client:client-abc-123');
      expect(identifiers).toContain('ip:203.0.113.5');

      const namespaces = new Set(calls.map(([opts]) => opts.namespace));
      expect(namespaces.size).toBe(1);
      expect([...namespaces][0]).toBe('test-api-client');

      // Headers reflect the client-id result (limit 60), not the IP result (240).
      expect(res._headers['x-ratelimit-limit']).toBe('60');
    });

    it('client-id limit exceeded: 429 + Retry-After, handler not called', async () => {
      setupKeyedEnv();
      verifyKeyMock.mockResolvedValueOnce(validVerification());
      ratelimitLimitMock.mockImplementation(async (opts) =>
        opts.identifier.startsWith('client:')
          ? exceededLimit(60)
          : passingLimit(240)
      );

      let handlerRan = false;
      const handler = await buildHandler({
        name: 'test',
        handler: async () => {
          handlerRan = true;
        },
      });

      const req = keyedRequest({ 'x-client-id': 'client-abc-123' });
      const res = createMockResponse();
      await handler(req, res);

      expect(handlerRan).toBe(false);
      expect(res._status).toBe(429);
      expect(res._headers['retry-after']).toBeDefined();
    });

    it('IP guard exceeded (client-id fine): 429; headers reflect the IP result', async () => {
      setupKeyedEnv();
      verifyKeyMock.mockResolvedValueOnce(validVerification());
      ratelimitLimitMock.mockImplementation(async (opts) =>
        opts.identifier.startsWith('client:')
          ? passingLimit(60)
          : exceededLimit(240)
      );

      let handlerRan = false;
      const handler = await buildHandler({
        name: 'test',
        handler: async () => {
          handlerRan = true;
        },
      });

      const req = keyedRequest({ 'x-client-id': 'client-abc-123' });
      const res = createMockResponse();
      await handler(req, res);

      expect(handlerRan).toBe(false);
      expect(res._status).toBe(429);
      expect(res._headers['x-ratelimit-limit']).toBe('240');
      expect(res._headers['retry-after']).toBeDefined();
    });

    it.each([
      'short',
      'has spaces!!',
      'x'.repeat(65),
    ])('malformed X-Client-Id (%s) is treated as absent: no ratelimit.limit call', async (badId) => {
      setupKeyedEnv();
      verifyKeyMock.mockResolvedValueOnce(validVerification());

      let handlerRan = false;
      const handler = await buildHandler({
        name: 'test',
        handler: async (_req, res) => {
          handlerRan = true;
          res.status(200).json({ ok: true });
        },
      });

      const req = keyedRequest({ 'x-client-id': badId });
      const res = createMockResponse();
      await handler(req, res);

      expect(handlerRan).toBe(true);
      expect(res._status).toBe(200);
      expect(ratelimitLimitMock).not.toHaveBeenCalled();
    });

    it('invalid key + X-Client-Id: still 401 (key auth runs first)', async () => {
      setupKeyedEnv();
      verifyKeyMock.mockResolvedValueOnce({
        meta: { requestId: 'unkey-request' },
        data: { valid: false, code: 'FORBIDDEN', ratelimits: [] },
      });

      const handler = await buildHandler({
        name: 'test',
        handler: async () => {},
      });

      const req = keyedRequest({ 'x-client-id': 'client-abc-123' });
      const res = createMockResponse();
      await handler(req, res);

      expect(res._status).toBe(401);
      expect(ratelimitLimitMock).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should return 504 for AbortError (timeout)', async () => {
      const handler = await buildHandler({
        name: 'test',
        handler: async () => {
          const error = new Error('Timeout');
          error.name = 'AbortError';
          throw error;
        },
      });

      const req = createMockRequest();
      const res = createMockResponse();
      await handler(req, res);

      expect(res._status).toBe(504);
      expect(res._json).toEqual({
        error: 'Request timeout',
        message: 'Request to upstream service timed out',
        requestId: expect.stringMatching(UUID_REGEX),
      });
    });

    it('should return 502 for fetch TypeError', async () => {
      const handler = await buildHandler({
        name: 'test',
        handler: async () => {
          throw new TypeError('fetch failed');
        },
      });

      const req = createMockRequest();
      const res = createMockResponse();
      await handler(req, res);

      expect(res._status).toBe(502);
      expect(res._json).toEqual({
        error: 'Network error',
        message: 'Could not connect to upstream API',
        requestId: expect.stringMatching(UUID_REGEX),
      });
    });

    it('should return 500 for generic errors', async () => {
      const handler = await buildHandler({
        name: 'test',
        handler: async () => {
          throw new Error('Something broke');
        },
      });

      const req = createMockRequest();
      const res = createMockResponse();
      await handler(req, res);

      expect(res._status).toBe(500);
      expect(res._json).toEqual({
        error: 'Internal server error',
        message: 'An unexpected error occurred',
        requestId: expect.stringMatching(UUID_REGEX),
      });
    });

    it('should not write to response if already ended', async () => {
      const handler = await buildHandler({
        name: 'test',
        handler: async (_req, res) => {
          res.status(200).json({ ok: true });
          throw new Error('After response sent');
        },
      });

      const req = createMockRequest();
      const res = createMockResponse();
      await handler(req, res);

      // Should still be 200 from the handler, not overwritten to 500
      expect(res._status).toBe(200);
    });
  });

  describe('user-agent', () => {
    it('should pass user-agent from request to handler context', async () => {
      let capturedUA = '';
      const handler = await buildHandler({
        name: 'test',
        handler: async (_req, _res, ctx) => {
          capturedUA = ctx.userAgent;
          _res.status(200).json({ ok: true });
        },
      });

      const req = createMockRequest({
        headers: { host: 'dorkroom.art', 'user-agent': 'MyBrowser/2.0' },
      });
      const res = createMockResponse();
      await handler(req, res);

      expect(capturedUA).toBe('MyBrowser/2.0');
    });

    it('should use default user-agent when header is missing', async () => {
      let capturedUA = '';
      const handler = await buildHandler({
        name: 'test',
        handler: async (_req, _res, ctx) => {
          capturedUA = ctx.userAgent;
          _res.status(200).json({ ok: true });
        },
      });

      const req = createMockRequest({
        headers: { host: 'dorkroom.art', 'user-agent': '' },
      });
      const res = createMockResponse();
      await handler(req, res);

      expect(capturedUA).toBe('DorkroomReact-API');
    });
  });
});
