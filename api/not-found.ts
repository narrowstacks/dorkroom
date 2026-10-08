import { randomUUID } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { serverlessWarn } from '../utils/serverlessLogger';

/**
 * JSON 404 for api.dorkroom.art paths that map to no endpoint. `vercel.json`
 * routes the api host's unmatched paths here instead of the SPA catch-all.
 *
 * A plain handler, not `withHandler`: that wrapper demands an API key on the
 * api host, so a mistyped path would get a 401 (or a 500 when Unkey env is
 * missing) instead of a 404, and every junk request would cost a key check.
 */
export default function handler(req: VercelRequest, res: VercelResponse): void {
  const requestId = randomUUID();

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  serverlessWarn('Unknown api path', {
    requestId,
    method: req.method ?? 'GET',
    url: req.url ?? '',
  });

  res.status(404).json({
    error: 'Not found',
    message: 'No endpoint exists at this path. See https://api.dorkroom.art/',
    requestId,
  });
}
