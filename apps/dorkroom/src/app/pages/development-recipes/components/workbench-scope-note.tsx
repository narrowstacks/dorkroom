import type { RecipeWorkbench } from '../hooks/useRecipeWorkbench';
import { SIDE_BUTTON } from './workbench-shared';

/**
 * The scope filter lives in the "..." menu on the phone, so whatever it is hiding
 * has to be said where the list is. `onShowAll` moves focus, because the button
 * that had it goes away.
 */
export function WorkbenchScopeNote({
  wb,
  onShowAll,
}: {
  wb: RecipeWorkbench;
  onShowAll: () => void;
}) {
  if (wb.scope === 'all') return null;
  return (
    <div className="flex shrink-0 items-center justify-between gap-2">
      <p className="min-w-0 text-sm text-primary">
        Showing {wb.scope} recipes only
      </p>
      <button
        type="button"
        onClick={() => {
          onShowAll();
          wb.changeScope('all');
        }}
        className={`${SIDE_BUTTON} shrink-0 whitespace-nowrap`}
      >
        Show all
      </button>
    </div>
  );
}
