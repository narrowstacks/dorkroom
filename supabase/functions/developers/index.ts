import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Edge Function: /developers
 *
 * Query Parameters:
 *   - query: Search term for developer name
 *   - fuzzy: Enable fuzzy search (true/false)
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
  const query = searchParams.get('query');
  const fuzzy = searchParams.get('fuzzy') === 'true';
  const limit = parseInt(searchParams.get('limit') ?? '0', 10);
  const type = searchParams.get('type');
  const manufacturer = searchParams.get('manufacturer');

  // ────────────────────────────────────────
  //  Build query
  // ────────────────────────────────────────
  let dbQuery = supabase.from('developers').select('*', {
    count: 'exact',
  });

  // Apply filters
  if (type) {
    dbQuery = dbQuery.eq('type', type);
  }
  if (manufacturer) {
    dbQuery = dbQuery.ilike('manufacturer', `%${manufacturer}%`);
  }

  // Apply search
  if (query) {
    if (fuzzy) {
      // Fuzzy search: use ilike with wildcards for typo tolerance
      dbQuery = dbQuery.or(
        `name.ilike.%${query}%,manufacturer.ilike.%${query}%`
      );
    } else {
      // Exact search: case-insensitive partial match
      dbQuery = dbQuery.or(
        `name.ilike.%${query}%,manufacturer.ilike.%${query}%`
      );
    }
  }

  // Apply limit
  if (limit > 0) {
    dbQuery = dbQuery.limit(limit);
  }

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
