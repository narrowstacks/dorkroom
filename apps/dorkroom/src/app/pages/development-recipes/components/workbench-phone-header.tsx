import { recipeIdOf } from '@dorkroom/logic';
import { cn } from '@dorkroom/ui';
import type { RecipePickerOption } from '@dorkroom/ui/development-recipes';
import { ChevronDown, Ellipsis, type LucideIcon, Search } from 'lucide-react';
import { Fragment, type Ref } from 'react';
import type { RecipeWorkbench } from '../hooks/useRecipeWorkbench';

export type PhoneSheet = 'film' | 'developer' | 'recipe' | 'search' | 'menu';

/** Dashed and set away from the button: the one-colour themes give brand and focus one colour. */
const NEEDED_OUTLINE =
  'outline-2 outline-offset-2 outline-dashed outline-[color:var(--color-brand)]';

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]';

const FIELD = `flex min-h-11 w-full min-w-0 items-center justify-between gap-0.5 rounded-xl border-1 border-primary py-1 pl-2.5 pr-1.5 text-left transition-colors hoverable-action-btn ${FOCUS}`;

export const ICON_BUTTON = `flex size-11 shrink-0 items-center justify-center rounded-xl border-1 border-primary transition-colors hoverable-action-btn ${FOCUS}`;

/**
 * The longest word kept whole: the longest in the catalogue ("Caffenol-C-M"). A
 * custom name can hold any word, and one too wide for the button has to break or
 * it is cut with no ellipsis.
 */
const MAX_UNBROKEN_LENGTH = 12;

/**
 * Where a film name may break: not at a hyphen, where "T-MAX" would read as "T-"
 * and "MAX", but after a slash, or "T-MAX/Ektapan P3200" needs three lines and
 * loses the part that tells it from the 400. The text stays exactly the name.
 */
const wordsOf = (text: string) => {
  const parts = text.split('/');
  return parts.map((part, partIndex) => {
    const isLast = partIndex === parts.length - 1;
    // Capturing, so the hyphenated words land at the odd indexes.
    const pieces = (isLast ? part : `${part}/`).split(/(\S*-\S*)/);
    return (
      // Names can repeat a part ("A/A"), and the order never changes.
      // oxlint-disable-next-line react/no-array-index-key
      <Fragment key={partIndex}>
        {pieces.map((piece, pieceIndex) =>
          pieceIndex % 2 === 1 && piece.length <= MAX_UNBROKEN_LENGTH ? (
            // oxlint-disable-next-line react/no-array-index-key
            <span key={pieceIndex} className="whitespace-nowrap">
              {piece}
            </span>
          ) : (
            piece
          )
        )}
        {!isLast && <wbr />}
      </Fragment>
    );
  });
};

interface FieldButtonProps {
  ref?: Ref<HTMLButtonElement>;
  caption: string;
  /** Stays in the accessible name when it is not drawn. */
  hideCaption?: boolean;
  value: string;
  needed?: boolean;
  /** Up to two lines rather than one: a cut name can read as another film. */
  wrapValue?: boolean;
  icon?: LucideIcon;
  onClick: () => void;
}

/**
 * A full-width button that opens a sheet. A long value ends in an ellipsis here,
 * and the screen reader and the sheet still get all of it.
 */
export function FieldButton({
  ref,
  caption,
  hideCaption,
  value,
  needed,
  wrapValue = false,
  icon: Icon = ChevronDown,
  onClick,
}: FieldButtonProps) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      // Spelled out, because a <wbr> can read as a space in a computed name.
      aria-label={`${caption} ${value}`}
      className={cn(FIELD, needed && NEEDED_OUTLINE)}
    >
      <span className="min-w-0 flex-1">
        <span
          className={hideCaption ? 'sr-only' : 'block text-xs text-secondary'}
        >
          {caption}
        </span>{' '}
        <span
          className={cn(
            'block text-sm font-medium tracking-tight text-primary',
            wrapValue ? 'line-clamp-2 [overflow-wrap:break-word]' : 'truncate'
          )}
        >
          {wrapValue ? wordsOf(value) : value}
        </span>
      </span>
      <Icon aria-hidden="true" className="size-4 shrink-0" />
    </button>
  );
}

export interface PhoneRefs {
  film: Ref<HTMLButtonElement>;
  developer: Ref<HTMLButtonElement>;
  recipe: Ref<HTMLButtonElement>;
  search: Ref<HTMLButtonElement>;
  menu: Ref<HTMLButtonElement>;
}

interface HeaderProps {
  wb: RecipeWorkbench;
  refs: PhoneRefs;
  /** From `recipeRowsToPickerOptions`, so the recipe button and its sheet agree. */
  recipeOptions: readonly RecipePickerOption[];
  onOpen: (sheet: PhoneSheet) => void;
}

const labelOf = (
  options: readonly { value: string; label: string }[],
  key: string | undefined
) => options.find((option) => option.value === key)?.label;

/**
 * Film and Developer, stacked with captions on the prompt and side by side without
 * them once a recipe is open. They are the same two buttons in both, so focus
 * survives the change. Side by side, each gets half or its whole name if that is
 * less, and the other takes the rest, so a short name beside a long one stays on
 * one line. With a recipe open a second row adds the recipe picker, search and menu.
 */
export function WorkbenchPhoneHeader({
  wb,
  refs,
  recipeOptions,
  onOpen,
}: HeaderProps) {
  const { openView, film, developer } = wb;
  const isOpen = !!openView;
  const recipeId = openView ? recipeIdOf(openView) : null;
  const recipeLabel = labelOf(recipeOptions, recipeId ?? undefined);

  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          'grid gap-2',
          isOpen ? 'grid-cols-[minmax(0,auto)_minmax(0,auto)]' : 'grid-cols-1'
        )}
      >
        <FieldButton
          ref={refs.film}
          caption="Film"
          hideCaption={isOpen}
          value={labelOf(wb.filmOptions, film?.key) ?? 'Choose a film'}
          needed={wb.needs === 'film'}
          wrapValue
          onClick={() => onOpen('film')}
        />
        <FieldButton
          ref={refs.developer}
          caption="Developer"
          hideCaption={isOpen}
          value={
            labelOf(wb.developerOptions, developer?.key) ?? 'Choose a developer'
          }
          needed={wb.needs === 'developer'}
          wrapValue
          onClick={() => onOpen('developer')}
        />
      </div>
      {openView && (
        <div className="flex items-center gap-2">
          <FieldButton
            ref={refs.recipe}
            caption="Recipe"
            hideCaption
            value={recipeLabel ?? 'Choose a recipe'}
            onClick={() => onOpen('recipe')}
          />
          <button
            ref={refs.search}
            type="button"
            aria-label="Search recipes"
            aria-haspopup="dialog"
            onClick={() => onOpen('search')}
            className={ICON_BUTTON}
          >
            <Search aria-hidden="true" className="size-5" />
          </button>
          <button
            ref={refs.menu}
            type="button"
            aria-label="More options"
            aria-haspopup="dialog"
            onClick={() => onOpen('menu')}
            className={ICON_BUTTON}
          >
            <Ellipsis aria-hidden="true" className="size-5" />
          </button>
        </div>
      )}
    </div>
  );
}
