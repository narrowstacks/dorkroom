import { RotateCcw } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface CalculatorResetButtonProps {
  /** Restore the calculator's defaults (and drop its saved inputs). */
  onReset: () => void;
  /** Accessible and visible label. */
  label?: string;
  className?: string;
}

/**
 * Reset-to-defaults control shared by every calculator that remembers its
 * inputs. Rendered in the page header through the `onReset` prop on
 * `CalculatorLayout` / `CalculatorPageHeader`, so each page gets the same
 * label, icon, and placement. The label collapses to the icon on narrow
 * screens but stays in the accessibility tree.
 */
export function CalculatorResetButton({
  onReset,
  label = 'Reset to defaults',
  className,
}: CalculatorResetButtonProps) {
  return (
    <button
      type="button"
      onClick={onReset}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors',
        'border-[color:var(--color-border-secondary)] text-[color:var(--color-text-secondary)]',
        'hover:bg-[rgba(var(--color-background-rgb),0.08)] hover:text-[color:var(--color-text-primary)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]',
        className
      )}
    >
      <RotateCcw className="size-4" aria-hidden="true" />
      <span className="sr-only sm:not-sr-only">{label}</span>
    </button>
  );
}
