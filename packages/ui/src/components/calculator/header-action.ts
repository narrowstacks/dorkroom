/**
 * Classes for an action in the calculator page header (Reset, Share), so the
 * controls in that row share one size, border and focus ring.
 */
export const HEADER_ACTION_CLASS = [
  'relative z-10 inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors',
  'border-[color:var(--color-border-secondary)] text-[color:var(--color-text-secondary)]',
  'enabled:hover:bg-[rgba(var(--color-background-rgb),0.08)] enabled:hover:text-[color:var(--color-text-primary)]',
  'disabled:cursor-not-allowed disabled:opacity-50',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]',
].join(' ');
