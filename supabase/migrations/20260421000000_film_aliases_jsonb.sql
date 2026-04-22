-- Migrate films.aliases from text[] to jsonb of {slug, name} pairs.
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
-- Backfill strategy:
--   * For "display-name" aliases (e.g. "Adox CMS II"): derive slug via
--     slugify() and keep the original string as the display name.
--   * For "slug-like" aliases (e.g. "kodak-portra-160"): keep the slug and
--     use it verbatim as a placeholder name — then correct the six known
--     Kodak rebrand-redirect rows explicitly via the known_names CTE so
--     no rows are left needing manual cleanup.
--
-- Rollout notes:
--   * Edge functions that filter by alias must be redeployed with the new
--     PostgREST form: aliases.cs.{"<slug>"} → aliases.cs.[{"slug":"<slug>"}].
--
-- This runs as a single transaction so the column swap is atomic; any error
-- rolls back and leaves the existing text[] column in place.

BEGIN;

ALTER TABLE films
  ADD COLUMN aliases_jsonb jsonb NOT NULL DEFAULT '[]'::jsonb;

WITH known_names(slug_key, display_name) AS (
  VALUES
    ('kodak-portra-160', 'Kodak Portra 160'),
    ('kodak-portra-400', 'Kodak Portra 400'),
    ('kodak-portra-800', 'Kodak Portra 800'),
    ('kodak-t-max-100', 'Kodak T-MAX 100'),
    ('kodak-t-max-400', 'Kodak T-MAX 400'),
    ('kodak-t-max-p3200', 'Kodak T-MAX P3200')
)
UPDATE films f
SET aliases_jsonb = (
  SELECT COALESCE(
    jsonb_agg(
      CASE
        WHEN s ~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN
          jsonb_build_object(
            'slug', s,
            'name', COALESCE(
              (SELECT display_name FROM known_names WHERE slug_key = s),
              s
            )
          )
        ELSE
          jsonb_build_object(
            'slug', trim(BOTH '-' FROM regexp_replace(lower(s), '[^a-z0-9]+', '-', 'g')),
            'name', s
          )
      END
    ),
    '[]'::jsonb
  )
  FROM unnest(f.aliases) AS s
)
WHERE cardinality(f.aliases) > 0;

ALTER TABLE films DROP COLUMN aliases;
ALTER TABLE films RENAME COLUMN aliases_jsonb TO aliases;

COMMIT;
