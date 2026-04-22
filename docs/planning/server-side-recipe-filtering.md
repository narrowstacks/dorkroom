# Server-Side Recipe Filtering

> **TL;DR**: When the combinations table grows past ~2000 rows, shift from fetching all recipes client-side to server-side filtering with paginated API responses. This keeps the app fast on mobile and avoids multi-megabyte payloads.

---

## Current State (as of 2026-03-25)

- **1020 combinations** in the database
- PostgREST `max_rows` set to 1000 (see `supabase/config.toml`)
- All combinations fetched in a single request, filtered/sorted in-memory
- Two-phase loading: seed (24 items) for instant render, full dataset in background
- Client-side features depend on having the full dataset:
  - Film/developer dropdowns show only those with recipes
  - Available ISOs and dilutions derived from full combination list
  - Favorites (localStorage) overlaid on results
  - Custom recipes (localStorage) merged into results
  - Alias-aware film matching resolves old slugs client-side

## Trigger

Revisit this plan when:
- Combinations exceed ~2000 rows
- Full payload exceeds ~500KB
- Users on slow connections report performance issues
- Mobile load times exceed 2-3 seconds

## Architecture

### API Changes

The edge function already supports these params (just unused for the main fetch):
- `film` — filter by film slug (alias-aware)
- `developer` — filter by developer slug
- `count` — items per page
- `page` — page number

New params to add:
- `iso` — filter by shooting ISO
- `dilution` — filter by dilution
- `developerType` — filter by developer type (powder/concentrate)
- `sort` — sort field (filmName, developerName, time, temperature, iso)
- `sortDir` — asc/desc

The edge function would need to join against `films` and `developers` tables for name-based sorting and developer type filtering.

### Filter Options Endpoint

Currently, available ISOs and dilutions are derived from the full dataset. With server-side filtering, we need a separate endpoint (or extend `/stats`) to return available filter values:

```
GET /combinations/filters?film=kodak-ektapan-400
→ { isos: [100, 200, 400, 800], dilutions: ["Stock", "1+1", "1+3"] }
```

This is a lightweight query that returns distinct values without full row data.

### Client Changes

#### `useCombinations` hook
- Accept filter/pagination params
- Return paginated results instead of full dataset
- Query key includes filters so cache is per-filter-set
- Remove two-phase loading (no longer needed — each page is small)

#### `useDevelopmentRecipes` hook
- Stop doing in-memory filtering — pass filters to the API
- `filteredCombinations` becomes the direct API response
- `filmIdsWithCombinations` comes from a separate query or the stats endpoint
- `getAvailableISOs` / `getAvailableDilutions` come from the filters endpoint

#### `useRecipeUrlState` hook
- Already syncs filters to URL params — no change needed
- Pagination state (`page`) added to URL

#### Pagination controls
- Already exist (`pagination-controls.tsx`)
- Currently paginate TanStack Table's client-side model
- Switch to controlling API page param instead

### What Stays Client-Side

- **Favorites**: localStorage lookup, overlaid on results with a "show favorites only" toggle
- **Custom recipes**: localStorage, shown in a separate tab/filter
- **Sorting within a page**: TanStack Table still sorts the current page's rows
- **Film alias resolution**: Server handles this in the edge function (already implemented)
- **Base film recipe sharing**: Server handles this (needs to be added to the edge function's film filter)

### Migration Path

1. **Add filter params to edge function** — extend combinations endpoint with `iso`, `dilution`, `developerType`, `sort`, `sortDir`
2. **Add filters endpoint** — returns available ISOs/dilutions for the current film+developer selection
3. **Update `useCombinations`** — accept params, paginate
4. **Update `useDevelopmentRecipes`** — delegate filtering to API, keep favorites/custom local
5. **Update pagination controls** — drive API pagination instead of table pagination
6. **Remove two-phase loading** — each page is 24 rows, no need for seed/full pattern
7. **Bump `db_max_rows` or remove** — no longer a concern since pages are small

### Considerations

- **Offline/instant feel**: Server-side filtering means network round-trips on every filter change. Mitigate with:
  - Debounced filter updates (already in place for URL sync)
  - `staleTime` on TanStack Query so cached filter combos are instant
  - Skeleton loading states (already exist)
- **Search**: Fuzzy search across film/developer names should stay on the server (the edge function already supports `query` param)
- **Backwards compatibility**: Old URLs with `?film=kodak-t-max-400` must still work (alias resolution is server-side)
- **Custom recipe filtering**: When "only custom" is selected, skip the API call entirely — custom recipes are local
