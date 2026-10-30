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

    // Paths and schemas are pinned by the drift guard in
    // packages/api/src/dorkroom/__tests__/openapi.test.ts; here we only check
    // the handler serves a document at all.
    expect(res._json).toMatchObject({ openapi: '3.1.0' });
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
