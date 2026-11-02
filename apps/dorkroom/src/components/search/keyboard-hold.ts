/**
 * The stand-in text field that holds a phone's keyboard while the search
 * dialog loads. Kept apart from `nav-search.tsx` (which focuses it) so the
 * lazily loaded dialog can take its text without importing the triggers.
 */

/** Marks the stand-in, for tests and for finding it in devtools. */
export const KEYBOARD_HOLD_ATTRIBUTE = 'data-search-keyboard-proxy';

/**
 * How long the stand-in may hold focus. Past this the dialog's code is not
 * coming (a hung chunk), so an invisible field must not keep the keyboard up.
 */
export const KEYBOARD_HOLD_MS = 8000;

/** The stand-in while it exists. One at a time: a new hold replaces it. */
let held: HTMLInputElement | null = null;
/**
 * What the last stand-in held when it went: typing keeps landing in it until
 * focus actually moves to the dialog's box, which takes this at that moment.
 * Also kept after a timeout, for a dialog that arrives late.
 */
let left = '';

function release(field: HTMLInputElement) {
  if (held === field) {
    held = null;
    left = field.value;
  }
  field.remove();
}

/**
 * Focus an invisible stand-in text field, synchronously, inside the tap that
 * opens the dialog. iOS Safari (and some Android browsers) show the keyboard
 * only for focus that happens during the user's gesture; the dialog's own box
 * mounts after its code loads, too late for that. With a field already
 * focused, the keyboard comes up now and stays up when the dialog moves focus
 * from this field to its box. The field removes itself as soon as it loses
 * focus, or after `KEYBOARD_HOLD_MS`, so it is never left behind.
 *
 * Not `display: none` (that cannot take focus) but transparent, 1px, fixed
 * at the corner so focusing it scrolls nothing, and 16px text so iOS does not
 * zoom in. Out of the Tab order and hidden from screen readers: it holds
 * focus only for the moment the dialog takes to load.
 */
export function holdKeyboard(): void {
  if (held) release(held);
  left = '';
  const field = document.createElement('input');
  field.type = 'text';
  field.tabIndex = -1;
  field.autocomplete = 'off';
  field.spellcheck = false;
  field.setAttribute('aria-hidden', 'true');
  field.setAttribute('inputmode', 'search');
  field.setAttribute('enterkeyhint', 'search');
  field.setAttribute('autocapitalize', 'none');
  field.setAttribute('autocorrect', 'off');
  field.setAttribute(KEYBOARD_HOLD_ATTRIBUTE, '');
  Object.assign(field.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '1px',
    height: '1px',
    margin: '0',
    padding: '0',
    border: '0',
    opacity: '0',
    fontSize: '16px',
    pointerEvents: 'none',
  });
  const timer = window.setTimeout(() => {
    // Blurring dismisses the keyboard; the blur listener then removes it,
    // keeping its text for a dialog that arrives later.
    field.blur();
    release(field);
  }, KEYBOARD_HOLD_MS);
  field.addEventListener(
    'blur',
    () => {
      window.clearTimeout(timer);
      release(field);
    },
    { once: true }
  );
  held = field;
  document.body.append(field);
  field.focus({ preventScroll: true });
}

/**
 * What has been typed into the stand-in so far, so the dialog's box can show
 * it on first paint. Empty when there is nothing to carry over.
 */
export function heldText(): string {
  return held?.value ?? left;
}

/**
 * Forget the stand-in's text: a shortcut opens a fresh dialog that it does
 * not belong to.
 */
export function clearHeldText(): void {
  left = '';
}

/**
 * Everything typed into the stand-in, taken once. Called as the dialog's box
 * gains focus: the stand-in has just lost it (and removed itself), so nothing
 * typed after this can land anywhere but the box.
 */
export function takeHeldText(): string {
  const text = heldText();
  left = '';
  return text;
}
