import type { IncomingHttpHeaders } from 'node:http';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export function createMockRequest(
  overrides: {
    method?: string;
    url?: string;
    headers?: IncomingHttpHeaders;
    query?: Record<string, string | string[]>;
  } = {}
): VercelRequest {
  return {
    method: overrides.method ?? 'GET',
    url: overrides.url ?? '/api/test',
    headers: {
      host: 'dorkroom.art',
      'user-agent': 'TestAgent/1.0',
      ...overrides.headers,
    },
    query: overrides.query ?? {},
  } as unknown as VercelRequest;
}

export function createMockResponse(): VercelResponse & {
  _status: number;
  _json: unknown;
  _headers: Record<string, string | string[]>;
  _ended: boolean;
  _sent: string;
} {
  const headers: Record<string, string | string[]> = {};
  const res = {
    _status: 0,
    _json: undefined as unknown,
    _headers: headers,
    _ended: false,
    _sent: '',
    writableEnded: false,
    setHeader(name: string, value: string | string[]) {
      headers[name.toLowerCase()] = value;
      return res;
    },
    getHeader(name: string) {
      return headers[name.toLowerCase()];
    },
    status(code: number) {
      res._status = code;
      return res;
    },
    json(body: unknown) {
      res._json = body;
      res._ended = true;
      res.writableEnded = true;
      return res;
    },
    send(body: string) {
      res._sent = body;
      res._ended = true;
      res.writableEnded = true;
      return res;
    },
    end() {
      res._ended = true;
      res.writableEnded = true;
      return res;
    },
  };

  return res as unknown as VercelResponse & typeof res;
}
