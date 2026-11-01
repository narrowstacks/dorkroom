import { RotateCcw } from 'lucide-react';
import { cn } from '../../lib/cn';
import { commitFocusedField } from '../../lib/commit-focused-field';
import { HEADER_ACTION_CLASS } from './header-action';

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
      onClick={() => {
        commitFocusedField();
        onReset();
      }}
      title={label}
      className={cn(HEADER_ACTION_CLASS, className)}
    >
      <RotateCcw className="size-4" aria-hidden="true" />
      <span className="sr-only sm:not-sr-only">{label}</span>
    </button>
  );
}
