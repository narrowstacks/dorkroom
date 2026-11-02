import { Unkey } from '@unkey/api';
import {
  APIError,
  ConnectionError,
  RequestTimeoutError,
} from '@unkey/api/models/errors';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ANONYMOUS_RATE_LIMIT,
  ANONYMOUS_RATE_WINDOW_MS,
  ANONYMOUS_UPSTREAM_DAILY_LIMIT,
  ANONYMOUS_UPSTREAM_DAILY_WINDOW_MS,
  ANONYMOUS_UPSTREAM_RATE_LIMIT,
  ANONYMOUS_UPSTREAM_RATE_WINDOW_MS,
} from '../rateLimitPolicy';
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

/** The per-call options every `ratelimit.limit` check must pass. */
const RATE_LIMIT_REQUEST_OPTIONS = {
  timeoutMs: 1500,
  retries: { strategy: 'none' },
};

/** An SDK error for an Unkey HTTP answer, with a body that must stay out of logs. */
function unkeyHttpError(status: number, message = 'API error occurred') {
  return new APIError(message, {
    response: new Response('secret-ish response body', { status }),
    request: new Request('https://api.unkey.com/v2/ratelimit.limit'),
    body: 'secret-ish response body',
  });
}

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
    vi.unstubAllEnvs();
    vi.useRealTimers();
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

      expect(res._status).toBe(204);
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

    it('should handle OPTIONS preflight and return 204', async () => {
      const handler = await buildHandler({
        name: 'test',
        handler: async () => {
          throw new Error('Should not reach handler');
        },
      });

      const req = createMockRequest({ method: 'OPTIONS' });
      const res = createMockResponse();
      await handler(req, res);

      expect(res._status).toBe(204);
      expect(res._headers.allow).toBe('GET, OPTIONS');
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

  describe('cache policy', () => {
    const WEBSITE_CACHE = 'public, max-age=60, s-maxage=300';

    async function cachingHandler() {
      return buildHandler({
        name: 'test',
        handler: async (_req, res, ctx) => {
          ctx.setCacheControl(WEBSITE_CACHE);
          res.status(200).json({ ok: true });
        },
      });
    }

    it('lets the handler choose Cache-Control on the website host', async () => {
      const handler = await cachingHandler();
      const res = createMockResponse();
      await handler(
        createMockRequest({ headers: { host: 'dorkroom.art' } }),
        res
      );

      expect(res._status).toBe(200);
      expect(res._headers['cache-control']).toBe(WEBSITE_CACHE);
    });

    it('pins private, no-store on the public API host even when the handler asks for caching', async () => {
      process.env.UNKEY_ROOT_KEY = 'root-key';
      process.env.UNKEY_API_ID = 'test-api';
      process.env.UNKEY_API_KEY_PERMISSION = 'read';
      verifyKeyMock.mockResolvedValueOnce(validVerification());
      const handler = await cachingHandler();

      const res = createMockResponse();
      await handler(
        createMockRequest({
          headers: { host: 'api.dorkroom.art', 'x-api-key': 'dk_f_test' },
        }),
        res
      );

      expect(res._status).toBe(200);
      expect(res._headers['cache-control']).toBe('private, no-store');
    });

    it('pins private, no-store on public API host rejections too', async () => {
      const handler = await cachingHandler();
      const res = createMockResponse();
      await handler(
        createMockRequest({ headers: { host: 'api.dorkroom.art' } }),
        res
      );

      // No UNKEY_API_ID: the key layer answers 500 before the handler runs.
      expect(res._status).toBe(500);
      expect(res._headers['cache-control']).toBe('private, no-store');
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
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
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
      // exceededLimit resets 60s after the frozen clock, which is 1_767_225_660 s
      expect(res._headers['retry-after']).toBe('60');
      expect(res._headers['x-ratelimit-limit']).toBe('60');
      expect(res._headers['x-ratelimit-remaining']).toBe('0');
      expect(res._headers['x-ratelimit-reset']).toBe('1767225660');
    });

    it('IP guard exceeded (client-id fine): 429; headers reflect the IP result', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
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
      expect(res._headers['x-ratelimit-remaining']).toBe('0');
      expect(res._headers['x-ratelimit-reset']).toBe('1767225660');
      expect(res._headers['retry-after']).toBe('60');
    });

    it.each(['short', 'has spaces!!', 'x'.repeat(65)])(
      'malformed X-Client-Id (%s) is treated as absent: no ratelimit.limit call',
      async (badId) => {
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
      }
    );

    it('Unkey unreachable on the client-id checks: fails open after the key verified', async () => {
      setupKeyedEnv();
      vi.stubEnv('NODE_ENV', 'production');
      verifyKeyMock.mockResolvedValueOnce(validVerification());
      ratelimitLimitMock.mockRejectedValue(
        new ConnectionError('Unable to make request')
      );

      let handlerRan = false;
      const handler = await buildHandler({
        name: 'test',
        handler: async (_req, res) => {
          handlerRan = true;
          res.status(200).json({ ok: true });
        },
      });

      const res = createMockResponse();
      await handler(keyedRequest({ 'x-client-id': 'client-abc-123' }), res);

      expect(handlerRan).toBe(true);
      expect(res._status).toBe(200);
      expect(ratelimitLimitMock).toHaveBeenCalledTimes(2);
    });

    it('verifyKey failure logs only the name and status, never the response body', async () => {
      setupKeyedEnv();
      verifyKeyMock.mockRejectedValueOnce(unkeyHttpError(502));

      const handler = await buildHandler({
        name: 'test',
        handler: async () => {},
      });

      const res = createMockResponse();
      await handler(keyedRequest(), res);

      expect(res._status).toBe(500);
      const line = vi
        .mocked(console.error)
        .mock.calls.map(([logged]) => String(logged))
        .find((logged) => logged.includes('Unkey key verification failed'));
      expect(line).toContain('"errorName":"APIError"');
      expect(line).toContain('"statusCode":502');
      expect(line).not.toContain('secret-ish response body');
    });

    it('Unkey unreachable on verifyKey: still fails closed (500), handler not called', async () => {
      setupKeyedEnv();
      verifyKeyMock.mockRejectedValueOnce(
        new ConnectionError('Unable to make request')
      );

      let handlerRan = false;
      const handler = await buildHandler({
        name: 'test',
        handler: async () => {
          handlerRan = true;
        },
      });

      const res = createMockResponse();
      await handler(keyedRequest({ 'x-client-id': 'client-abc-123' }), res);

      expect(handlerRan).toBe(false);
      expect(res._status).toBe(500);
      expect(res._json).toMatchObject({ message: 'Unable to verify API key' });
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

  describe('key authentication (api.dorkroom.art)', () => {
    function setupKeyedEnv() {
      process.env.UNKEY_ROOT_KEY = 'root-key';
      process.env.UNKEY_API_ID = 'test-api';
      process.env.UNKEY_API_KEY_PERMISSION = 'read';
    }

    async function keyedHandler() {
      const ran = vi.fn();
      const handler = await buildHandler({
        name: 'test',
        handler: async (_req, res) => {
          ran();
          res.status(200).json({ ok: true });
        },
      });
      return { handler, ran };
    }

    it('answers 401 without calling Unkey when X-API-Key is missing', async () => {
      setupKeyedEnv();
      const { handler, ran } = await keyedHandler();

      const res = createMockResponse();
      await handler(
        createMockRequest({ headers: { host: 'api.dorkroom.art' } }),
        res
      );

      expect(res._status).toBe(401);
      expect(res._json).toMatchObject({
        error: 'Unauthorized',
        message: 'Missing API key. Pass X-API-Key header.',
      });
      expect(verifyKeyMock).not.toHaveBeenCalled();
      expect(ran).not.toHaveBeenCalled();
    });

    it('answers 429 when Unkey reports RATE_LIMITED, even with no ratelimits block', async () => {
      setupKeyedEnv();
      verifyKeyMock.mockResolvedValueOnce({
        meta: { requestId: 'unkey-request' },
        data: { valid: false, code: 'RATE_LIMITED', ratelimits: [] },
      });
      const { handler, ran } = await keyedHandler();

      const res = createMockResponse();
      await handler(
        createMockRequest({
          headers: { host: 'api.dorkroom.art', 'x-api-key': 'a-key' },
        }),
        res
      );

      expect(res._status).toBe(429);
      expect(res._json).toMatchObject({
        error: 'Rate limit exceeded',
        code: 'RATE_LIMITED',
      });
      expect(ran).not.toHaveBeenCalled();
    });
  });

  describe('anonymous rate limiting (dorkroom.art)', () => {
    beforeEach(() => {
      process.env.UNKEY_ROOT_KEY = 'root-key';
      process.env.UNKEY_API_ID = 'test-api';
    });

    async function anonymousHandler() {
      const ran = vi.fn();
      const handler = await buildHandler({
        name: 'test',
        handler: async (_req, res) => {
          ran();
          res.status(200).json({ ok: true });
        },
      });
      return { handler, ran };
    }

    function anonymousRequest(headers: Record<string, string> = {}) {
      return createMockRequest({
        headers: { host: 'dorkroom.art', ...headers },
      });
    }

    it('limits per IP in the anonymous namespace, trusting the right-most X-Forwarded-For entry', async () => {
      ratelimitLimitMock.mockResolvedValueOnce(passingLimit(30));
      const { handler, ran } = await anonymousHandler();

      const res = createMockResponse();
      // The left-most entry is whatever the caller sent; Vercel appends the real one
      await handler(
        anonymousRequest({ 'x-forwarded-for': '198.51.100.9, 203.0.113.5' }),
        res
      );

      expect(ratelimitLimitMock).toHaveBeenCalledExactlyOnceWith(
        {
          namespace: 'test-api-anonymous',
          identifier: '203.0.113.5',
          limit: ANONYMOUS_RATE_LIMIT,
          duration: ANONYMOUS_RATE_WINDOW_MS,
        },
        // Short timeout, no retries: an unreachable Unkey fails open fast
        RATE_LIMIT_REQUEST_OPTIONS
      );
      expect(ran).toHaveBeenCalledOnce();
      expect(res._status).toBe(200);
    });

    it('answers 429 over the limit and never runs the handler', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      ratelimitLimitMock.mockResolvedValueOnce(exceededLimit(30));
      const { handler, ran } = await anonymousHandler();

      const res = createMockResponse();
      await handler(anonymousRequest({ 'x-real-ip': '203.0.113.5' }), res);

      expect(res._status).toBe(429);
      expect(res._json).toMatchObject({ error: 'Rate limit exceeded' });
      expect(res._headers['retry-after']).toBe('60');
      expect(ran).not.toHaveBeenCalled();
    });

    it('fails open outside production when the create_namespace permission is missing', async () => {
      vi.stubEnv('NODE_ENV', 'development');
      ratelimitLimitMock.mockRejectedValueOnce(
        new Error('Missing permission: ratelimit.*.create_namespace')
      );
      const { handler, ran } = await anonymousHandler();

      const res = createMockResponse();
      await handler(anonymousRequest({ 'x-real-ip': '203.0.113.5' }), res);

      expect(res._status).toBe(200);
      expect(ran).toHaveBeenCalledOnce();
    });

    it('fails closed in production when the create_namespace permission is missing', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      ratelimitLimitMock.mockRejectedValueOnce(
        new Error('Missing permission: ratelimit.*.create_namespace')
      );
      const { handler, ran } = await anonymousHandler();

      const res = createMockResponse();
      await handler(anonymousRequest({ 'x-real-ip': '203.0.113.5' }), res);

      expect(res._status).toBe(500);
      expect(res._json).toMatchObject({
        error: 'API configuration error',
        message: 'Rate limiting is not configured',
      });
      expect(ran).not.toHaveBeenCalled();
    });

    /** The JSON lines the logger wrote at WARN level. */
    function warnLines(): string[] {
      return vi.mocked(console.warn).mock.calls.map(([line]) => String(line));
    }

    function unavailableWarning(): string | undefined {
      return warnLines().find((line) =>
        line.includes('"message":"Rate limiting skipped (Unkey unavailable)"')
      );
    }

    it.each([
      [
        'ConnectionError',
        () =>
          new ConnectionError('Unable to make request', {
            cause: new TypeError('fetch failed'),
          }),
      ],
      [
        'RequestTimeoutError',
        () =>
          new RequestTimeoutError('Request timed out', {
            cause: new DOMException('signal timed out', 'TimeoutError'),
          }),
      ],
      ['TypeError', () => new TypeError('fetch failed')],
      ['AbortError', () => new DOMException('aborted', 'AbortError')],
    ])(
      'fails open with a warning in production when Unkey is unreachable (%s)',
      async (errorName, makeError) => {
        vi.stubEnv('NODE_ENV', 'production');
        ratelimitLimitMock.mockRejectedValueOnce(makeError());
        const { handler, ran } = await anonymousHandler();

        const res = createMockResponse();
        await handler(anonymousRequest({ 'x-real-ip': '203.0.113.5' }), res);

        expect(res._status).toBe(200);
        expect(ran).toHaveBeenCalledOnce();
        expect(res._headers['x-ratelimit-limit']).toBeUndefined();
        const warning = unavailableWarning();
        expect(warning).toContain('"namespace":"test-api-anonymous"');
        expect(warning).toContain(`"errorName":"${errorName}"`);
        // Neither the root key nor the caller's IP reaches the log
        expect(warning).not.toContain('root-key');
        expect(warning).not.toContain('203.0.113.5');
      }
    );

    it('fails open when Unkey answers with a 5xx', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      ratelimitLimitMock.mockRejectedValueOnce(
        new APIError('API error occurred', {
          response: new Response('upstream unavailable', { status: 503 }),
          request: new Request('https://api.unkey.com/v2/ratelimit.limit'),
          body: 'upstream unavailable',
        })
      );
      const { handler, ran } = await anonymousHandler();

      const res = createMockResponse();
      await handler(anonymousRequest({ 'x-real-ip': '203.0.113.5' }), res);

      expect(res._status).toBe(200);
      expect(ran).toHaveBeenCalledOnce();
      const warning = unavailableWarning();
      expect(warning).toContain('"errorName":"APIError"');
      expect(warning).toContain('"statusCode":503');
      expect(warning).not.toContain('upstream unavailable');
    });

    it('still fails closed on an insufficient-permissions error', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      ratelimitLimitMock.mockRejectedValueOnce(
        new APIError('Insufficient Permissions', {
          response: new Response('', { status: 403 }),
          request: new Request('https://api.unkey.com/v2/ratelimit.limit'),
          body: '',
        })
      );
      const { handler, ran } = await anonymousHandler();

      const res = createMockResponse();
      await handler(anonymousRequest({ 'x-real-ip': '203.0.113.5' }), res);

      expect(res._status).toBe(500);
      expect(res._json).toMatchObject({
        error: 'API configuration error',
        message: 'Rate limiting is not configured',
      });
      expect(ran).not.toHaveBeenCalled();
    });

    it("fails closed (500) when Unkey's own workspace quota is exhausted (429)", async () => {
      ratelimitLimitMock.mockRejectedValueOnce(unkeyHttpError(429));
      const { handler, ran } = await anonymousHandler();

      const res = createMockResponse();
      await handler(anonymousRequest({ 'x-real-ip': '203.0.113.5' }), res);

      expect(res._status).toBe(500);
      expect(ran).not.toHaveBeenCalled();
      expect(unavailableWarning()).toBeUndefined();
      const errorLines = vi
        .mocked(console.error)
        .mock.calls.map(([logged]) => String(logged));
      const quotaLine = errorLines.find((logged) =>
        logged.includes('"message":"Unkey quota exhausted"')
      );
      expect(quotaLine).toContain('"statusCode":429');
      expect(errorLines.join('\n')).not.toContain('secret-ish response body');
    });

    it('still answers 500 for an unclassified Unkey error', async () => {
      ratelimitLimitMock.mockRejectedValueOnce(new Error('Something broke'));
      const { handler, ran } = await anonymousHandler();

      const res = createMockResponse();
      await handler(anonymousRequest({ 'x-real-ip': '203.0.113.5' }), res);

      expect(res._status).toBe(500);
      expect(res._json).toMatchObject({ error: 'Internal server error' });
      expect(ran).not.toHaveBeenCalled();
    });
  });

  describe('anonymous upstream budget (dorkroom.art)', () => {
    const BURST = 'api-upstream';
    const DAY = 'api-upstream-day';

    beforeEach(() => {
      process.env.UNKEY_ROOT_KEY = 'root-key';
      process.env.UNKEY_API_ID = 'test-api';
      process.env.UNKEY_API_KEY_PERMISSION = 'read';
    });

    async function budgetedHandler(upstreamBudget = true) {
      const ran = vi.fn();
      const handler = await buildHandler({
        name: 'test',
        upstreamBudget,
        handler: async (_req, res) => {
          ran();
          res.status(200).json({ ok: true });
        },
      });
      return { handler, ran };
    }

    function anonymousRequest(url = '/api/films?query=tri-x') {
      return createMockRequest({
        url,
        headers: { host: 'dorkroom.art', 'x-real-ip': '203.0.113.5' },
      });
    }

    /** Answers each identifier from `exceeded`; everything else passes. */
    function limitsBy(exceeded: ReadonlySet<string>) {
      ratelimitLimitMock.mockImplementation(async (opts) =>
        exceeded.has(opts.identifier)
          ? exceededLimit(opts.limit)
          : passingLimit(opts.limit)
      );
    }

    const identifiers = () =>
      ratelimitLimitMock.mock.calls.map(([opts]) => opts.identifier);

    /** Nothing in the response may describe a global bucket. */
    function expectNoGlobalState(res: ReturnType<typeof createMockResponse>) {
      expect(res._headers['x-ratelimit-limit']).toBe(
        String(ANONYMOUS_RATE_LIMIT)
      );
      expect(res._headers['x-ratelimit-remaining']).toBe(
        String(ANONYMOUS_RATE_LIMIT - 1)
      );
      // The random requestId could contain the digits by chance; drop it
      const body = JSON.stringify(res._json ?? null).replace(
        /[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}/g,
        ''
      );
      for (const value of [
        ANONYMOUS_UPSTREAM_RATE_LIMIT,
        ANONYMOUS_UPSTREAM_DAILY_LIMIT,
        BURST,
      ]) {
        expect(body).not.toContain(String(value));
      }
    }

    it('charges the burst and then the daily bucket, cost 1, after the per-IP limit passes', async () => {
      limitsBy(new Set());
      const { handler, ran } = await budgetedHandler();

      const res = createMockResponse();
      await handler(anonymousRequest(), res);

      expect(res._status).toBe(200);
      expect(ran).toHaveBeenCalledOnce();
      expect(ratelimitLimitMock.mock.calls.map(([opts]) => opts)).toEqual([
        {
          namespace: 'test-api-anonymous',
          identifier: '203.0.113.5',
          limit: ANONYMOUS_RATE_LIMIT,
          duration: ANONYMOUS_RATE_WINDOW_MS,
        },
        {
          namespace: 'test-api-anonymous',
          identifier: BURST,
          limit: ANONYMOUS_UPSTREAM_RATE_LIMIT,
          duration: ANONYMOUS_UPSTREAM_RATE_WINDOW_MS,
          cost: 1,
        },
        {
          namespace: 'test-api-anonymous',
          identifier: DAY,
          limit: ANONYMOUS_UPSTREAM_DAILY_LIMIT,
          duration: ANONYMOUS_UPSTREAM_DAILY_WINDOW_MS,
          cost: 1,
        },
      ]);
      expect(
        ratelimitLimitMock.mock.calls.map(([, options]) => options)
      ).toEqual([
        RATE_LIMIT_REQUEST_OPTIONS,
        RATE_LIMIT_REQUEST_OPTIONS,
        RATE_LIMIT_REQUEST_OPTIONS,
      ]);
      // A passing global check leaves the caller's own per-IP headers alone
      expectNoGlobalState(res);
    });

    it('answers 503 with Retry-After when the burst bucket is exhausted, without charging the day', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      limitsBy(new Set([BURST]));
      const { handler, ran } = await budgetedHandler();

      const res = createMockResponse();
      await handler(anonymousRequest(), res);

      expect(res._status).toBe(503);
      expect(res._json).toMatchObject({
        error: 'Service temporarily unavailable',
      });
      expect(res._headers['retry-after']).toBe('60');
      expect(res._headers['cache-control']).toBe('no-store');
      expect(identifiers()).toEqual(['203.0.113.5', BURST]);
      expect(ran).not.toHaveBeenCalled();
      expectNoGlobalState(res);
    });

    it('answers 503 with Retry-After when the daily bucket is exhausted', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      limitsBy(new Set([DAY]));
      const { handler, ran } = await budgetedHandler();

      const res = createMockResponse();
      await handler(anonymousRequest(), res);

      expect(res._status).toBe(503);
      expect(res._headers['retry-after']).toBe('60');
      expect(res._headers['cache-control']).toBe('no-store');
      expect(identifiers()).toEqual(['203.0.113.5', BURST, DAY]);
      expect(ran).not.toHaveBeenCalled();
      expectNoGlobalState(res);
    });

    it.each([
      '/api/films',
      '/api/developers',
      '/api/combinations',
      '/api/stats',
    ])(
      'never charges the bare URL %s, even with both buckets exhausted',
      async (url) => {
        limitsBy(new Set([BURST, DAY]));
        const { handler, ran } = await budgetedHandler();

        const res = createMockResponse();
        await handler(anonymousRequest(url), res);

        expect(res._status).toBe(200);
        expect(identifiers()).toEqual(['203.0.113.5']);
        expect(ran).toHaveBeenCalledOnce();
      }
    );

    it.each([
      // Dropped by the proxy's allowlist, but it still misses the CDN
      '/api/films?junk=x',
      '/api/films?query=x',
      '/api/films?',
    ])('charges %s to the budget', async (url) => {
      limitsBy(new Set([BURST]));
      const { handler, ran } = await budgetedHandler();

      const res = createMockResponse();
      await handler(anonymousRequest(url), res);

      expect(res._status).toBe(503);
      expect(identifiers()).toEqual(['203.0.113.5', BURST]);
      expect(ran).not.toHaveBeenCalled();
    });

    it('never charges a request the per-IP limit already turned away', async () => {
      limitsBy(new Set(['203.0.113.5']));
      const { handler, ran } = await budgetedHandler();

      const res = createMockResponse();
      await handler(anonymousRequest(), res);

      expect(res._status).toBe(429);
      expect(identifiers()).toEqual(['203.0.113.5']);
      expect(ran).not.toHaveBeenCalled();
    });

    it('leaves handlers that do not opt in (no Supabase call) uncharged', async () => {
      limitsBy(new Set([BURST, DAY]));
      const { handler, ran } = await budgetedHandler(false);

      const res = createMockResponse();
      await handler(anonymousRequest(), res);

      expect(res._status).toBe(200);
      expect(identifiers()).toEqual(['203.0.113.5']);
      expect(ran).toHaveBeenCalledOnce();
    });

    it('fails open when Unkey errors on a budget check', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      ratelimitLimitMock.mockImplementation(async (opts) => {
        if (opts.identifier === BURST) {
          throw new TypeError('fetch failed');
        }
        return passingLimit(opts.limit);
      });
      const { handler, ran } = await budgetedHandler();

      const res = createMockResponse();
      await handler(anonymousRequest(), res);

      expect(res._status).toBe(200);
      expect(ran).toHaveBeenCalledOnce();
    });

    it('logs only the name and status of a failed budget check, never the response body', async () => {
      ratelimitLimitMock.mockImplementation(async (opts) => {
        if (opts.identifier === BURST) {
          throw unkeyHttpError(503);
        }
        return passingLimit(opts.limit);
      });
      const { handler, ran } = await budgetedHandler();

      const res = createMockResponse();
      await handler(anonymousRequest(), res);

      expect(res._status).toBe(200);
      expect(ran).toHaveBeenCalledOnce();
      const line = vi
        .mocked(console.warn)
        .mock.calls.map(([logged]) => String(logged))
        .find((logged) => logged.includes('Upstream budget skipped'));
      expect(line).toContain('"errorName":"APIError"');
      expect(line).toContain('"statusCode":503');
      expect(line).not.toContain('secret-ish response body');
    });

    it('fails open when Unkey is not configured', async () => {
      delete process.env.UNKEY_ROOT_KEY;
      const { handler, ran } = await budgetedHandler();

      const res = createMockResponse();
      await handler(anonymousRequest(), res);

      expect(res._status).toBe(200);
      expect(ran).toHaveBeenCalledOnce();
      expect(ratelimitLimitMock).not.toHaveBeenCalled();
    });

    const keyedCases: [string, Record<string, string>, string[]][] = [
      ['without X-Client-Id', {}, []],
      [
        'with X-Client-Id',
        { 'x-client-id': 'install-12345678' },
        ['client:install-12345678', 'ip:203.0.113.5'],
      ],
    ];

    it.each(keyedCases)(
      'keyed traffic %s is never charged, even with both buckets exhausted',
      async (_label, extraHeaders, expectedIdentifiers) => {
        verifyKeyMock.mockResolvedValueOnce(validVerification());
        limitsBy(new Set([BURST, DAY]));
        const { handler, ran } = await budgetedHandler();

        const res = createMockResponse();
        await handler(
          createMockRequest({
            url: '/films?query=x',
            headers: {
              host: 'api.dorkroom.art',
              'x-api-key': 'valid-key',
              'x-real-ip': '203.0.113.5',
              ...extraHeaders,
            },
          }),
          res
        );

        expect(res._status).toBe(200);
        expect(ran).toHaveBeenCalledOnce();
        expect(identifiers().sort()).toEqual([...expectedIdentifiers].sort());
      }
    );
  });

  describe('canonical paths (dorkroom.art Supabase proxies)', () => {
    const BURST = 'api-upstream';
    const DAY = 'api-upstream-day';

    beforeEach(() => {
      process.env.UNKEY_ROOT_KEY = 'root-key';
      process.env.UNKEY_API_ID = 'test-api';
      process.env.UNKEY_API_KEY_PERMISSION = 'read';
      // Both global buckets exhausted: anything charged would 503
      ratelimitLimitMock.mockImplementation(async (opts) =>
        opts.identifier === BURST || opts.identifier === DAY
          ? exceededLimit(opts.limit)
          : passingLimit(opts.limit)
      );
    });

    async function proxyHandler(name: string) {
      const ran = vi.fn();
      const handler = await buildHandler({
        name,
        upstreamBudget: true,
        canonicalPath: `/api/${name}`,
        handler: async (_req, res) => {
          ran();
          res.status(200).json({ ok: true });
        },
      });
      return { handler, ran };
    }

    function request(
      url: string,
      headers: Record<string, string> = {},
      host = 'dorkroom.art'
    ) {
      return createMockRequest({
        url,
        headers: { host, 'x-real-ip': '203.0.113.5', ...headers },
      });
    }

    const identifiers = () =>
      ratelimitLimitMock.mock.calls.map(([opts]) => opts.identifier);

    it.each([
      ['/api/stats/', '/api/stats'],
      ['/api/stats.ts', '/api/stats'],
      ['/api/%73tats', '/api/stats'],
      ['/api/st%61ts', '/api/stats'],
      ['/API/stats', '/api/stats'],
      ['/Api/stats', '/api/stats'],
      ['/%61pi/stats', '/api/stats'],
      // The query rides along untouched, never re-encoded or reordered
      ['/API/stats?query=tri%20x&b=1&a=2', '/api/stats?query=tri%20x&b=1&a=2'],
      ['/api/stats/?', '/api/stats?'],
      // A path that would parse as another origin still lands on our own path
      ['//evil.example/api/stats', '/api/stats'],
    ])(
      'redirects the path variant %s to %s, uncharged',
      async (url, location) => {
        const { handler, ran } = await proxyHandler('stats');
        const res = createMockResponse();
        await handler(request(url), res);

        expect(res._status).toBe(308);
        expect(res._headers.location).toBe(location);
        expect(res._headers['cache-control']).toBe(
          'public, max-age=0, s-maxage=86400'
        );
        expect(res._headers['x-ratelimit-limit']).toBeUndefined();
        // Never limited, never charged, never upstream
        expect(ratelimitLimitMock).not.toHaveBeenCalled();
        expect(ran).not.toHaveBeenCalled();
      }
    );

    it.each([
      '/api/films?query=tri+x',
      '/api/films?query=tri%20x',
      '/api/films?query=a~b',
      '/api/films?query=a%7Eb',
      '/api/films?query=a!b',
      '/api/films?query=a%21b',
      '/api/films?query=(a)',
      '/api/films?query=%28a%29',
      '/api/films?query=x&limit=5',
      '/api/films?junk=1',
      '/api/films?',
    ])('never redirects on the query; charges %s', async (url) => {
      const { handler, ran } = await proxyHandler('films');
      const res = createMockResponse();
      await handler(request(url), res);

      expect(res._status).toBe(503);
      expect(res._headers.location).toBeUndefined();
      expect(identifiers()).toEqual(['203.0.113.5', BURST]);
      expect(ran).not.toHaveBeenCalled();
    });

    it('serves a canonical bare URL uncharged, even with both buckets exhausted', async () => {
      const { handler, ran } = await proxyHandler('films');
      const res = createMockResponse();
      await handler(request('/api/films'), res);

      expect(res._status).toBe(200);
      expect(ran).toHaveBeenCalledOnce();
      expect(identifiers()).toEqual(['203.0.113.5']);
    });

    it.each([
      ['authorization', 'x'],
      ['range', 'bytes=0-10'],
    ])(
      'charges a bare URL carrying %s, which the CDN never caches',
      async (header, value) => {
        const { handler, ran } = await proxyHandler('films');
        const res = createMockResponse();
        await handler(request('/api/films', { [header]: value }), res);

        expect(res._status).toBe(503);
        expect(identifiers()).toEqual(['203.0.113.5', BURST]);
        expect(ran).not.toHaveBeenCalled();
      }
    );

    it('never redirects keyed api.dorkroom.art traffic', async () => {
      verifyKeyMock.mockResolvedValueOnce(validVerification());
      const { handler, ran } = await proxyHandler('films');
      const res = createMockResponse();
      await handler(
        request('/films/?junk=1', { 'x-api-key': 'k' }, 'api.dorkroom.art'),
        res
      );

      expect(res._status).toBe(200);
      expect(ran).toHaveBeenCalledOnce();
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

    it('should return the same 504 for TimeoutError (AbortSignal.timeout)', async () => {
      const handler = await buildHandler({
        name: 'test',
        handler: async () => {
          throw new DOMException('signal timed out', 'TimeoutError');
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

  describe('real Unkey client', () => {
    it('builds the SDK client with a timeout, so a hung Unkey cannot hold a request', async () => {
      const { createRealUnkeyClient } = await import('../withHandler');
      const client = createRealUnkeyClient('root-key');

      expect(client).toBeInstanceOf(Unkey);
      // `_options` is the SDK's public read-only copy of its constructor options
      expect(client instanceof Unkey && client._options.timeoutMs).toBe(3000);
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
