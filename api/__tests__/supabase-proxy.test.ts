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

async function importEndpoint(name: string) {
  switch (name) {
    case 'films':
      return import('../films.ts');
    case 'developers':
      return import('../developers.ts');
    case 'combinations':
      return import('../combinations.ts');
    default:
      throw new Error(`Unknown endpoint: ${name}`);
  }
}

describe.each([
  {
    endpoint: 'films',
    envKey: 'SUPABASE_ENDPOINT',
    masterKey: 'SUPABASE_MASTER_API_KEY',
  },
  {
    endpoint: 'developers',
    envKey: 'SUPABASE_ENDPOINT',
    masterKey: 'SUPABASE_MASTER_API_KEY',
  },
  {
    endpoint: 'combinations',
    envKey: 'SUPABASE_ENDPOINT',
    masterKey: 'SUPABASE_MASTER_API_KEY',
  },
])('$endpoint endpoint', ({ endpoint, envKey, masterKey }) => {
  let handler: Function;

  beforeEach(async () => {
    vi.resetModules();
    process.env[masterKey] = 'test-master-key';
    process.env[envKey] = 'https://test.supabase.co';

    const mod = await importEndpoint(endpoint);
    handler = mod.default;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env[masterKey];
    delete process.env[envKey];
  });

  describe('upstream error handling', () => {
    it('should return 502 for non-OK upstream responses (not reflected status)', async () => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValue(
            createJsonResponse(null, { ok: false, status: 403 })
          )
      );

      const req = { query: {} } as any;
      const res = {
        _status: 0,
        _json: undefined as unknown,
        _headers: {} as Record<string, string>,
        setHeader(name: string, value: string) {
          this._headers[name] = value;
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

      await handler(req, res, createMockCtx());

      expect(res._status).toBe(502);
      const body = res._json as Record<string, unknown>;
      expect(body.error).toBe('External API error');
      expect(body).not.toHaveProperty('status');
    });

    it('should not include upstream status codes like 401, 500 in response', async () => {
      for (const upstreamStatus of [401, 403, 500, 503]) {
        vi.stubGlobal(
          'fetch',
          vi
            .fn()
            .mockResolvedValue(
              createJsonResponse(null, { ok: false, status: upstreamStatus })
            )
        );

        const res = {
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

        await handler({ query: {} } as any, res, createMockCtx());

        expect(res._status).toBe(502);
        const body = res._json as Record<string, unknown>;
        expect(body).not.toHaveProperty('status');
      }
    });
  });

  describe('content type error handling', () => {
    it('should not include contentType in error response body', async () => {
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

      const res = {
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

      await handler({ query: {} } as any, res, createMockCtx());

      expect(res._status).toBe(502);
      const body = res._json as Record<string, unknown>;
      expect(body.error).toBe('Invalid response format');
      expect(body).not.toHaveProperty('contentType');
    });
  });

  describe('response size limit', () => {
    it('should reject responses exceeding 1MB', async () => {
      const oversizeLength = String(1024 * 1024 + 1);
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          createJsonResponse(
            { data: [] },
            {
              ok: true,
              status: 200,
              contentType: 'application/json',
              contentLength: oversizeLength,
            }
          )
        )
      );

      const res = {
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

      await handler({ query: {} } as any, res, createMockCtx());

      expect(res._status).toBe(502);
      expect((res._json as Record<string, unknown>).error).toBe(
        'Response too large'
      );
    });

    it('should allow responses within 1MB', async () => {
      const validLength = String(1024 * 1024);
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          createJsonResponse(
            { data: [] },
            {
              ok: true,
              status: 200,
              contentType: 'application/json',
              contentLength: validLength,
            }
          )
        )
      );

      const res = {
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

      await handler({ query: {} } as any, res, createMockCtx());

      expect(res._status).toBe(200);
    });

    it('should allow responses without content-length header', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          createJsonResponse(
            { data: [] },
            {
              ok: true,
              status: 200,
              contentType: 'application/json',
            }
          )
        )
      );

      const res = {
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

      await handler({ query: {} } as any, res, createMockCtx());

      expect(res._status).toBe(200);
    });
  });

  describe('successful responses', () => {
    it('should return 200 with data for successful upstream response', async () => {
      const mockData = { data: [{ id: 1, name: 'Test' }] };
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValue(
            createJsonResponse(mockData, { ok: true, status: 200 })
          )
      );

      const res = {
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

      await handler({ query: {} } as any, res, createMockCtx());

      expect(res._status).toBe(200);
      expect(res._json).toEqual(mockData);
    });
  });
});
