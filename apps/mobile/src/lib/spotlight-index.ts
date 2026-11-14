// What goes into the on-device Spotlight index, and what to send to change it.
// Pure: the native calls are in `spotlight.ts`, the triggers in
// `spotlight-sync.ts`.
//
// Privacy: only what a user would expect to find from the Home Screen search.
// A roll is its label, camera, EI, status, frame count, film and lens names; a
// recipe is its film, developer, time, dilution, EI and temperature. Notes,
// places, coordinates and photos are never read here, so they can never be
// indexed (the builders pick fields one by one; `spotlight-index.test.ts`
// checks fixtures that carry them).
import type { Combination, Developer, Film } from '@dorkroom/api';
import { z } from 'zod';
import {
  formatRecipeTemp,
  formatRecipeTime,
  resolveDilution,
} from '@/components/development/recipe-format';
import { rollLabel, rollStatusLabel } from '@/lib/film-log-options';
import { framesLabel } from '@/lib/widgets/roll-widget-props';
import type { Camera, FilmRoll, Lens } from '@/schemas/film-log.schema';

/** The domains items are indexed under (`DorkroomSpotlight.domains` in Swift). */
export const SPOTLIGHT_DOMAINS = {
  rolls: 'rolls',
  recipes: 'recipes',
} as const;

export type SpotlightDomain =
  (typeof SPOTLIGHT_DOMAINS)[keyof typeof SPOTLIGHT_DOMAINS];

/**
 * The only app paths an item's id may be, each followed by one id segment.
 * The id IS the path a tap opens, so a tap needs no lookup table. Kept equal
 * to `DorkroomSpotlight.pathPrefixes` in Swift (tested), which refuses
 * anything else, both when indexing and when a result is tapped.
 */
export const SPOTLIGHT_PATH_PREFIXES = {
  rolls: '/shoot/film-log/roll/',
  recipes: '/develop/recipes/recipe/',
} as const satisfies Record<SpotlightDomain, string>;

/** The id characters both sides accept (roll ids from `generateId`, recipe uuids). */
const ID_SEGMENT = /^[A-Za-z0-9_-]{1,128}$/;

/** At most this many recipes are indexed (recent ones first). */
export const MAX_SPOTLIGHT_RECIPES = 50;

/**
 * An item indexed longer ago than this is sent again even if unchanged:
 * Spotlight items expire (a month by default; the native side asks for no
 * expiry, and this covers a system that ignores that).
 */
export const SPOTLIGHT_REFRESH_MS = 7 * 24 * 60 * 60 * 1000;

export interface SpotlightItem {
  /** The app path it opens, `/shoot/film-log/roll/<id>`. */
  id: string;
  domain: SpotlightDomain;
  title: string;
  /** The line under the title; may be empty. */
  description: string;
  /** Extra words it is found by; may be empty. */
  keywords: string[];
}

/** The path for an id in a domain, or null when the id has other characters. */
export function spotlightPath(
  domain: SpotlightDomain,
  id: string
): string | null {
  return ID_SEGMENT.test(id) ? `${SPOTLIGHT_PATH_PREFIXES[domain]}${id}` : null;
}

/** Unique, trimmed, non-empty words, in order. */
function keywordList(words: readonly (string | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const word of words) {
    const trimmed = word?.trim();
    if (!trimmed || seen.has(trimmed.toLowerCase())) continue;
    seen.add(trimmed.toLowerCase());
    out.push(trimmed);
  }
  return out;
}

const joinParts = (parts: readonly (string | undefined)[]) =>
  parts.filter((part): part is string => Boolean(part?.trim())).join(' · ');

/**
 * A roll as a Spotlight item: its label (`rollLabel`), then camera, `EI <iso>`,
 * status word and frames shot; keywords are the film, the camera and the lenses
 * used on its shots. Null when the roll's id cannot be a path.
 */
export function rollSpotlightItem(
  roll: FilmRoll,
  cameras: readonly Camera[],
  lenses: readonly Lens[]
): SpotlightItem | null {
  const id = spotlightPath('rolls', roll.id);
  if (id === null) return null;
  const camera = cameras.find((c) => c.id === roll.cameraId)?.name;
  const lensNames = roll.shots.map(
    (shot) => lenses.find((lens) => lens.id === shot.lensId)?.name
  );
  const description = joinParts([
    camera,
    roll.iso !== undefined && Number.isFinite(roll.iso)
      ? `EI ${roll.iso}`
      : undefined,
    rollStatusLabel(roll.status),
    framesLabel(roll.shots.length),
  ]);
  const keywords = keywordList([roll.filmStockName, camera, ...lensNames]);
  return {
    id,
    domain: SPOTLIGHT_DOMAINS.rolls,
    title: rollLabel(roll),
    description,
    keywords,
  };
}

