import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Edge Function: /combinations
 *
 * Query Parameters:
 *   - film: Filter by film stock slug
 *   - developer: Filter by developer slug
 *   - query: Search combinations
 *   - fuzzy: Enable fuzzy search (true/false)
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
  const fuzzy = searchParams.get('fuzzy') === 'true';
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
    // Filter by film slug if provided
    if (filmSlug) {
      dbQuery = dbQuery.eq('film_stock', filmSlug);
    }
    // Filter by developer slug if provided
    if (developerSlug) {
      dbQuery = dbQuery.eq('developer', developerSlug);
    }

    // Apply search
    if (query) {
      if (fuzzy) {
        // Fuzzy search: use ilike with wildcards for typo tolerance
        dbQuery = dbQuery.or(
          `name.ilike.%${query}%,film_stock.ilike.%${query}%,developer.ilike.%${query}%`
        );
      } else {
        // Exact search: case-insensitive partial match
        dbQuery = dbQuery.or(
          `name.ilike.%${query}%,film_stock.ilike.%${query}%,developer.ilike.%${query}%`
        );
      }
    }

    // Apply pagination if specified
    if (perPage > 0) {
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;
      dbQuery = dbQuery.range(from, to);
    }

    // Apply limit
    if (limit > 0) {
      dbQuery = dbQuery.limit(limit);
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

  // Format response body
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
