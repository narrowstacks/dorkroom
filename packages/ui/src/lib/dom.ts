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
