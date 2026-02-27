import { describe, expect, it } from 'vitest';
import {
  createMockRequest,
  createMockResponse,
} from '../../utils/__tests__/mock-vercel';
import handler from '../docs';

describe('docs endpoint', () => {
  describe('security headers', () => {
    it('should set X-Content-Type-Options: nosniff', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      handler(req, res);

      expect(res._headers['x-content-type-options']).toBe('nosniff');
    });

    it('should set X-Frame-Options: DENY', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      handler(req, res);

      expect(res._headers['x-frame-options']).toBe('DENY');
    });
  });

  describe('content type', () => {
    it('should set Content-Type to text/html', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      handler(req, res);

      expect(res._headers['content-type']).toBe('text/html; charset=utf-8');
    });
  });

  describe('method guard', () => {
    it('should return 200 for GET requests', () => {
      const req = createMockRequest({ method: 'GET' });
      const res = createMockResponse();
      handler(req, res);

      expect(res._status).toBe(200);
    });

    it('should return 405 for non-GET methods', () => {
      for (const method of ['POST', 'PUT', 'DELETE', 'PATCH']) {
        const req = createMockRequest({ method });
        const res = createMockResponse();
        handler(req, res);

        expect(res._status).toBe(405);
        expect(res._headers.allow).toBe('GET');
      }
    });
  });

  describe('response content', () => {
    it('should return HTML containing Dorkroom API title', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      handler(req, res);

      expect(res._sent).toContain('<title>Dorkroom API</title>');
      expect(res._sent).toContain('Dorkroom Developer API');
    });

    it('should set cache headers', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      handler(req, res);

      expect(res._headers['cache-control']).toBe(
        'public, max-age=300, stale-while-revalidate=600'
      );
    });
  });
});
