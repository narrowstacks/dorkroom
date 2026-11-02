import { SHARED_LINK_MARKER } from '@dorkroom/logic';

/**
 * Search param schemas for the routes.
 *
 * These live outside the route files so they can be unit-tested without those
 * files exporting non-components (which would break Fast Refresh).
 *
 * Plain validators, not zod: the route tree is part of the entry chunk, so
 * whatever these import loads on every page before first render. Even
 * `zod/mini` pulls in zod's core (~15 KB gzip), which the lazy calculator and
 * recipe pages share with classic zod (issue #352).
 *
 * Each schema is a `{ parse }` object, a validator shape TanStack Router
 * accepts for `validateSearch`; the router types a route's search from what
 * `parse` returns. They behave like the zod schemas they replace: a declared
 * param that is present but invalid becomes `undefined`, an absent one is
 * omitted.
 *
 * Values arrive as plain strings — see `parseSearch` in ./search-params. Invalid
 * params are silently recovered to undefined for better UX.
 */

/**
 * The search a route validates: flat strings, as `parseSearch` produces them
 * from the URL and as the app's own navigations pass them (the router types a
 * navigation's search from what `parse` returns).
 */
export type RawSearch = Readonly<Record<string, string | undefined>>;

/** Parses one search value; anything it does not accept becomes undefined. */
export type ParamParser<T extends string> = (
  value: string | undefined
) => T | undefined;

/** The parsers for the params a route declares, by param name. */
type DeclaredParams = Readonly<Record<string, ParamParser<string>>>;

/** What a route's declared params parse to; each may be absent. */
type ParsedParams<D extends DeclaredParams> = {
  [K in keyof D]?: ReturnType<D[K]>;
};

/** A search validator TanStack Router accepts as `validateSearch`. */
export interface SearchSchema<T> {
  parse: (input: RawSearch) => T;
}

/** A string param. */
export const stringParam: ParamParser<string> = (value) => value;

/** One of a closed set of strings. */
const oneOf =
  <const T extends readonly string[]>(values: T): ParamParser<T[number]> =>
  (value) =>
    values.find((allowed) => allowed === value);

/**
 * Parses each param of `input` with its parser in `declared`, or with `rest`
 * when `declared` has none; without `rest`, undeclared params are dropped.
 */
function parseParams(
  input: RawSearch,
  declared: DeclaredParams,
  rest?: ParamParser<string>
) {
  return Object.fromEntries(
    Object.entries(input).flatMap(([name, value]) => {
      const parse = Object.hasOwn(declared, name) ? declared[name] : rest;
      return parse ? [[name, parse(value)]] : [];
    })
  );
}

/** A route's declared params; undeclared ones are dropped. */
function searchSchema<const D extends DeclaredParams>(
  declared: D
): SearchSchema<ParsedParams<D>> {
  return {
    // SAFETY: every key written is a key of `declared`, holding what its
    // parser returned.
    parse: (input) => parseParams(input, declared) as ParsedParams<D>,
  };
}

/**
 * A route's declared params that also keeps every other param, parsed by
 * `rest` (what zod calls a catch-all).
 */
export function searchSchemaWithRest<
  const D extends DeclaredParams,
  R extends string,
>(
  declared: D,
  rest: ParamParser<R>
): SearchSchema<ParsedParams<D> & Record<string, R | undefined>> {
  return {
    // SAFETY: declared keys hold their parser's result, all others `rest`'s.
    parse: (input) =>
      parseParams(input, declared, rest) as ParsedParams<D> &
        Record<string, R | undefined>,
  };
}

export const developmentSearchSchema = searchSchemaWithRest(
  {
    q: stringParam,
    film: stringParam,
    developer: stringParam,
    dilution: stringParam,
    iso: stringParam,
    recipe: stringParam,
    source: stringParam,
    view: oneOf(['favorites', 'custom']),
    developerType: stringParam,
    recipeType: stringParam,
    favorites: stringParam,
  },
  // Other params (`utm_*`) survive as strings: the recipes page carries them
  // through its own URL writes, which start from this parsed search.
  stringParam
);

export type DevelopmentSearchParams = ReturnType<
  typeof developmentSearchSchema.parse
>;

const filmColorFilter = oneOf(['bw', 'color', 'slide']);

/** The film catalog's colour-process filter, as it travels in the URL. */
export const filmColorFilterSchema = { parse: filmColorFilter };

export const filmsSearchSchema = searchSchema({
  search: stringParam,
  color: filmColorFilter,
  iso: stringParam,
  brand: stringParam,
  status: oneOf(['all', 'active', 'discontinued']),
  film: stringParam, // direct link to expanded film
  /** The shared-link marker (`SHARED_LINK_MARKER`): a film's Share button
   *  adds it. Any other value is treated as absent. */
  source: oneOf([SHARED_LINK_MARKER.value]),
});

export type FilmsSearchParams = ReturnType<typeof filmsSearchSchema.parse>;
