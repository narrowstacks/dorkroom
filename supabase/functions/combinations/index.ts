import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sanitizeQuery, sanitizeSlug } from '../_shared/sanitize.ts';

/**
 * Explicit ceiling for unpaginated combination fetches. PostgREST's default
 * max_rows would silently truncate large responses; this range overrides that
 * until server-side filtering lands (see docs/planning/server-side-recipe-filtering.md).
 */
const MAX_COMBINATIONS_PER_REQUEST = 5000;

/**
 * Edge Function: /combinations
 *
 * Query Parameters:
 *   - film: Filter by film stock slug (alias-aware)
 *   - developer: Filter by developer slug
 *   - query: Search combinations
 *   - limit: Maximum number of results
 *   - count: Limit results per page
 *   - page: Page number for pagination
 *   - id: Get specific combination by ID
 *
 * Examples:
 *   GET /combinations?limit=2
 *   GET /combinations?film=ilford-hp5-plus&limit=5
 *   GET /combinations?developer=kodak-hc-110&limit=3
 *   GET /combinations?id=179
 *   GET /combinations?count=20&page=2
 */
serve(async (req) => {
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
  const filmSlug = searchParams.get('film');
  const developerSlug = searchParams.get('developer');
  const id = searchParams.get('id');
  const query = searchParams.get('query');
  const limit = parseInt(searchParams.get('limit') ?? '0', 10);
  const perPage = parseInt(searchParams.get('count') ?? '0', 10);
  const page = Math.max(parseInt(searchParams.get('page') ?? '1', 10), 1);

  // ────────────────────────────────────────
  //  Build query
  // ────────────────────────────────────────
  let dbQuery = supabase.from('combinations').select('*', {
    count: 'exact',
  });

  // Filter by ID if provided
  if (id) {
    dbQuery = dbQuery.eq('id', id).limit(1);
  } else {
    // Filter by film slug if provided (resolve aliases)
    if (filmSlug) {
      const safeFilmSlug = sanitizeSlug(filmSlug);
      if (!safeFilmSlug) {
        return new Response(
          JSON.stringify({ error: 'Invalid film parameter' }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }
      const { data: filmData, error: filmError } = await supabase
        .from('films')
        .select('slug, aliases')
        .or(`slug.eq.${safeFilmSlug},aliases.cs.[{"slug":"${safeFilmSlug}"}]`)
        .limit(1);

      if (filmError) {
        return new Response(
          JSON.stringify({ error: `Film lookup failed: ${filmError.message}` }),
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }

      if (filmData && filmData.length > 0) {
        const aliases = (filmData[0].aliases || []) as Array<{ slug: string }>;
        const allSlugs = [filmData[0].slug, ...aliases.map((a) => a.slug)];
        dbQuery = dbQuery.in('film_stock', allSlugs);
      } else {
        dbQuery = dbQuery.eq('film_stock', safeFilmSlug);
      }
    }
    // Filter by developer slug if provided
    if (developerSlug) {
      const safeDeveloperSlug = sanitizeSlug(developerSlug);
      if (!safeDeveloperSlug) {
        return new Response(
          JSON.stringify({ error: 'Invalid developer parameter' }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }
      dbQuery = dbQuery.eq('developer', safeDeveloperSlug);
    }

    // Apply search
    if (query) {
      const safeQuery = sanitizeQuery(query);
      if (!safeQuery) {
        return new Response(
          JSON.stringify({ error: 'Invalid query parameter' }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }
      dbQuery = dbQuery.or(
        `name.ilike.%${safeQuery}%,film_stock.ilike.%${safeQuery}%,developer.ilike.%${safeQuery}%`
      );
    }

    // Apply pagination if specified
    if (perPage > 0) {
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;
      dbQuery = dbQuery.range(from, to);
    } else if (limit > 0) {
      dbQuery = dbQuery.limit(limit);
    } else {
      // The client currently fetches all combinations in one request.
      dbQuery = dbQuery.range(0, MAX_COMBINATIONS_PER_REQUEST - 1);
    }
  }

  // Order by created_at for consistent results
  dbQuery = dbQuery.order('created_at', {
    ascending: false,
  });

  const { data, error, count } = await dbQuery;
  if (error) {
    return new Response(
      JSON.stringify({
        error: error.message,
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
