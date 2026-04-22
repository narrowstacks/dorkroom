import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sanitizeQuery, sanitizeSlug } from '../_shared/sanitize.ts';

/**
 * Edge Function: /films
 *
 * Query Parameters:
 *   - slug: Match on film slug or alias
 *   - query: Search term for film name, brand, or alias
 *   - limit: Maximum number of results
 *   - colorType: Filter by color type (bw/color/slide)
 *   - brand: Filter by brand/manufacturer
 *
 * Examples:
 *   GET /films?limit=2
 *   GET /films?query=tri-x&brand=Kodak
 *   GET /films?colorType=color&limit=2
 *   GET /films?query=velvia
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
  const slug = searchParams.get('slug');
  const query = searchParams.get('query');
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
  if (slug) {
    const safeSlug = sanitizeSlug(slug);
    if (!safeSlug) {
      return new Response(JSON.stringify({ error: 'Invalid slug parameter' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    // aliases is jsonb of {slug,name} pairs; cs checks array containment
    dbQuery = dbQuery.or(
      `slug.eq.${safeSlug},aliases.cs.[{"slug":"${safeSlug}"}]`
    );
  }
  if (colorType) {
    dbQuery = dbQuery.eq('color_type', colorType);
  }
  if (brand) {
    const safeBrand = sanitizeQuery(brand);
    if (!safeBrand) {
      return new Response(
        JSON.stringify({ error: 'Invalid brand parameter' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
    dbQuery = dbQuery.ilike('brand', `%${safeBrand}%`);
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
      `name.ilike.%${safeQuery}%,brand.ilike.%${safeQuery}%,aliases.cs.[{"slug":"${safeQuery}"}]`
    );
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
