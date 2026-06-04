import { describe, expect, it } from 'vitest';
import {
  createMockRequest,
  createMockResponse,
} from '../../utils/__tests__/mock-vercel';
import handler from '../openapi';

describe('openapi endpoint', () => {
  it('serves the OpenAPI document as JSON for GET', () => {
    const req = createMockRequest({ method: 'GET' });
    const res = createMockResponse();
    handler(req, res);

    expect(res._status).toBe(200);
    expect(res._headers['content-type']).toBe(
      'application/json; charset=utf-8'
    );

    const doc = res._json as Record<string, unknown>;
    expect(doc.openapi).toBe('3.1.0');
    expect(Object.keys(doc.paths as object)).toEqual(
      expect.arrayContaining([
        '/films',
        '/developers',
        '/combinations',
        '/stats',
        '/filmdev',
      ])
    );
    const components = doc.components as { schemas: Record<string, unknown> };
    expect(components.schemas.RawFilm).toBeDefined();
    expect(components.schemas.ErrorResponse).toBeDefined();
  });

  it('sets permissive CORS and cache headers', () => {
    const req = createMockRequest({ method: 'GET' });
    const res = createMockResponse();
    handler(req, res);

    expect(res._headers['access-control-allow-origin']).toBe('*');
    expect(res._headers['cache-control']).toBe(
      'public, max-age=300, stale-while-revalidate=600'
    );
  });

  it('handles OPTIONS preflight with 204', () => {
    const req = createMockRequest({ method: 'OPTIONS' });
    const res = createMockResponse();
    handler(req, res);

    expect(res._status).toBe(204);
    expect(res._headers['access-control-allow-origin']).toBe('*');
  });

  it('rejects non-GET methods with 405', () => {
    for (const method of ['POST', 'PUT', 'DELETE']) {
      const req = createMockRequest({ method });
      const res = createMockResponse();
      handler(req, res);

      expect(res._status).toBe(405);
      expect(res._headers.allow).toBe('GET');
    }
  });
});
