/**
 * Blur the focused form field, if any, so its blur handler commits (or
 * discards) a half-typed draft before the caller changes the underlying
 * value. A reset applied while a field keeps focus would otherwise leave the
 * draft on screen, or have the field write it back on its next blur.
 *
 * Only form fields are blurred: a keyboard user activating a button keeps
 * focus on that button.
 */
export function commitFocusedField(): void {
  const active = document.activeElement;
  if (
    active instanceof HTMLInputElement ||
    active instanceof HTMLTextAreaElement ||
    active instanceof HTMLSelectElement
  ) {
    active.blur();
  }
}
