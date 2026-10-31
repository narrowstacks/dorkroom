/**
 * Unkey rate limiting for edge-runtime handlers (`api/og.tsx`).
 *
 * `withHandler` reaches Unkey through the `@unkey/api` SDK and leans on
 * `node:crypto` / `node:net`, none of which belong in an edge bundle (the SDK
 * also drags in zod, and `@vercel/og` already spends most of the edge size
 * budget). This module calls the same Unkey endpoint the SDK does,
 * `POST /v2/ratelimit.limit`, with plain `fetch`. The counters live in Unkey,
 * so the limit is global across edge isolates and regions — not a
 * per-instance in-memory counter that only appears to limit.
 *
 * Keep this file free of Node-only imports: it ships in the edge bundle.
 */
import { getRateLimitNamespace, normalizeResetMs } from './rateLimitPolicy';
import { serverlessWarn } from './serverlessLogger';

const UNKEY_RATELIMIT_URL = 'https://api.unkey.com/v2/ratelimit.limit';
/** Unkey answers in tens of ms; never let a slow limiter hold up an image. */
const UNKEY_TIMEOUT_MS = 1500;
/** IPv4/IPv6 characters only, bounded, so a header can't smuggle junk into an identifier. */
const IP_LIKE = /^[0-9A-Fa-f:.]{2,45}$/;

/**
 * Client IP from a Web `Request`. On Vercel, `x-real-ip` and
 * `x-forwarded-for` are set by the platform and overwrite client-supplied
 * values; the right-most forwarded entry is the one Vercel appended.
 */
export function getRequestIp(request: Request): string {
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp && IP_LIKE.test(realIp)) return realIp;

  const forwarded = request.headers.get('x-forwarded-for') ?? '';
  const parts = forwarded.split(',');
  for (let index = parts.length - 1; index >= 0; index -= 1) {
    const candidate = parts[index]?.trim();
    if (candidate && IP_LIKE.test(candidate)) return candidate;
  }

  return 'anonymous';
}

export interface EdgeRateLimitOptions {
  identifier: string;
  limit: number;
  durationMs: number;
}

export type EdgeRateLimitResult =
  | {
      status: 'allowed' | 'limited';
      limit: number;
      remaining: number;
      /** Unix ms when the window resets. */
      resetMs: number;
    }
  /** Limiter not consulted (unconfigured, or Unkey unreachable). Fails open. */
  | { status: 'skipped'; reason: 'unconfigured' | 'unavailable' };

interface UnkeyLimitData {
  limit: number;
  remaining: number;
  reset: number;
  success: boolean;
}

function isUnkeyLimitData(value: unknown): value is UnkeyLimitData {
  return (
    typeof value === 'object' &&
    value !== null &&
    'limit' in value &&
    typeof value.limit === 'number' &&
    'remaining' in value &&
    typeof value.remaining === 'number' &&
    'reset' in value &&
    typeof value.reset === 'number' &&
    'success' in value &&
    typeof value.success === 'boolean'
  );
}

/** Decodes the `POST /v2/ratelimit.limit` body: `{ meta, data: {...} }`. */
function isUnkeyLimitBody(value: unknown): value is { data: UnkeyLimitData } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'data' in value &&
    isUnkeyLimitData(value.data)
  );
}

/**
 * Consume one unit from `identifier` in the anonymous namespace. Namespace
 * and budgets come from `rateLimitPolicy.ts`, shared with `withHandler`.
 *
 * Fails OPEN — returns `skipped` — when `UNKEY_ROOT_KEY` is missing (local
 * dev, same as `withHandler`) or when Unkey errors or times out. That differs
 * from `withHandler`, which fails closed in production on permission errors:
 * an OG card is a best-effort preview, and turning a limiter outage into
 * broken link previews site-wide is the worse failure. Both cases are logged.
 */
export async function checkEdgeRateLimit(
  options: EdgeRateLimitOptions
): Promise<EdgeRateLimitResult> {
  const rootKey = process.env.UNKEY_ROOT_KEY;
  if (!rootKey) {
    serverlessWarn('Rate limiting skipped (Unkey not configured)', {
      identifier: options.identifier,
    });
    return { status: 'skipped', reason: 'unconfigured' };
  }

  const namespace = getRateLimitNamespace('anonymous');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UNKEY_TIMEOUT_MS);

  try {
    const res = await fetch(UNKEY_RATELIMIT_URL, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${rootKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        namespace,
        identifier: options.identifier,
        limit: options.limit,
        duration: options.durationMs,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      serverlessWarn('Rate limiting skipped (Unkey request failed)', {
        namespace,
        status: res.status,
      });
      return { status: 'skipped', reason: 'unavailable' };
    }

    const body: unknown = await res.json();
    if (!isUnkeyLimitBody(body)) {
      serverlessWarn('Rate limiting skipped (unexpected Unkey response)', {
        namespace,
      });
      return { status: 'skipped', reason: 'unavailable' };
    }

    const { data } = body;
    return {
      status: data.success ? 'allowed' : 'limited',
      limit: data.limit,
      remaining: data.remaining,
      resetMs: normalizeResetMs(data.reset),
    };
  } catch (cause) {
    serverlessWarn('Rate limiting skipped (Unkey unreachable)', {
      namespace,
      cause: cause instanceof Error ? cause.message : String(cause),
    });
    return { status: 'skipped', reason: 'unavailable' };
  } finally {
    clearTimeout(timeout);
  }
}
