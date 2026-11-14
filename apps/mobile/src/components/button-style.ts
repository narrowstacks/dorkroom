/**
 * The app's one button system, as class names. Pure, so the variants are
 * tested and cannot drift per screen; `Button` (`button.tsx`) renders them.
 *
 * - `commit`: the solid phase-hue fill (Start roll, Save, New roll). Its fill
 *   and ink are styles from `useCommitStyle`, not classes.
 * - `secondary`: the neutral flat fill with white text (retry, Mark as shot).
 * - `plain`: no fill, phase-hue text (Show all rolls, a quiet link).
 * - `tinted`: the phase's selection tint as a fill, hue text (a roll's one
 *   next step, Mark as shot). Its fill and ink are styles from
 *   `useSelectionTint`, not classes.
 * - `destructive`: the neutral fill with rose text (Delete). Rose here means
 *   destructive, not the Print hue.
 */
export type ButtonVariant =
  'commit' | 'secondary' | 'plain' | 'tinted' | 'destructive';

// At least 44pt tall, and the label wraps rather than truncates at large
// Dynamic Type sizes, so the height grows with the text.
const BASE = 'min-h-11 items-center justify-center rounded-xl px-4 py-3';

const FILL = {
  commit: '',
  secondary: 'border-hw border-line bg-surface',
  plain: '',
  tinted: '',
  destructive: 'border-hw border-line bg-surface',
} satisfies Record<ButtonVariant, string>;

const LABEL_INK = {
  commit: '',
  secondary: 'text-white',
  plain: '',
  tinted: '',
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

/** What VoiceOver is told: `disabled` and `expanded` only when the caller set
 * them, so a plain enabled button carries no state at all. */
export function buttonAccessibilityState(
  disabled: boolean | undefined,
  expanded: boolean | undefined
): { disabled?: boolean; expanded?: boolean } | undefined {
  if (disabled === undefined && expanded === undefined) return undefined;
  return { disabled, expanded };
}

/** The label's classes; `commit`, `plain` and `tinted` take their colour
 * from a style. */
export function buttonLabelClassName(
  variant: ButtonVariant,
  withIcon = false
): string {
  // Beside a glyph the label must be able to shrink, or it cannot wrap at the
  // accessibility text sizes.
  return [
    'text-center text-base font-semibold',
    withIcon ? 'shrink' : '',
    LABEL_INK[variant],
  ]
    .filter(Boolean)
    .join(' ');
}
