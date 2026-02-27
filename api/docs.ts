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

      .example {
        margin-top: 16px;
      }

      .example h3 {
        margin: 0 0 8px;
        font-size: 14px;
        color: var(--text);
      }

      .example-label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--muted);
        margin: 12px 0 4px;
      }

      pre {
        background: rgba(0, 0, 0, 0.35);
        border: 1px solid var(--panel-border);
        border-radius: 8px;
        padding: 14px 16px;
        overflow-x: auto;
        font-size: 13px;
        line-height: 1.5;
        margin: 0;
        color: var(--text);
      }

      pre .comment {
        color: var(--muted);
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
        <h2>Examples</h2>
        <p>All requests require your API key in the <code>X-API-Key</code> header.</p>

        <div class="example">
          <h3>Search films</h3>
          <p class="example-label">Request</p>
          <pre>curl -H "X-API-Key: dk_..." "https://api.dorkroom.art/films?query=portra&amp;limit=2"</pre>
          <p class="example-label">Response</p>
          <pre>{ "count": 3, "data": [
  { "slug": "kodak-portra-160", "brand": "Kodak", "name": "Portra 160",
    "color_type": "color", "iso_speed": 160, "grain_structure": "very fine",
    "reciprocity_failure": "1.3", "discontinued": false, "static_image_url": "https://..." },
  <span class="comment">// ...</span>
] }</pre>
        </div>

        <div class="example">
          <h3>Search developers</h3>
          <p class="example-label">Request</p>
          <pre>curl -H "X-API-Key: dk_..." "https://api.dorkroom.art/developers?query=rodinal&amp;limit=1"</pre>
          <p class="example-label">Response</p>
          <pre>{ "count": 1, "data": [
  { "slug": "agfa-rodinal", "name": "Rodinal", "manufacturer": "Agfa",
    "type": "concentrate",
    "dilutions": [{ "name": "1+25" }, { "name": "1+50" }] }
] }</pre>
        </div>

        <div class="example">
          <h3>Find development recipes</h3>
          <p class="example-label">Request</p>
          <pre>curl -H "X-API-Key: dk_..." \\
  "https://api.dorkroom.art/combinations?film=kodak-tri-x-400&amp;developer=kodak-xtol&amp;limit=2"</pre>
          <p class="example-label">Response</p>
          <pre>{ "count": 5, "data": [
  { "film_stock": "kodak-tri-x-400", "developer": "kodak-xtol",
    "dilution_id": "2", "temperature_celsius": 24, "time_minutes": 7.25,
    "shooting_iso": 400, "push_pull": 0, "tags": ["official-kodak"] },
  <span class="comment">// ...</span>
] }</pre>
        </div>

        <div class="example">
          <h3>Look up a filmdev.org recipe</h3>
          <p class="example-label">Request</p>
          <pre>curl -H "X-API-Key: dk_..." "https://api.dorkroom.art/filmdev?id=12345"</pre>
          <p class="example-label">Response</p>
          <pre>{ "recipe": {
  "id": 12345,
  "recipe_name": "Kodak Tri-X 400 in Agfa Rodinal 1:50",
  "film": "Kodak Tri-X 400", "developer": "Agfa Rodinal",
  "dilution_ratio": "1:50", "duration_minutes": 13,
  "celcius": "20.0", "format": "MF",
  "recipe_link": "https://filmdev.org/recipe/show/12345"
} }</pre>
        </div>
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
