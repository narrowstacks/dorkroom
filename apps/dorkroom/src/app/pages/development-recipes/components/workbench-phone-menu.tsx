import { recipeIdOf } from '@dorkroom/logic';
import { ResponsiveModal } from '@dorkroom/ui';
import {
  RecipeScopeFilter,
  SavedRecipes,
  SHEET_CLOSE_BUTTON,
  TemperatureUnitToggle,
} from '@dorkroom/ui/development-recipes';
import { RotateCcw } from 'lucide-react';
import type { RefObject } from 'react';
import type { RecipeWorkbench } from '../hooks/useRecipeWorkbench';
import { UnresolvedCustomRecipes } from './unresolved-custom-recipes';
import { AddImportButtons, SIDE_BUTTON } from './workbench-shared';

interface MenuProps {
  wb: RecipeWorkbench;
  isOpen: boolean;
  onClose: () => void;
  returnFocus: RefObject<HTMLElement | null>;
  /** Called when a saved recipe is picked, before the menu closes. */
  onPicked: () => void;
}

/**
 * The "..." sheet: everything the header has no room for, with the saved list
 * last because it can be any length. An action that opens a form closes the
 * sheet first, in the same commit, so the form's own return focus lands on the
 * "..." button and never on a row of a sheet that has gone.
 */
export function WorkbenchPhoneMenu({
  wb,
  isOpen,
  onClose,
  returnFocus,
  onPicked,
}: MenuProps) {
  const then =
    <Args extends unknown[]>(action: (...args: Args) => void) =>
    (...args: Args) => {
      onClose();
      action(...args);
    };
  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title="More options"
      isMobile
      closeButtonClassName={SHEET_CLOSE_BUTTON}
      returnFocus={returnFocus}
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-primary">
            Temperature unit
          </span>
          <TemperatureUnitToggle className="min-h-11 shrink-0 whitespace-nowrap" />
        </div>
        <RecipeScopeFilter value={wb.scope} onChange={wb.changeScope} />
        <div className="flex flex-col gap-2">
          {wb.canStartOver && (
            <button
              type="button"
              onClick={then(wb.startOver)}
              className={SIDE_BUTTON}
            >
              <RotateCcw aria-hidden="true" className="size-4" />
              Start over
            </button>
          )}
          <AddImportButtons wb={wb} onAction={onClose} />
        </div>
        <SavedRecipes
          recipes={wb.savedRecipes}
          currentId={wb.openView ? recipeIdOf(wb.openView) : null}
          onSelect={(recipe) => {
            onPicked();
            onClose();
            wb.pickSaved(recipe);
          }}
        />
        <UnresolvedCustomRecipes
          recipes={wb.unresolvedCustom}
          onEdit={then(wb.editRecipe)}
          onDelete={then(wb.deleteRecipe)}
        />
      </div>
    </ResponsiveModal>
  );
}
