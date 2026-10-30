import type { VercelApiHandler } from '@vercel/node';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createMockRequest,
  createMockResponse,
} from '../../utils/__tests__/mock-vercel';
import type { EnvelopeHandler } from '../../utils/requestEnvelope';
import combinations from '../combinations';
import developers from '../developers';
import docs from '../docs';
import filmdev from '../filmdev';
import films from '../films';
import meta from '../meta';
import notFound from '../not-found';
import openapi from '../openapi';
import reference from '../reference';
import stats from '../stats';

/**
 * Every Node handler in `api/` runs inside the request envelope, so OPTIONS,
 * the method guard, `Allow` and CORS behave the same everywhere. Each row is
 * one deployed handler and the envelope policy it declares; the assertions
 * below are shared. None of these requests reach handler code (preflight and
 * 405 answer first), so no upstream is called.
 */
interface EnvelopeCase {
  name: string;
  handler: VercelApiHandler;
  /** Value of `Allow`, or null when the handler takes every method. */
  allow: string | null;
  /** Hosts that receive permissive CORS headers. */
  corsOn: 'none' | 'public-api' | 'any-host';
}

const CASES: EnvelopeCase[] = [
  { name: 'docs', handler: docs, allow: 'GET, OPTIONS', corsOn: 'none' },
  {
    name: 'reference',
    handler: reference,
    allow: 'GET, OPTIONS',
    corsOn: 'none',
  },
  {
    name: 'openapi',
    handler: openapi,
    allow: 'GET, OPTIONS',
    corsOn: 'any-host',
  },
  { name: 'meta', handler: meta, allow: 'GET, HEAD, OPTIONS', corsOn: 'none' },
  { name: 'not-found', handler: notFound, allow: null, corsOn: 'any-host' },
  {
    name: 'filmdev',
    handler: filmdev,
    allow: 'GET, OPTIONS',
    corsOn: 'public-api',
  },
  {
    name: 'films',
    handler: films,
    allow: 'GET, OPTIONS',
    corsOn: 'public-api',
  },
  {
    name: 'developers',
    handler: developers,
    allow: 'GET, OPTIONS',
    corsOn: 'public-api',
  },
  {
    name: 'combinations',
    handler: combinations,
    allow: 'GET, OPTIONS',
    corsOn: 'public-api',
  },
  {
    name: 'stats',
    handler: stats,
    allow: 'GET, OPTIONS',
    corsOn: 'public-api',
  },
];

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const originalFetch = globalThis.fetch;
const fetchSpy = vi.fn<typeof fetch>();

/** Calls the real Unkey SDK made through the stubbed `fetch`. */
function unkeyCalls(): string[] {
  return fetchSpy.mock.calls
    .map(([input]) => (input instanceof Request ? input.url : String(input)))
    .filter((url) => url.includes('unkey'));
}

beforeEach(() => {
  for (const method of ['log', 'warn', 'error'] as const) {
    vi.spyOn(console, method).mockImplementation(() => {});
  }
  globalThis.fetch = fetchSpy;
  fetchSpy.mockReset();
  // Fully configured Unkey, so a request that reached the key layer would
  // call it.
  vi.stubEnv('UNKEY_ROOT_KEY', 'root-key');
  vi.stubEnv('UNKEY_API_ID', 'test-api');
  vi.stubEnv('UNKEY_API_KEY_PERMISSION', 'read');
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  globalThis.fetch = originalFetch;
});

