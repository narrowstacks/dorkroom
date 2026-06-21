// Hermes (React Native's JS engine) is missing some ES2023 Array
// "change-by-copy" methods that @dorkroom/logic relies on (e.g. EASEL_SIZES
// .toSorted(...) in border-calculations.ts). Polyfill the ones we need before
// any shared logic module evaluates. No-ops where the method already exists.

type Comparator<T> = (a: T, b: T) => number;

const arr = Array.prototype as unknown as {
  toSorted?: <T>(compare?: Comparator<T>) => T[];
  toReversed?: <T>() => T[];
  with?: <T>(index: number, value: T) => T[];
};

if (typeof arr.toSorted !== 'function') {
  arr.toSorted = function toSorted<T>(compare?: Comparator<T>): T[] {
    return [...(this as T[])].sort(compare);
  };
}

if (typeof arr.toReversed !== 'function') {
  arr.toReversed = function toReversed<T>(): T[] {
    return [...(this as T[])].reverse();
  };
}

if (typeof arr.with !== 'function') {
  arr.with = function withItem<T>(index: number, value: T): T[] {
    const copy = [...(this as T[])];
    copy[index < 0 ? copy.length + index : index] = value;
    return copy;
  };
}
