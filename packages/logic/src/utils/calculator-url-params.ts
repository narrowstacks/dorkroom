import { parseDecimalInput } from './input-validation';
import type {
  PersistedCalculatorDefinition,
  PersistedValue,
} from './persisted-calculator';

/** URL param name -> the persisted field it sets. */
export type CalculatorLinkParamMap<K extends string = string> = Readonly<
  Record<string, K>
>;

/**
 * Search params as the web app's router hands them over: flat strings (see
 * `parseSearch` in the app's `routes/search-params.ts`). Narrow `P` to one
 * link's param names to tie a value to that link.
 */
export type CalculatorLinkSearch<P extends string = string> = Readonly<
  Partial<Record<P, string>>
>;

/**
 * A calculator's link parameters: read a URL's search params into values for
 * its persisted fields, and build search params from those values.
 */
export interface CalculatorLink<T extends object, P extends string = string> {
  /**
   * The persisted fields a URL's search params set. Each param present is
   * read as a number, a boolean or a string, whichever its field's
   * persistence validator accepts, so the value always has the field's own
   * type. Unknown params are ignored and invalid values dropped, as
   * hydration does.
   */
  read: (search: CalculatorLinkSearch) => Partial<T>;
  /**
   * Search params that `read` turns back into `values`. A field that is
   * missing, `null` or the empty string gets no param.
   */
  build: (values: Partial<T>) => Partial<Record<P, string>>;
}

/** A decimal ("80", "-1", "12,5") or a simple fraction ("1/125", "-1/3"). */
const parseLinkNumber = (text: string): number => {
  const parts = text.split('/');
  if (parts.length === 1) return parseDecimalInput(text);
  if (parts.length === 2) {
    return parseDecimalInput(parts[0]) / parseDecimalInput(parts[1]);
  }
  return Number.NaN;
};

const parseLinkBoolean = (text: string): boolean | undefined => {
  const lower = text.toLowerCase();
  if (lower === 'true' || lower === '1') return true;
  if (lower === 'false' || lower === '0') return false;
  return undefined;
};

/**
 * Every typed reading of one trimmed search value, most specific first: a
 * number, then a boolean, then the text itself. A field takes the first one
 * its validator accepts, so `1` is a number for a numeric field, `true` for a
 * boolean field, and the string "1" for a text field.
 */
const linkValueReadings = (text: string): PersistedValue[] => {
  const readings: PersistedValue[] = [];
  const number = parseLinkNumber(text);
  if (Number.isFinite(number)) readings.push(number);
  const boolean = parseLinkBoolean(text);
  if (boolean !== undefined) readings.push(boolean);
  readings.push(text);
  return readings;
};

/**
 * Declare the URL params that open a calculator pre-filled, as a map of
 * param name to the persisted field it sets. Values are validated by the
 * calculator's own persistence validators, so a link can never apply a value
 * that hydrating from storage would reject.
 *
 * @example
 * ```typescript
 * const lensCalculatorLink = defineCalculatorLink(lensCalculatorPersistence, {
 *   focal: 'focalLength',
 *   from: 'sourceFormat',
 *   to: 'targetFormat',
 * });
 * lensCalculatorLink.read({ focal: '80', to: 'full-frame' });
 * // { focalLength: 80, targetFormat: 'full-frame' }
 * lensCalculatorLink.build({ focalLength: 80 }); // { focal: '80' }
 * ```
 */
export function defineCalculatorLink<
  T extends object,
  K extends keyof T & string,
  const M extends CalculatorLinkParamMap<K>,
>(
  definition: PersistedCalculatorDefinition<T, K>,
  params: M
): CalculatorLink<T, keyof M & string> {
  type Param = keyof M & string;
  const { validators } = definition;
  // SAFETY: Object.entries over M returns exactly its own string keys, each
  // paired with its field; the assertion only recovers the literal key union
  // TypeScript widens to string.
  const entries = Object.entries(params) as [Param, K][];

  const read = (search: CalculatorLinkSearch): Partial<T> => {
    const values: Partial<T> = {};
    for (const [param, field] of entries) {
      const text = search[param]?.trim();
      if (!text) continue;
      const value = linkValueReadings(text).find(validators[field].validate);
      if (value !== undefined) values[field] = value;
    }
    return values;
  };

  const build = (values: Partial<T>) => {
    const search = entries.flatMap(([param, field]) => {
      const value = values[field];
      return value === undefined || value === null || value === ''
        ? []
        : [[param, String(value)] as const];
    });
    // SAFETY: built from `entries`, so every key is a Param and every value
    // a string; Object.fromEntries widens the keys to string.
    return Object.fromEntries(search) as Partial<Record<Param, string>>;
  };

  return { read, build };
}
