/**
 * Guards Edge Functions against being called directly (bypassing the Vercel
 * proxy and its Unkey rate limits). The proxy is the only intended caller and
 * sends the shared secret on every request; anything else is rejected.
 *
 * Fails closed: if PROXY_SHARED_SECRET is not configured in the function's
 * environment, every request is rejected rather than served unauthenticated.
 */
export async function requireProxySecret(
  req: Request
): Promise<Response | null> {
  const expected = Deno.env.get('PROXY_SHARED_SECRET');
  if (!expected) {
    return new Response(JSON.stringify({ error: 'Service Unavailable' }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  const presented = req.headers.get('x-proxy-secret') ?? '';

  if (!(await timingSafeEqual(expected, presented))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  return null;
}

/**
 * Constant-time string comparison via SHA-256 digests, so neither the length
 * nor the content of the presented secret can be inferred from timing.
 */
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const [digestA, digestB] = await Promise.all([sha256(a), sha256(b)]);
  let diff = 0;
  for (let i = 0; i < digestA.length; i++) {
    diff |= digestA[i] ^ digestB[i];
  }
  return diff === 0;
}

async function sha256(value: string): Promise<Uint8Array> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return new Uint8Array(digest);
}
