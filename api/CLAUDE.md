# /api - Vercel Serverless Functions

Serverless API endpoints deployed to Vercel that proxy requests to Supabase Edge Functions.

## Endpoints

- `films.ts` - Film database queries
- `developers.ts` - Developer database queries
- `combinations.ts` - Development recipe combinations
- `filmdev.ts` - filmdev.org import endpoint

## Purpose

These functions act as a secure proxy layer:

- Hide Supabase master API key from client
- Add CORS headers for browser requests
- Validate/sanitize query parameters
- Add request logging and error handling
- Set cache headers for client caching

## Environment Variables Required

- `SUPABASE_MASTER_API_KEY` - Master API key for Supabase
- `SUPABASE_ENDPOINT` - Base URL for Supabase functions

## Request Flow

```
Client → Vercel Serverless → Supabase Edge Functions → Database
```

All endpoints:
1. Validate request method (GET only)
2. Sanitize query parameters
3. Forward to Supabase with master API key
4. Return JSON response with cache headers
