/**
 * Where server-side enrichment lookups (`api/og.tsx`) read catalogue data.
 *
 * The public `dorkroom.art/api/*` endpoints carry an anonymous per-IP rate
 * limit meant to bound one end user. Called from a function, the "client" is
 * that function's egress IP, so every card render would share one budget and
 * quietly lose its film or developer details once it ran out (issue #443).
 *
 * So when the Supabase credentials the data proxies already use are present,
 * lookups go straight to the Edge Function, authenticated exactly as
 * `createSupabaseProxy` does (`Authorization: Bearer` plus `x-proxy-secret`).
 * The anonymous limiter is not in the path at all, and nothing an outside
 * caller sends can change that: the decision rests on server env vars only,
 * never on a request header.
 *
 * When any of the three is missing or malformed (local dev, a preview without
 * secrets), lookups fall back to the public API, the previous behaviour.
 *
 * The credentials live in request headers only. They are never logged, never
 * put in a URL, and never reach a response: `api/og.tsx` reads a few fields
 * out of the JSON body and draws them.
 *
 * Keep this file free of Node-only imports: it ships in the edge bundle.
 */
import { BASE_URL } from './routeMetadata';
import { serverlessWarn } from './serverlessLogger';

/** The Edge Functions, which are also the public proxy route names. */
export type CatalogueSource = 'films' | 'developers' | 'combinations';

export interface CatalogueRequest {
  url: string;
  headers: Record<string, string>;
  /**
   * `'error'` on the direct path, so a redirect can never carry the
   * credentials to another origin.
   */
  redirect: RequestRedirect;
  /** Which path was chosen, for tests and logs. Never the credentials. */
  mode: 'direct' | 'public';
}

interface DirectCredentials {
  endpoint: string;
  apiKey: string;
  proxySecret: string;
}

/** An `https:` origin with no path, query or credentials, or null. */
function parseEndpoint(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.username || url.password) return null;
  if (url.pathname !== '/' || url.search || url.hash) return null;
  return url.origin;
}

function readDirectCredentials(): DirectCredentials | null {
  const endpoint = parseEndpoint(process.env.SUPABASE_ENDPOINT?.trim() ?? '');
  const apiKey = process.env.SUPABASE_MASTER_API_KEY?.trim() ?? '';
  const proxySecret = process.env.SUPABASE_PROXY_SECRET?.trim() ?? '';
  if (!endpoint || !apiKey || !proxySecret) return null;
  return { endpoint, apiKey, proxySecret };
}

let fallbackLogged = false;

/** Test hook: let the next fallback log again. */
export function resetCatalogueSourceLog(): void {
  fallbackLogged = false;
}

/**
 * The request for one catalogue lookup. `params` is the query string the
 * public proxy would receive; every key used here is on that proxy's
 * `allowedParams`, so both paths answer the same rows.
 */
export function catalogueRequest(
  source: CatalogueSource,
  params: URLSearchParams
): CatalogueRequest {
  const query = params.toString();
  const credentials = readDirectCredentials();

  if (credentials) {
    return {
      url: `${credentials.endpoint}/functions/v1/${source}?${query}`,
      headers: {
        Authorization: `Bearer ${credentials.apiKey}`,
        Accept: 'application/json',
        'x-proxy-secret': credentials.proxySecret,
      },
      redirect: 'error',
      mode: 'direct',
    };
  }

  if (!fallbackLogged) {
    fallbackLogged = true;
    // Names only: which variables are expected, never their values.
    serverlessWarn(
      'Catalogue lookups use the public API (Supabase credentials not configured)',
      {
        expected:
          'SUPABASE_ENDPOINT, SUPABASE_MASTER_API_KEY, SUPABASE_PROXY_SECRET',
      }
    );
  }

  return {
    url: `${BASE_URL}/api/${source}?${query}`,
    headers: { Accept: 'application/json' },
    redirect: 'follow',
    mode: 'public',
  };
}