describe.each(CASES)(
  '$name: request envelope',
  ({ handler, allow, corsOn }) => {
    it('answers OPTIONS with 204, nosniff and Allow, before any handler code', async () => {
      const res = createMockResponse();
      await handler(createMockRequest({ method: 'OPTIONS' }), res);

      expect(res._status).toBe(204);
      expect(res._ended).toBe(true);
      expect(res._json).toBeUndefined();
      expect(res._headers['x-content-type-options']).toBe('nosniff');
      expect(res._headers.allow).toBe(allow ?? undefined);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it.each(['POST', 'PUT', 'DELETE', 'PATCH'])(
      'guards %s with the shared 405 (or the 404 for a handler that takes any method)',
      async (method) => {
        const res = createMockResponse();
        await handler(createMockRequest({ method }), res);

        expect(fetchSpy).not.toHaveBeenCalled();
        expect(res._headers['x-content-type-options']).toBe('nosniff');
        if (allow === null) {
          expect(res._status).toBe(404);
          expect(res._headers.allow).toBeUndefined();
          return;
        }
        expect(res._status).toBe(405);
        expect(res._headers.allow).toBe(allow);
        expect(res._json).toEqual({
          error: 'Method not allowed',
          allowed: allow.split(', '),
          requestId: expect.stringMatching(UUID_REGEX),
        });
      }
    );

    it.each(['OPTIONS', 'POST'])(
      'answers %s on api.dorkroom.art without any Unkey call (no key check, no rate limit)',
      async (method) => {
        const res = createMockResponse();
        await handler(
          createMockRequest({
            method,
            headers: { host: 'api.dorkroom.art', 'x-api-key': 'dk_f_test' },
          }),
          res
        );

        expect(res._status).toBe(
          method === 'OPTIONS' ? 204 : allow === null ? 404 : 405
        );
        expect(unkeyCalls()).toEqual([]);
      }
    );

    it.each([
      ['dorkroom.art', corsOn === 'any-host'],
      ['api.dorkroom.art', corsOn !== 'none'],
    ])('on %s sends permissive CORS: %s', async (host, expected) => {
      const res = createMockResponse();
      await handler(
        createMockRequest({ method: 'OPTIONS', headers: { host } }),
        res
      );

      if (!expected) {
        expect(res._headers['access-control-allow-origin']).toBeUndefined();
        expect(res._headers['access-control-allow-methods']).toBeUndefined();
        expect(res._headers['access-control-allow-headers']).toBeUndefined();
        return;
      }
      expect(res._headers['access-control-allow-origin']).toBe('*');
      expect(res._headers['access-control-allow-methods']).toBe(
        allow ?? 'GET, OPTIONS'
      );
      expect(res._headers['access-control-allow-headers']).toBe(
        'Content-Type, Authorization, X-Requested-With, X-API-Key, X-Client-Id'
      );
      expect(res._headers['access-control-max-age']).toBe('86400');
    });
  }
);

describe('Unkey traffic (control for the key-check assertions above)', () => {
  it('is what a keyed GET on a data endpoint actually calls', async () => {
    vi.stubEnv('SUPABASE_MASTER_API_KEY', 'k');
    vi.stubEnv('SUPABASE_ENDPOINT', 'https://test.supabase.co');
    vi.stubEnv('SUPABASE_PROXY_SECRET', 's');
    fetchSpy.mockResolvedValue(
      Response.json(
        {
          meta: { requestId: 'unkey' },
          data: { valid: false, code: 'NOT_FOUND' },
        },
        { status: 200 }
      )
    );
    const res = createMockResponse();
    await films(
      createMockRequest({
        headers: { host: 'api.dorkroom.art', 'x-api-key': 'dk_f_test' },
      }),
      res
    );

    expect(unkeyCalls()).toEqual([expect.stringContaining('keys.verifyKey')]);
    expect(res._status).toBe(401);
  });
});

describe('withEnvelope', () => {
  async function load() {
    const { withEnvelope } = await import('../../utils/requestEnvelope');
    return withEnvelope;
  }

  it('maps a fetch TypeError that escapes the handler to a JSON 502', async () => {
    const withEnvelope = await load();
    const handler = withEnvelope(
      { name: 'test', methods: ['GET'], cors: 'none' },
      async () => {
        throw new TypeError('fetch failed');
      }
    );

    const res = createMockResponse();
    await handler(createMockRequest(), res);

    expect(res._status).toBe(502);
    expect(res._json).toMatchObject({ error: 'Network error' });
  });

  it('answers 500 before the handler when a required env var is missing', async () => {
    const withEnvelope = await load();
    const ran = vi.fn();
    const handler = withEnvelope(
      {
        name: 'test',
        methods: ['GET'],
        cors: 'none',
        requiredEnv: ['ENVELOPE_TEST_UNSET_VAR'],
      },
      ran
    );

    const res = createMockResponse();
    await handler(createMockRequest(), res);

    expect(res._status).toBe(500);
    expect(ran).not.toHaveBeenCalled();
  });

  it("keeps a cache.always value over the handler's setCacheControl on every host", async () => {
    const withEnvelope = await load();
    const handler = withEnvelope(
      {
        name: 'test',
        methods: ['GET'],
        cors: 'none',
        cache: { always: 'no-store' },
      },
      (_req, res, ctx) => {
        ctx.setCacheControl('public, max-age=300');
        res.status(200).json({ ok: true });
      }
    );

    for (const host of ['dorkroom.art', 'api.dorkroom.art']) {
      const res = createMockResponse();
      await handler(createMockRequest({ headers: { host } }), res);
      expect(res._headers['cache-control']).toBe('no-store');
    }
  });

  it('serves HEAD only to a policy that lists it', async () => {
    const withEnvelope = await load();
    const serve: EnvelopeHandler = (_req, res) => {
      res.status(200).end();
    };
    const getOnly = withEnvelope(
      { name: 'a', methods: ['GET'], cors: 'none' },
      serve
    );
    const withHead = withEnvelope(
      { name: 'b', methods: ['GET', 'HEAD'], cors: 'none' },
      serve
    );

    const rejected = createMockResponse();
    await getOnly(createMockRequest({ method: 'HEAD' }), rejected);
    const served = createMockResponse();
    await withHead(createMockRequest({ method: 'HEAD' }), served);

    expect(rejected._status).toBe(405);
    expect(served._status).toBe(200);
  });
});