export interface RecipeCatalog {
  films?: readonly Film[];
  developers?: readonly Developer[];
  combinations?: readonly Combination[];
}

/**
 * A recipe as a Spotlight item: "Ilford HP5 Plus in Ilford DD-X" (the
 * development record's name), then time, dilution, EI and temperature; keywords
 * are the film and the developer. Null when the catalog lacks the recipe, its
 * film or its developer (it is not indexed blank), or its uuid cannot be a path.
 * Names are built as the recipe screen builds them.
 */
export function recipeSpotlightItem(
  recipeId: string,
  catalog: RecipeCatalog
): SpotlightItem | null {
  const { films = [], developers = [], combinations = [] } = catalog;
  const recipe = combinations.find((c) => c.uuid === recipeId);
  if (!recipe) return null;
  const id = spotlightPath('recipes', recipe.uuid);
  if (id === null) return null;
  const film = films.find(
    (f) => f.slug === recipe.filmSlug || f.uuid === recipe.filmStockId
  );
  const developer = developers.find(
    (d) => d.slug === recipe.developerSlug || d.uuid === recipe.developerId
  );
  if (!film || !developer) return null;
  const filmName = `${film.brand} ${film.name}`.trim();
  const developerName = `${developer.manufacturer} ${developer.name}`.trim();
  const dilution = resolveDilution(recipe, developer).trim();
  const description = joinParts([
    formatRecipeTime(recipe.timeMinutes),
    dilution,
    Number.isFinite(recipe.shootingIso)
      ? `EI ${recipe.shootingIso}`
      : undefined,
    Number.isFinite(recipe.temperatureC)
      ? formatRecipeTemp(recipe.temperatureC, recipe.temperatureF, 'C')
      : undefined,
  ]);
  return {
    id,
    domain: SPOTLIGHT_DOMAINS.recipes,
    title: `${filmName} in ${developerName}`,
    description,
    keywords: keywordList([filmName, developerName]),
  };
}

/** The recipes to index, in the order given, capped at `MAX_SPOTLIGHT_RECIPES`. */
export function recipeSpotlightItems(
  recipeIds: readonly string[],
  catalog: RecipeCatalog
): SpotlightItem[] {
  const items: SpotlightItem[] = [];
  for (const recipeId of recipeIds) {
    if (items.length >= MAX_SPOTLIGHT_RECIPES) break;
    const item = recipeSpotlightItem(recipeId, catalog);
    if (item && !items.some((i) => i.id === item.id)) items.push(item);
  }
  return items;
}

/** Every roll as an item; rolls whose id cannot be a path are left out. */
export function rollSpotlightItems(
  rolls: readonly FilmRoll[],
  cameras: readonly Camera[],
  lenses: readonly Lens[]
): SpotlightItem[] {
  return rolls.flatMap((roll) => {
    const item = rollSpotlightItem(roll, cameras, lenses);
    return item ? [item] : [];
  });
}

/** A short, stable hash of what an item shows (FNV-1a, 32 bits, hex). */
export function spotlightItemHash(item: SpotlightItem): string {
  const text = JSON.stringify([
    item.domain,
    item.title,
    item.description,
    item.keywords,
  ]);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export interface IndexedEntry {
  hash: string;
  /** When it was last sent, ms since the epoch. */
  at: number;
}

/** What was sent to Spotlight for one domain: id to hash and time. */
export type IndexedRecord = Record<string, IndexedEntry>;

const indexedEntrySchema = z.object({
  hash: z.string(),
  at: z.number().refine(Number.isFinite),
});

/** The stored record back; anything malformed reads as not indexed. */
export function parseIndexedRecord(raw: string | undefined): IndexedRecord {
  if (!raw) return {};
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return {};
  }
  const object = z.record(z.string(), z.unknown()).safeParse(json);
  if (!object.success) return {};
  const entries = new Map<string, IndexedEntry>();
  for (const [id, value] of Object.entries(object.data)) {
    const entry = indexedEntrySchema.safeParse(value);
    if (entry.success) entries.set(id, entry.data);
  }
  return Object.fromEntries(entries);
}

