import type { IncomingHttpHeaders } from 'node:http';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import type { VercelRequest, VercelResponse } from '@vercel/node';

/** Any value `JSON.stringify` round-trips — the contract of `res.json(body)`. */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export function createMockRequest(
  overrides: {
    method?: string;
    url?: string;
    headers?: IncomingHttpHeaders;
    query?: Record<string, string | string[]>;
  } = {}
): VercelRequest {
  const vercelFields: Pick<VercelRequest, 'query' | 'cookies' | 'body'> = {
    query: overrides.query ?? {},
    cookies: {},
    body: undefined,
  };
  const req = Object.assign(new IncomingMessage(new Socket()), vercelFields);

  req.method = overrides.method ?? 'GET';
  req.url = overrides.url ?? '/api/test';
  req.headers = {
    host: 'dorkroom.art',
    'user-agent': 'TestAgent/1.0',
    ...overrides.headers,
  };

  return req;
}

/** Everything a handler wrote to the response, recorded for assertions. */
interface RecordedResponse {
  _status: number;
  _json: JsonValue | undefined;
  _headers: Record<string, string | string[]>;
  _ended: boolean;
  _sent: string;
}

export type MockVercelResponse = VercelResponse & RecordedResponse;

export function createMockResponse(): MockVercelResponse {
  const headers: Record<string, string | string[]> = {};
  const recorded: RecordedResponse = {
    _status: 0,
    _json: undefined,
    _headers: headers,
    _ended: false,
    _sent: '',
  };

  const res: MockVercelResponse = Object.assign(
    new ServerResponse(new IncomingMessage(new Socket())),
    recorded,
    {
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
      json(body: JsonValue) {
        res._json = body;
        res._ended = true;
        return res;
      },
      send(body: string) {
        res._sent = body;
        res._ended = true;
        return res;
      },
      redirect(statusOrUrl: string | number, url?: string) {
        // `redirect(url)` defaults to 307; `redirect(status, url)` sets both.
        res._status = url === undefined ? 307 : Number(statusOrUrl);
        headers.location = url ?? String(statusOrUrl);
        res._ended = true;
        return res;
      },
      end() {
        res._ended = true;
        return res;
      },
    }
  );

  // `withHandler` checks `writableEnded` before writing a late error response;
  // the mock never runs the real stream, so derive it from what was recorded.
  Object.defineProperty(res, 'writableEnded', {
    get: () => res._ended,
    configurable: true,
  });

  return res;
}
