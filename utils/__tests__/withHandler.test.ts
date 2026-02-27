import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockRequest, createMockResponse } from './mock-vercel';

vi.mock('../serverlessLogger', () => ({
  logApiRequest: vi.fn(),
  logApiError: vi.fn(),
  serverlessLog: vi.fn(),
  serverlessWarn: vi.fn(),
  serverlessError: vi.fn(),
}));

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('withHandler', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.UNKEY_ROOT_KEY;
    delete process.env.UNKEY_API_ID;
    delete process.env.UNKEY_API_KEY_PERMISSION;
    delete process.env.UNKEY_ANON_NAMESPACE;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function getHandler() {
    const mod = await import('../withHandler');
    return mod.withHandler;
  }

  describe('request ID generation', () => {
    it('should generate a UUID request ID', async () => {
      const withHandler = await getHandler();
      let capturedRequestId = '';
      const handler = withHandler({
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
      const withHandler = await getHandler();
      const handler = withHandler({
        name: 'test',
        handler: async () => {},
      });

      const req = createMockRequest({ method: 'POST' });
      const res = createMockResponse();
      await handler(req, res);

      expect(res._status).toBe(405);
      const body = res._json as Record<string, unknown>;
      expect(body.requestId).toMatch(UUID_REGEX);
    });
  });

  describe('security headers', () => {
    it('should set X-Content-Type-Options: nosniff', async () => {
      const withHandler = await getHandler();
      const handler = withHandler({
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
      const withHandler = await getHandler();
      const handler = withHandler({
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
      const withHandler = await getHandler();
      const handler = withHandler({
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
      const withHandler = await getHandler();
      const handler = withHandler({
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
      const withHandler = await getHandler();
      const handler = withHandler({
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
      const withHandler = await getHandler();
      const handler = withHandler({
        name: 'test',
        handler: async () => {},
      });

      for (const method of ['POST', 'PUT', 'DELETE', 'PATCH']) {
        const req = createMockRequest({ method });
        const res = createMockResponse();
        await handler(req, res);

        expect(res._status).toBe(405);
        expect((res._json as Record<string, unknown>).error).toBe(
          'Method not allowed'
        );
      }
    });
  });

  describe('required environment variables', () => {
    it('should return 500 when required env vars are missing', async () => {
      const withHandler = await getHandler();
      const handler = withHandler({
        name: 'test',
        requiredEnv: ['SOME_MISSING_VAR'],
        handler: async () => {},
      });

      const req = createMockRequest();
      const res = createMockResponse();
      await handler(req, res);

      expect(res._status).toBe(500);
      expect((res._json as Record<string, unknown>).error).toBe(
        'API configuration error'
      );
    });
  });

  describe('host-based routing', () => {
    it('should treat dorkroom.art as anonymous (non-public API)', async () => {
      const withHandler = await getHandler();
      let capturedIsPublic = true;
      const handler = withHandler({
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
      const withHandler = await getHandler();
      const handler = withHandler({
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
      const withHandler = await getHandler();
      const handler = withHandler({
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
      const withHandler = await getHandler();
      let capturedIsPublic = true;
      const handler = withHandler({
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
      const withHandler = await getHandler();
      const handler = withHandler({
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

  describe('error handling', () => {
    it('should return 504 for AbortError (timeout)', async () => {
      const withHandler = await getHandler();
      const handler = withHandler({
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
      expect((res._json as Record<string, unknown>).error).toBe(
        'Request timeout'
      );
    });

    it('should return 502 for fetch TypeError', async () => {
      const withHandler = await getHandler();
      const handler = withHandler({
        name: 'test',
        handler: async () => {
          throw new TypeError('fetch failed');
        },
      });

      const req = createMockRequest();
      const res = createMockResponse();
      await handler(req, res);

      expect(res._status).toBe(502);
      expect((res._json as Record<string, unknown>).error).toBe(
        'Network error'
      );
    });

    it('should return 500 for generic errors', async () => {
      const withHandler = await getHandler();
      const handler = withHandler({
        name: 'test',
        handler: async () => {
          throw new Error('Something broke');
        },
      });

      const req = createMockRequest();
      const res = createMockResponse();
      await handler(req, res);

      expect(res._status).toBe(500);
      expect((res._json as Record<string, unknown>).error).toBe(
        'Internal server error'
      );
    });

    it('should not write to response if already ended', async () => {
      const withHandler = await getHandler();
      const handler = withHandler({
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
      const withHandler = await getHandler();
      let capturedUA = '';
      const handler = withHandler({
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
      const withHandler = await getHandler();
      let capturedUA = '';
      const handler = withHandler({
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
