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
