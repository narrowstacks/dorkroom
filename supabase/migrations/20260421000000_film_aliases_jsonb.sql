-- Migrate films.aliases from text[] of slugs to jsonb of {slug, name} pairs.
--
-- Motivation: rendering aliases in the UI was producing incorrect display
-- names because slug-to-title casing is lossy (e.g. "kodak-tri-x-400" →
-- "Kodak Tri X 400" instead of "Kodak Tri-X 400"). Carrying a display name
-- alongside the slug at the data layer lets the UI read a correct name
-- directly, with zero heuristics.
--
-- Shape after migration:
--   aliases jsonb NOT NULL DEFAULT '[]'
--     e.g. [{"slug": "kodak-tri-x-400", "name": "Kodak Tri-X 400"}, ...]
--
-- The backfill uses each existing slug as a placeholder for the name — names
-- must be corrected manually (via dashboard or a one-shot script) as a
-- follow-up step before the UI relies on them.
--
-- Rollout notes:
--   * Edge functions that filter by alias use `aliases.cs.{"<slug>"}` today.
--     After this migration the filter becomes `aliases.cs.[{"slug":"<slug>"}]`.
--     Deploy updated edge functions in the same release window as this SQL.
--   * The code layer (Zod schema, transform, Film.aliases type) also changes
--     shape in lockstep — see packages/api/src/dorkroom/*.
--
-- This runs as a single transaction so the column swap is atomic; any error
-- rolls back and leaves the existing text[] column in place.

BEGIN;

ALTER TABLE films
  ADD COLUMN aliases_jsonb jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE films
SET aliases_jsonb = COALESCE(
  (
    SELECT jsonb_agg(jsonb_build_object('slug', s, 'name', s))
    FROM unnest(aliases) AS s
  ),
  '[]'::jsonb
)
WHERE cardinality(aliases) > 0;

ALTER TABLE films DROP COLUMN aliases;
ALTER TABLE films RENAME COLUMN aliases_jsonb TO aliases;

COMMIT;
