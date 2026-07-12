/**
 * Escape a string for safe interpolation into HTML text or a double-quoted
 * attribute value. Values reaching the meta endpoint can contain arbitrary
 * characters even after query validation — the border `preset` param is
 * base64-decoded and URI-decoded *after* its regex check — so escaping happens
 * at the point of interpolation rather than relying on upstream validation.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
