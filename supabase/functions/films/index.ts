import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
/**
 * Edge Function: /films
 *
 * Query Parameters:
 *   - query: Search term for film name or brand
 *   - fuzzy: Enable fuzzy search (true/false)
 *   - limit: Maximum number of results
 *   - colorType: Filter by color type (bw/color/slide)
 *   - brand: Filter by brand/manufacturer
 *
 * Examples:
 *   GET /films?limit=2
 *   GET /films?query=tri-x&brand=Kodak
 *   GET /films?colorType=color&limit=2
 *   GET /films?query=velvi&fuzzy=true
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
  const colorType = searchParams.get('colorType');
  const brand = searchParams.get('brand');

  // ────────────────────────────────────────
  //  Build query
  // ────────────────────────────────────────
  let dbQuery = supabase.from('films').select('*', {
    count: 'exact',
  });

  // Apply filters
  if (colorType) {
    dbQuery = dbQuery.eq('color_type', colorType);
  }
  if (brand) {
    dbQuery = dbQuery.ilike('brand', `%${brand}%`);
  }

  // Apply search
  if (query) {
    if (fuzzy) {
      // Fuzzy search: use ilike with wildcards for typo tolerance
      dbQuery = dbQuery.or(`name.ilike.%${query}%,brand.ilike.%${query}%`);
    } else {
      // Exact search: case-insensitive partial match
      dbQuery = dbQuery.or(`name.ilike.%${query}%,brand.ilike.%${query}%`);
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
