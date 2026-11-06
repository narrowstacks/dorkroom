import { isNonStandardTemperature } from '@dorkroom/logic';
import { Check } from 'lucide-react';
import type { FC, Ref } from 'react';
import { cn } from '../../lib/cn';
import type { RecipePickerOption } from './recipe-picker-option';
import { RecipeTemperatureChip } from './recipe-temperature-chip';

export interface RecipeOptionButtonProps {
  ref?: Ref<HTMLButtonElement>;
  option: RecipePickerOption;
  isCurrent?: boolean;
  onSelect: () => void;
}

/**
 * A full-width row. Text inherits the row's colour so a hover that flips the
 * surface takes every line and the chip with it: a fixed muted colour went
 * invisible on the high-contrast hover. `border-1`, not `border`, because that
 * theme repaints `.rounded-xl.border` surfaces. The current row carries a check
 * and a heavier border as well as a tint, because darkroom collapses colour. A
 * hovered row gets a border too: darkroom's hover surface is its own black.
 * High contrast's focus ring is the same black as its hover surface, so a hovered
 * row also gets a band in its own text colour, inside the ring.
 */
export const RecipeOptionButton: FC<RecipeOptionButtonProps> = ({
  ref,
  option,
  isCurrent = false,
  onSelect,
}) => {
  const flagged =
    option.temperature &&
    isNonStandardTemperature(option.temperature.temperatureF)
      ? option.temperature
      : null;
  const hasNotes = flagged || option.temperatureNote || option.isCustom;
  return (
    <button
      ref={ref}
      type="button"
      onClick={onSelect}
      aria-current={isCurrent ? 'true' : undefined}
      aria-label={option.accessibleName}
      className={cn(
        'flex min-h-11 w-full items-center gap-2 rounded-xl border-1 px-2 py-1.5 text-left transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--color-focus-ring)]',
        isCurrent
          ? 'border-primary bg-recipe-selected text-primary shadow-[inset_0_0_0_1px_var(--color-border-primary)]'
          : 'border-transparent text-primary hover:border-primary hover:bg-hover-surface hover:text-on-hover-surface hover:focus-visible:shadow-[inset_0_0_0_4px_var(--color-on-hover-surface)]'
      )}
    >
      <span className="flex size-4 shrink-0 items-center justify-center">
        {isCurrent && <Check aria-hidden="true" className="size-4" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium [overflow-wrap:anywhere]">
          {option.label}
        </span>
        {option.detail && (
          <span className="block text-xs [overflow-wrap:anywhere]">
            {option.detail}
          </span>
        )}
        {hasNotes && (
          <span className="mt-1 flex flex-wrap items-center gap-1.5">
            {flagged && (
              <RecipeTemperatureChip
                temperatureC={flagged.temperatureC}
                temperatureF={flagged.temperatureF}
              />
            )}
            {option.temperatureNote && (
              <span className="text-xs">{option.temperatureNote}</span>
            )}
            {option.isCustom && (
              <span className="inline-flex min-h-6 items-center rounded-lg border-1 border-current px-2 text-xs font-medium">
                Custom
              </span>
            )}
          </span>
        )}
      </span>
      {option.time && (
        <span className="shrink-0 text-base font-medium tabular-nums">
          {option.time}
        </span>
      )}
    </button>
  );
};
