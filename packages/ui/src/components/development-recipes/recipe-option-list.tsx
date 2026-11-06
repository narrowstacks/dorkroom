import type { FC, Ref } from 'react';
import { cn } from '../../lib/cn';
import { RecipeOptionButton } from './recipe-option-button';
import type { RecipePickerOption } from './recipe-picker-option';

export interface RecipeOptionListProps {
  ref?: Ref<HTMLUListElement>;
  options: readonly RecipePickerOption[];
  /** Value of the row marked as current. */
  currentValue?: string | null;
  /** Called with the picked row's value and its place in `options`. */
  onSelect: (value: string, index: number) => void;
  /** Value of the row `rowRef` points at, for moving focus to it. */
  rowRefValue?: string | null;
  rowRef?: Ref<HTMLButtonElement>;
  label?: string;
  className?: string;
}

/** The list of full-width rows that pickers, search results and saved recipes share. */
export const RecipeOptionList: FC<RecipeOptionListProps> = ({
  ref,
  options,
  currentValue,
  onSelect,
  rowRefValue,
  rowRef,
  label,
  className,
}) => (
  <ul
    ref={ref}
    aria-label={label}
    className={cn('m-0 flex list-none flex-col gap-0.5 p-0', className)}
  >
    {options.map((option, index) => (
      <li key={option.value}>
        <RecipeOptionButton
          ref={option.value === rowRefValue ? rowRef : undefined}
          option={option}
          isCurrent={option.value === currentValue}
          onSelect={() => onSelect(option.value, index)}
        />
      </li>
    ))}
  </ul>
);
