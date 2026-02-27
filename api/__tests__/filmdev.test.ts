import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/serverlessLogger', () => ({
  logApiRequest: vi.fn(),
  logApiResponse: vi.fn(),
  logApiError: vi.fn(),
  logExternalApiCall: vi.fn(),
  logExternalApiResponse: vi.fn(),
  serverlessLog: vi.fn(),
  serverlessWarn: vi.fn(),
  serverlessError: vi.fn(),
}));

vi.mock('../../utils/withHandler', () => ({
  withHandler: (config: { handler: Function }) => config.handler,
}));

vi.mock('../../utils/timeoutSignal', () => ({
  createTimeoutSignal: () => undefined,
}));

function createMockCtx() {
  return {
    requestId: 'test-request-id',
    startTime: Date.now(),
    userAgent: 'TestAgent/1.0',
    isPublicApi: false,
  };
}

function createJsonResponse(
  data: unknown,
  overrides: {
    ok?: boolean;
    status?: number;
    contentType?: string;
    contentLength?: string;
  } = {}
) {
  const headers = new Map<string, string>();
  headers.set('content-type', overrides.contentType ?? 'application/json');
  if (overrides.contentLength) {
    headers.set('content-length', overrides.contentLength);
  }

  return {
    ok: overrides.ok ?? true,
    status: overrides.status ?? 200,
    headers: { get: (name: string) => headers.get(name) ?? null },
    json: () => Promise.resolve(data),
  };
}

function createRes() {
  return {
    _status: 0,
    _json: undefined as unknown,
    _headers: {} as Record<string, string>,
    setHeader(n: string, v: string) {
      this._headers[n] = v;
      return this;
    },
    status(code: number) {
      this._status = code;
      return this;
    },
    json(body: unknown) {
      this._json = body;
      return this;
    },
  };
}

describe('filmdev endpoint', () => {
  let handler: Function;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../filmdev');
    handler = mod.default;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('recipe ID validation', () => {
    it('should reject missing recipe ID', async () => {
      const res = createRes();
      await handler({ query: {} } as any, res, createMockCtx());

      expect(res._status).toBe(400);
      expect((res._json as Record<string, unknown>).error).toBe(
        'Invalid recipe ID'
      );
    });

    it('should reject non-numeric recipe ID', async () => {
      const res = createRes();
      await handler({ query: { id: 'abc' } } as any, res, createMockCtx());

      expect(res._status).toBe(400);
    });

    it('should reject zero', async () => {
      const res = createRes();
      await handler({ query: { id: '0' } } as any, res, createMockCtx());

      expect(res._status).toBe(400);
    });

    it('should reject negative numbers', async () => {
      const res = createRes();
      await handler({ query: { id: '-1' } } as any, res, createMockCtx());

      expect(res._status).toBe(400);
    });

    it('should reject IDs exceeding max', async () => {
      const res = createRes();
      await handler({ query: { id: '10000000' } } as any, res, createMockCtx());

      expect(res._status).toBe(400);
    });

    it('should accept valid recipe IDs', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(createJsonResponse({ recipe: {} }))
      );

      const res = createRes();
      await handler({ query: { id: '12345' } } as any, res, createMockCtx());

      expect(res._status).toBe(200);
    });
  });

  describe('upstream error handling', () => {
    it('should return 502 for non-OK non-404 upstream responses', async () => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValue(
            createJsonResponse(null, { ok: false, status: 500 })
          )
      );

      const res = createRes();
      await handler({ query: { id: '123' } } as any, res, createMockCtx());

      expect(res._status).toBe(502);
      const body = res._json as Record<string, unknown>;
      expect(body.error).toBe('External API error');
      expect(body).not.toHaveProperty('status');
    });

    it('should return 404 when upstream returns 404', async () => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValue(
            createJsonResponse(null, { ok: false, status: 404 })
          )
      );

      const res = createRes();
      await handler({ query: { id: '123' } } as any, res, createMockCtx());

      expect(res._status).toBe(404);
      expect((res._json as Record<string, unknown>).error).toBe(
        'Recipe not found'
      );
    });
  });

  describe('content type error handling', () => {
    it('should not include contentType in error response', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          createJsonResponse(null, {
            ok: true,
            status: 200,
            contentType: 'text/html',
          })
        )
      );

      const res = createRes();
      await handler({ query: { id: '123' } } as any, res, createMockCtx());

      expect(res._status).toBe(502);
      const body = res._json as Record<string, unknown>;
      expect(body.error).toBe('Invalid response format');
      expect(body).not.toHaveProperty('contentType');
    });
  });

  describe('User-Agent', () => {
    it('should send fixed User-Agent to filmdev.org', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(createJsonResponse({ recipe: {} }));
      vi.stubGlobal('fetch', fetchMock);

      const res = createRes();
      await handler({ query: { id: '123' } } as any, res, createMockCtx());

      const fetchCall = fetchMock.mock.calls[0];
      const headers = fetchCall[1].headers as Record<string, string>;
      expect(headers['User-Agent']).toBe('Dorkroom-API/1.0');
    });
  });

  describe('response size limit', () => {
    it('should reject responses exceeding 1MB', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          createJsonResponse(
            { recipe: {} },
            {
              ok: true,
              status: 200,
              contentType: 'application/json',
              contentLength: String(1024 * 1024 + 1),
            }
          )
        )
      );

      const res = createRes();
      await handler({ query: { id: '123' } } as any, res, createMockCtx());

      expect(res._status).toBe(502);
      expect((res._json as Record<string, unknown>).error).toBe(
        'Response too large'
      );
    });
  });
});
