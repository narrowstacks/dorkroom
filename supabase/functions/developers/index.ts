import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireProxySecret } from '../_shared/auth.ts';
import { buildDeveloperFilters } from '../_shared/developerFilters.ts';

/**
 * Edge Function: /developers
 *
 * Query Parameters:
 *   - slug: Exact match on developer slug
 *   - query: Case-insensitive partial match on developer name or manufacturer
 *     (punctuation other than hyphens is dropped)
 *   - fuzzy: Deprecated and ignored; accepted so existing clients keep working
 *   - limit: Maximum number of results
 *   - type: Filter by developer type (concentrate/powder)
 *   - manufacturer: Filter by manufacturer
 *
 * Examples:
 *   GET /developers?limit=2
 *   GET /developers?query=D-76&manufacturer=Kodak
 *   GET /developers?manufacturer=Ilford&limit=3
 *   GET /developers?type=concentrate
 */ serve(async (req) => {
  // ────────────────────────────────────────
  //  CORS pre-flight
  // ────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers':
          'authorization, x-client-info, apikey, content-type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({
        error: 'Method Not Allowed',
      }),
      {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
  const unauthorized = await requireProxySecret(req);
  if (unauthorized) return unauthorized;
  // ────────────────────────────────────────
  //  Supabase client
  // ────────────────────────────────────────
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = Deno.env.toObject();
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({
        error: 'Missing env vars SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
    },
  });
  // ────────────────────────────────────────
  //  Parse query params
  // ────────────────────────────────────────
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug');
  const query = searchParams.get('query');
  const limit = parseInt(searchParams.get('limit') ?? '0', 10);
  const type = searchParams.get('type');
  const { orFilter, manufacturerPattern } = buildDeveloperFilters({
    query,
    manufacturer: searchParams.get('manufacturer'),
  });

  // ────────────────────────────────────────
  //  Build query
  // ────────────────────────────────────────
  let dbQuery = supabase.from('developers').select('*', {
    count: 'exact',
  });

  // Apply filters
  if (slug) {
    dbQuery = dbQuery.eq('slug', slug);
  }
  if (type) {
    dbQuery = dbQuery.eq('type', type);
  }
  if (manufacturerPattern) {
    dbQuery = dbQuery.ilike('manufacturer', manufacturerPattern);
  }

  // Apply search: case-insensitive partial match on name or manufacturer
  if (orFilter) {
    dbQuery = dbQuery.or(orFilter);
  }

  // Apply limit
  if (limit > 0) {
    dbQuery = dbQuery.limit(limit);
  }

  const { data, error, count } = await dbQuery;
  if (error) {
    console.error('developers query failed', error.message);
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }

  const body = {
    data,
    count,
  };

  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
});
