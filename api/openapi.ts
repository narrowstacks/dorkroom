import type { VercelRequest, VercelResponse } from '@vercel/node';
import spec from './openapi.json';

/**
 * Serves the OpenAPI 3.1 description of the public Dorkroom API.
 *
 * The document is generated from the Zod schemas by
 * `scripts/generate-openapi.ts` (`bun run openapi:generate`) and committed as
 * `openapi.json`. CORS is permissive so external tooling (Swagger UI, codegen,
 * Postman, etc.) can fetch the spec cross-origin.
 */
export default function handler(req: VercelRequest, res: VercelResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed', allowed: ['GET'] });
    return;
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader(
    'Cache-Control',
    'public, max-age=300, stale-while-revalidate=600'
  );
  res.status(200).json(spec);
}
