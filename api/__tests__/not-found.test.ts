import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  createMockRequest,
  createMockResponse,
} from '../../utils/__tests__/mock-vercel';
import handler from '../not-found';

interface Route {
  src?: string;
  dest?: string;
  handle?: string;
  has?: { type: string; value?: string }[];
  continue?: boolean;
}

const { routes } = JSON.parse(
  readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8')
) as { routes: Route[] };

/**
 * Resolves a path the way Vercel walks `routes`: first match wins, `continue`
 * routes only add headers, and host `has` conditions gate the route. The
 * `filesystem` phase is treated as "no static file", and header-gated routes
 * (the crawler rewrite) are skipped because test requests carry no crawler UA.
 */
function resolve(host: string, path: string): string | undefined {
  for (const route of routes) {
    if (route.handle || route.continue || !route.src || !route.dest) continue;
    const gates = route.has ?? [];
    if (gates.some((gate) => gate.type !== 'host')) continue;
    if (gates.some((gate) => gate.value !== host)) continue;
    const match = new RegExp(`^${route.src}$`).exec(path);
    if (match) return route.dest.replace(/\$(\d)/g, (_, n) => match[n] ?? '');
  }
  return undefined;
}

const API_HOST = 'api.dorkroom.art';

describe('api host routing', () => {
  it.each([
    '/film',
    '/v1/films',
    '/recipes',
    '/nope',
    '/index.html',
  ])('sends unknown path %s to the JSON 404 handler', (path) => {
    expect(resolve(API_HOST, path)).toBe('/api/not-found');
  });

  it.each([
    ['/', '/api/docs'],
    ['/openapi.json', '/api/openapi'],
    ['/reference', '/api/reference'],
    ['/films', '/api/films'],
    ['/combinations/', '/api/combinations'],
    ['/api/films', '/api/films'],
  ])('keeps %s on %s', (path, dest) => {
    expect(resolve(API_HOST, path)).toBe(dest);
  });

  it('sends unknown /api/* paths on the api host to the JSON 404 handler', () => {
    expect(resolve(API_HOST, '/api/nope')).toBe('/api/not-found');
    expect(resolve(API_HOST, '/api/filmsx')).toBe('/api/not-found');
    expect(resolve(API_HOST, '/api/films/nope')).toBe('/api/not-found');
    expect(resolve(API_HOST, '/api/films/')).toBe('/api/films/');
  });

  // The api-host /api/* allowlist in vercel.json is hand-maintained; this keeps
  // a new handler file from silently 404ing on api.dorkroom.art/api/<name>.
  it('still routes every handler file under /api/<name> on the api host', () => {
    const names = readdirSync(new URL('..', import.meta.url))
      .filter((file) => /\.tsx?$/.test(file))
      .map((file) => file.replace(/\.tsx?$/, ''))
      .filter((name) => name !== 'not-found');
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      expect(resolve(API_HOST, `/api/${name}`)).toBe(`/api/${name}`);
    }
  });

  it('leaves the site host on the SPA catch-all', () => {
    expect(resolve('dorkroom.art', '/film')).toBe('/');
  });
});

describe('not-found handler', () => {
  it('returns 404 with the documented JSON error shape', () => {
    const res = createMockResponse();
    handler(createMockRequest({ url: '/film' }), res);

    expect(res._status).toBe(404);
    expect(res._json).toEqual({
      error: 'Not found',
      message: expect.any(String),
      requestId: expect.stringMatching(/^[0-9a-f-]{36}$/),
    });
    expect(res._headers['access-control-allow-origin']).toBe('*');
    expect(res._headers['x-content-type-options']).toBe('nosniff');
  });

  it('answers CORS preflight without a 404', () => {
    const res = createMockResponse();
    handler(createMockRequest({ method: 'OPTIONS', url: '/film' }), res);

    expect(res._status).toBe(204);
    expect(res._headers['access-control-allow-headers']).toContain('X-API-Key');
    expect(res._headers['access-control-allow-headers']).toContain(
      'X-Client-Id'
    );
  });
});