export interface SpotlightPlan {
  toIndex: SpotlightItem[];
  toRemove: string[];
}

/**
 * What to send so Spotlight holds exactly `desired`: the items that are new,
 * changed (by hash) or last sent `refreshMs` or more ago (or, with the clock
 * set back, in the future), and the ids indexed before that are no longer
 * wanted. A repeated id in `desired` counts once (the first).
 */
export function planSpotlightSync({
  desired,
  indexed,
  now,
  refreshMs = SPOTLIGHT_REFRESH_MS,
}: {
  desired: readonly SpotlightItem[];
  indexed: IndexedRecord;
  now: number;
  refreshMs?: number;
}): SpotlightPlan {
  const sent = new Map(Object.entries(indexed));
  const wanted = new Set<string>();
  const toIndex: SpotlightItem[] = [];
  for (const item of desired) {
    if (wanted.has(item.id)) continue;
    wanted.add(item.id);
    const entry = sent.get(item.id);
    const stale =
      entry === undefined ||
      entry.hash !== spotlightItemHash(item) ||
      now - entry.at >= refreshMs ||
      entry.at > now;
    if (stale) toIndex.push(item);
  }
  const toRemove = [...sent.keys()].filter((id) => !wanted.has(id));
  return { toIndex, toRemove };
}

/** The record after `indexedItems` were sent and `removedIds` removed, at `now`. */
export function recordAfterSync(
  indexed: IndexedRecord,
  {
    indexedItems,
    removedIds,
  }: { indexedItems: readonly SpotlightItem[]; removedIds: readonly string[] },
  now: number
): IndexedRecord {
  const next = new Map(Object.entries(indexed));
  for (const id of removedIds) next.delete(id);
  for (const item of indexedItems) {
    next.set(item.id, { hash: spotlightItemHash(item), at: now });
  }
  return Object.fromEntries(next);
}

/**
 * Whether any of these recent recipes (the first `MAX_SPOTLIGHT_RECIPES` that
 * can be paths) is missing from the record or due for a re-send: only then
 * does indexing need the catalog. Recipes that left the list are removed
 * without it. A recipe the catalog no longer has stays "missing", so it keeps
 * the catalog wanted until it falls out of the recent list.
 */
export function recipesNeedIndexing(
  recipeIds: readonly string[],
  indexed: IndexedRecord,
  now: number,
  refreshMs: number = SPOTLIGHT_REFRESH_MS
): boolean {
  const sent = new Map(Object.entries(indexed));
  const paths = recipeIds
    .map((id) => spotlightPath('recipes', id))
    .filter((path): path is string => path !== null)
    .slice(0, MAX_SPOTLIGHT_RECIPES);
  return paths.some((path) => {
    const entry = sent.get(path);
    return entry === undefined || now - entry.at >= refreshMs || entry.at > now;
  });
}

/** The paths of the recent recipes, for removing those that left the list. */
export function recipePaths(recipeIds: readonly string[]): Set<string> {
  return new Set(
    recipeIds
      .map((id) => spotlightPath('recipes', id))
      .filter((path): path is string => path !== null)
  );
}

/** What `SpotlightEffects` does with the recent recipes this time. */
export type RecipeSyncAction =
  | { kind: 'clear' }
  | { kind: 'prune'; keep: Set<string> }
  | { kind: 'wait' }
  | { kind: 'sync'; items: SpotlightItem[] };

/**
 * No recent recipes clears the domain; recipes already indexed and fresh only
 * prune what left the list; otherwise the catalog names them. A catalog that is
 * still loading, or that came back with an empty list while recent recipes
 * exist, means wait: sending nothing then would clear the whole domain.
 */
export function recipeSyncAction(
  recipeIds: readonly string[],
  needsCatalog: boolean,
  catalog: RecipeCatalog
): RecipeSyncAction {
  if (recipeIds.length === 0) return { kind: 'clear' };
  if (!needsCatalog) return { kind: 'prune', keep: recipePaths(recipeIds) };
  const { films, developers, combinations } = catalog;
  if (!films?.length || !developers?.length || !combinations?.length) {
    return { kind: 'wait' };
  }
  return { kind: 'sync', items: recipeSpotlightItems(recipeIds, catalog) };
}
