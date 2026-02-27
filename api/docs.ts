import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse): void {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).send('Method Not Allowed');
    return;
  }

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Dorkroom API</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #0f172a;
        --panel: #111827;
        --panel-border: #1f2937;
        --text: #e5e7eb;
        --muted: #9ca3af;
        --accent: #f97316;
        --ok: #22c55e;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        background:
          radial-gradient(circle at 10% 10%, rgba(249, 115, 22, 0.2), transparent 40%),
          radial-gradient(circle at 90% 10%, rgba(34, 197, 94, 0.16), transparent 35%),
          var(--bg);
        color: var(--text);
      }

      main {
        width: min(980px, 92vw);
        margin: 0 auto;
        padding: 48px 0 72px;
      }

      h1,
      h2 {
        margin: 0 0 12px;
      }

      p {
        margin: 8px 0;
        color: var(--muted);
        line-height: 1.5;
      }

      .hero {
        border: 1px solid var(--panel-border);
        background: rgba(17, 24, 39, 0.88);
        border-radius: 16px;
        padding: 24px;
        backdrop-filter: blur(4px);
      }

      code {
        color: var(--accent);
      }

      .section {
        margin-top: 18px;
        border: 1px solid var(--panel-border);
        background: rgba(17, 24, 39, 0.88);
        border-radius: 16px;
        padding: 24px;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 12px;
      }

      th,
      td {
        text-align: left;
        border-bottom: 1px solid var(--panel-border);
        padding: 10px 8px;
        vertical-align: top;
      }

      th {
        color: var(--text);
      }

      td {
        color: var(--muted);
      }

      .chip {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 999px;
        border: 1px solid rgba(34, 197, 94, 0.5);
        color: var(--ok);
        font-size: 12px;
      }

      a {
        color: var(--accent);
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <h1>Dorkroom Developer API</h1>
        <p>Base URL: <code>https://api.dorkroom.art</code></p>
        <p>
          Authentication: send your key as <code>X-API-Key: dk_...</code> on every request.
        </p>
        <p><span class="chip">GET only</span></p>
      </section>

      <section class="section">
        <h2>Endpoints</h2>
        <table>
          <thead>
            <tr>
              <th>Endpoint</th>
              <th>Description</th>
              <th>Query Params</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>/films</code></td>
              <td>Film database search and filtering.</td>
              <td><code>query</code>, <code>fuzzy</code>, <code>limit</code>, <code>colorType</code>, <code>brand</code></td>
            </tr>
            <tr>
              <td><code>/developers</code></td>
              <td>Developer database search and filtering.</td>
              <td><code>query</code>, <code>fuzzy</code>, <code>limit</code>, <code>type</code>, <code>manufacturer</code></td>
            </tr>
            <tr>
              <td><code>/combinations</code></td>
              <td>Film + developer combinations and recipes.</td>
              <td><code>film</code>, <code>developer</code>, <code>count</code>, <code>page</code>, <code>id</code>, <code>query</code>, <code>fuzzy</code>, <code>limit</code></td>
            </tr>
            <tr>
              <td><code>/filmdev?id=12345</code></td>
              <td>Proxy to filmdev.org recipe detail endpoint.</td>
              <td><code>id</code> (required, positive integer)</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="section">
        <h2>Rate Limits</h2>
        <p>
          Public API keys use per-key limits configured in Unkey (example tiers: 60/min free, 300/min standard, unlimited partner).
        </p>
        <p>
          Anonymous requests on <code>dorkroom.art/api</code> are limited to <code>30 requests/minute per IP</code>.
        </p>
        <p>
          Response headers: <code>X-RateLimit-Limit</code>, <code>X-RateLimit-Remaining</code>,
          <code>X-RateLimit-Reset</code>, and <code>Retry-After</code> on <code>429</code>.
        </p>
      </section>

      <section class="section">
        <h2>Get an API Key</h2>
        <p>
          Contact <a href="mailto:aaron+dorkroom@affords.art">aaron+dorkroom@affords.art</a>
          with your use case to request access.
        </p>
      </section>

      <section class="section">
        <h2>Back to App</h2>
        <p><a href="https://dorkroom.art">dorkroom.art</a></p>
      </section>
    </main>
  </body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader(
    'Cache-Control',
    'public, max-age=300, stale-while-revalidate=600'
  );
  res.status(200).send(html);
}
