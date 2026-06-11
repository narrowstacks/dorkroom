import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Interactive API reference (Scalar) for the public Dorkroom API.
 *
 * Renders the committed OpenAPI document served by `/openapi.json`. The spec
 * URL is resolved from the request host so the page works both on the public
 * API host (`api.dorkroom.art/reference`) and same-origin
 * (`dorkroom.art/api/reference`).
 */
function getSpecUrl(req: VercelRequest): string {
  const hostHeader = req.headers.host ?? '';
  const host = (Array.isArray(hostHeader) ? hostHeader[0] : hostHeader)
    .split(',')[0]
    .trim()
    .toLowerCase();

  // On the dedicated API host the spec is routed to the bare path; everywhere
  // else (same-origin app, previews, localhost) it lives under /api.
  return host.startsWith('api.') ? '/openapi.json' : '/api/openapi';
}

export default function handler(req: VercelRequest, res: VercelResponse): void {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).send('Method Not Allowed');
    return;
  }

  const specUrl = getSpecUrl(req);

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Dorkroom API Reference</title>
    <style>
      body {
        margin: 0;
      }
    </style>
  </head>
  <body>
    <script
      id="api-reference"
      data-url="${specUrl}"
      data-configuration='{"theme":"kepler","hideClientButton":false}'
    ></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader(
    'Cache-Control',
    'public, max-age=300, stale-while-revalidate=600'
  );
  res.status(200).send(html);
}
