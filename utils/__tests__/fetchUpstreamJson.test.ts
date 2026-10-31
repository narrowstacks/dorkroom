import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchUpstreamJson,
  type FetchUpstreamJsonOptions,
} from '../fetchUpstreamJson';
import type { HandlerContext } from '../requestEnvelope';
import { createMockResponse, type MockVercelResponse } from './mock-vercel';

const URL = 'https://upstream.example/thing';
const CACHE = 'public, max-age=60';

function upstream(
  body: string,
  init: { status?: number; contentType?: string; contentLength?: string } = {}
): Response {
  const headers = new Headers({
    'content-type': init.contentType ?? 'application/json',
  });
  if (init.contentLength !== undefined) {
    headers.set('content-length', init.contentLength);
  }
  return new Response(body, { status: init.status ?? 200, headers });
}

const fetchMock = vi.fn<typeof fetch>();
const originalFetch = globalThis.fetch;

function context(res: MockVercelResponse): HandlerContext {
  return {
    requestId: 'req-1',
    startTime: Date.now(),
    userAgent: 'TestAgent/1.0',
    isPublicApi: false,
    setCacheControl: (value) => {
      res.setHeader('Cache-Control', value);
    },
  };
}

async function run(
  response: Response | Error,
  overrides: Partial<FetchUpstreamJsonOptions> = {},
  bindToResponse?: (
    res: MockVercelResponse
  ) => Partial<FetchUpstreamJsonOptions>
): Promise<MockVercelResponse> {
  if (response instanceof Error) {
    fetchMock.mockRejectedValueOnce(response);
  } else {
    fetchMock.mockResolvedValueOnce(response);
  }
  const res = createMockResponse();
  await fetchUpstreamJson(res, context(res), {
    url: URL,
    headers: { Accept: 'application/json' },
    label: 'example.org',
    cache: CACHE,
    ...overrides,
    ...bindToResponse?.(res),
  });
  return res;
}

beforeEach(() => {
  for (const method of ['log', 'warn', 'error'] as const) {
    vi.spyOn(console, method).mockImplementation(() => {});
  }
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
});

afterEach(() => {
  vi.restoreAllMocks();
  globalThis.fetch = originalFetch;
});

describe('fetchUpstreamJson', () => {
  it('GETs the url with the given headers and a timeout signal', async () => {
    await run(upstream('{}'), { headers: { 'x-proxy-secret': 's' } });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(URL);
    expect(init?.method).toBe('GET');
    expect(init?.headers).toEqual({ 'x-proxy-secret': 's' });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('forwards a JSON body verbatim with 200 and the success cache', async () => {
    const res = await run(upstream('{"data":[1,2]}'));

    expect(res._status).toBe(200);
    expect(res._json).toEqual({ data: [1, 2] });
    expect(res._headers['cache-control']).toBe(CACHE);
  });

  it("logs the row count of a list payload with the caller's fields", async () => {
    const log = vi.mocked(console.log);
    await run(upstream('{"data":[1,2]}'), { logFields: { recipeId: '7' } });

    const completed = log.mock.calls
      .map(([line]) => JSON.parse(String(line)))
      .find((entry) => entry.message === 'API request completed');
    expect(completed).toMatchObject({ dataLength: 2, recipeId: '7' });
  });

  it.each([401, 404, 500])(
    'answers an upstream %i with a generic 502 and no cache header',
    async (status) => {
      const res = await run(upstream('{"error":"secret detail"}', { status }));

      expect(res._status).toBe(502);
      expect(res._json).toEqual({
        error: 'External API error',
        message: 'Upstream service returned an error',
        requestId: 'req-1',
      });
      expect(res._headers['cache-control']).toBeUndefined();
    }
  );

  it('lets onUpstreamStatus claim a non-OK status', async () => {
    const res = await run(upstream('', { status: 404 }), {}, (target) => ({
      onUpstreamStatus: async (response) => {
        target.status(response.status).json({ error: 'gone' });
        return true;
      },
    }));

    expect(res._status).toBe(404);
    expect(res._json).toEqual({ error: 'gone' });
  });

  it('falls through to the 502 when onUpstreamStatus declines', async () => {
    const onUpstreamStatus = vi.fn(async () => false);
    const res = await run(upstream('', { status: 503 }), { onUpstreamStatus });

    expect(onUpstreamStatus).toHaveBeenCalledOnce();
    expect(res._status).toBe(502);
  });

  it('rejects a non-JSON content type with a 502 naming the label', async () => {
    const res = await run(upstream('<html>', { contentType: 'text/html' }));

    expect(res._status).toBe(502);
    expect(res._json).toEqual({
      error: 'Invalid response format',
      message: 'Expected JSON response from example.org',
      requestId: 'req-1',
    });
  });

  it('rejects a declared content-length over 1 MB without parsing', async () => {
    const res = await run(
      upstream('{}', { contentLength: String(1024 * 1024 + 1) })
    );

    expect(res._status).toBe(502);
    expect(res._json).toMatchObject({
      error: 'Response too large',
      message: 'Response from example.org exceeds maximum allowed size',
    });
  });

  it('accepts a declared content-length of exactly 1 MB', async () => {
    const res = await run(
      upstream('{}', { contentLength: String(1024 * 1024) })
    );

    expect(res._status).toBe(200);
  });

  it('answers an unparseable body with a 502', async () => {
    const res = await run(upstream('{not json'));

    expect(res._status).toBe(502);
    expect(res._json).toMatchObject({
      error: 'Response parse error',
      message: 'Could not parse JSON response from example.org',
    });
  });

  it('lets network and timeout failures propagate to the envelope', async () => {
    await expect(run(new TypeError('fetch failed'))).rejects.toThrow(
      'fetch failed'
    );
    const timeout = new DOMException('timed out', 'TimeoutError');
    await expect(run(timeout)).rejects.toBe(timeout);
  });
});
