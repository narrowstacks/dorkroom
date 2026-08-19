// Hermes (React Native's JS engine) is missing some ES2023 Array
// "change-by-copy" methods that @dorkroom/logic relies on (e.g. EASEL_SIZES
// .toSorted(...) in border-calculations.ts). Polyfill the ones we need before
// any shared logic module evaluates. No-ops where the method already exists.

type Comparator<T> = (a: T, b: T) => number;

/** The change-by-copy methods as Hermes has them: possibly absent. */
interface ChangeByCopyMethods {
  toSorted?: <T>(this: T[], compare?: Comparator<T>) => T[];
  toReversed?: <T>(this: T[]) => T[];
  with?: <T>(this: T[], index: number, value: T) => T[];
}

const arr: ChangeByCopyMethods = Array.prototype;

if (arr.toSorted === undefined) {
  arr.toSorted = function toSorted<T>(this: T[], compare?: Comparator<T>): T[] {
    // eslint-disable-next-line react-doctor/js-tosorted-immutable -- this IS the toSorted polyfill; can't call itself
    return [...this].sort(compare);
  };
}

if (arr.toReversed === undefined) {
  arr.toReversed = function toReversed<T>(this: T[]): T[] {
    return [...this].reverse();
  };
}

if (arr.with === undefined) {
  arr.with = function withItem<T>(this: T[], index: number, value: T): T[] {
    const copy = [...this];
    copy[index < 0 ? copy.length + index : index] = value;
    return copy;
  };
}
