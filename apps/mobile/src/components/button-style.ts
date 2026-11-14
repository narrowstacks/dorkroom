/**
 * The app's one button system, as class names. Pure, so the variants are
 * tested and cannot drift per screen; `Button` (`button.tsx`) renders them.
 *
 * - `commit`: the solid phase-hue fill (Start roll, Save, New roll). Its fill
 *   and ink are styles from `useCommitStyle`, not classes.
 * - `secondary`: the neutral flat fill with white text (retry, Mark as shot).
 * - `plain`: no fill, phase-hue text (Show all rolls, a quiet link).
 * - `destructive`: the neutral fill with rose text (Delete). Rose here means
 *   destructive, not the Print hue.
 */
export type ButtonVariant = 'commit' | 'secondary' | 'plain' | 'destructive';

// At least 44pt tall, and the label wraps rather than truncates at large
// Dynamic Type sizes, so the height grows with the text.
const BASE = 'min-h-11 items-center justify-center rounded-xl px-4 py-3';

const FILL = {
  commit: '',
  secondary: 'border-hw border-line bg-surface',
  plain: '',
  destructive: 'border-hw border-line bg-surface',
} satisfies Record<ButtonVariant, string>;

const LABEL_INK = {
  commit: '',
  secondary: 'text-white',
  plain: '',
  destructive: 'text-rose-400',
} satisfies Record<ButtonVariant, string>;

/** The pressable's classes. Pressed feedback is an `active:` class because
 * NativeWind ignores Pressable style callbacks. */
export function buttonClassName(
  variant: ButtonVariant,
  disabled: boolean,
  className = ''
): string {
  const state = disabled ? 'opacity-40' : 'active:opacity-70';
  return [BASE, FILL[variant], state, className].filter(Boolean).join(' ');
}

/** The label's classes; `commit` and `plain` take their colour from a style. */
export function buttonLabelClassName(variant: ButtonVariant): string {
  return ['text-center text-base font-semibold', LABEL_INK[variant]]
    .filter(Boolean)
    .join(' ');
}
