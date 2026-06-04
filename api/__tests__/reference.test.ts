import { describe, expect, it } from 'vitest';
import {
  createMockRequest,
  createMockResponse,
} from '../../utils/__tests__/mock-vercel';
import handler from '../reference';

describe('reference endpoint', () => {
  it('serves the Scalar reference HTML for GET', () => {
    const req = createMockRequest({ method: 'GET' });
    const res = createMockResponse();
    handler(req, res);

    expect(res._status).toBe(200);
    expect(res._headers['content-type']).toBe('text/html; charset=utf-8');
    expect(res._sent).toContain('Dorkroom API Reference');
    expect(res._sent).toContain('@scalar/api-reference');
  });

  it('points at the same-origin spec by default', () => {
    const req = createMockRequest({ headers: { host: 'dorkroom.art' } });
    const res = createMockResponse();
    handler(req, res);

    expect(res._sent).toContain('data-url="/api/openapi"');
  });

  it('points at the bare spec path on the public API host', () => {
    const req = createMockRequest({ headers: { host: 'api.dorkroom.art' } });
    const res = createMockResponse();
    handler(req, res);

    expect(res._sent).toContain('data-url="/openapi.json"');
  });

  it('rejects non-GET methods with 405', () => {
    const req = createMockRequest({ method: 'POST' });
    const res = createMockResponse();
    handler(req, res);

    expect(res._status).toBe(405);
    expect(res._headers.allow).toBe('GET');
  });
});
