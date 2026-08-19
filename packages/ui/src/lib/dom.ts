import type { CSSProperties } from 'react';

/**
 * Apply several inline style properties in a single batched write.
 *
 * Prefer this over multiple sequential `element.style.x = ...` assignments
 * (e.g. in `onMouseEnter`/`onMouseLeave` handlers): one batched write keeps
 * style mutations grouped instead of scattering them across separate
 * statements.
 */
export function setStyles(
  element: HTMLElement,
  styles: Partial<CSSStyleDeclaration>
): void {
  Object.assign(element.style, styles);
}

/** An inline style that also sets `--*` custom properties, which `CSSProperties` omits. */
export type StyleWithCustomProperties = CSSProperties &
  Record<`--${string}`, string | number>;

/**
 * Type a `style` prop that sets custom properties: real CSS properties stay
 * checked, and React forwards the `--*` keys to `style.setProperty`.
 */
export function cssVars(style: StyleWithCustomProperties): CSSProperties {
  return style;
}

/**
 * Whether a host global exists in this runtime. Prerendering has no DOM
 * globals, so callers use this to take their non-browser path.
 */
export function hasGlobal(name: keyof typeof globalThis): boolean {
  return name in globalThis;
}

/**
 * A MediaQueryList that only has the pre-2020 `addListener` pair. Declaring the
 * modern methods as absent rather than intersecting `MediaQueryList` keeps the
 * two shapes disjoint, so the non-legacy branch stays a `MediaQueryList`
 * instead of narrowing to `never`.
 */
type LegacyMediaQueryList = Omit<
  MediaQueryList,
  'addEventListener' | 'removeEventListener'
> & {
  addEventListener?: undefined;
  removeEventListener?: undefined;
};

/**
 * Safari <14 and the Kindle Experimental Browser's WebKit (which the
 * `@vitejs/plugin-legacy` bundle targets) predate
 * `MediaQueryList.addEventListener`. `lib.dom` declares both APIs, so only a
 * runtime check tells them apart — and which listener pair exists is exactly
 * the contract this narrows, which is why it is a type guard rather than an
 * inline `typeof`.
 */
/** Either listener generation. `addEventListener` discriminates the two. */
export type AnyMediaQueryList = MediaQueryList | LegacyMediaQueryList;

/**
 * `window.matchMedia` typed as either generation, so callers discriminate on
 * `addEventListener` instead of probing it. Returning the union is what makes
 * the narrowing work: annotating the binding would be narrowed straight back to
 * `MediaQueryList` by the assignment.
 */
export function matchMediaQuery(query: string): AnyMediaQueryList {
  return window.matchMedia(query);
}
