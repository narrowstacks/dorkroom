import { type DevelopmentCombinationView, recipeIdOf } from '@dorkroom/logic';
import { Pencil, Trash2 } from 'lucide-react';
import { useId } from 'react';

const ICON_BUTTON =
  'flex size-11 shrink-0 items-center justify-center rounded-xl text-secondary transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)] hoverable-icon-btn';

/**
 * Custom recipes whose film or developer no longer exists. No picker reaches
 * them, so this is the only way left to fix or remove one.
 */
export function UnresolvedCustomRecipes({
  recipes,
  onEdit,
  onDelete,
}: {
  recipes: readonly DevelopmentCombinationView[];
  onEdit: (view: DevelopmentCombinationView) => void;
  onDelete: (view: DevelopmentCombinationView) => void;
}) {
  const headingId = useId();
  if (recipes.length === 0) return null;
  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="mb-1 text-sm font-semibold text-primary">
        Custom recipes missing a film or developer
      </h2>
      <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
        {recipes.map((view) => {
          const { name } = view.combination;
          return (
            <li key={recipeIdOf(view)} className="flex items-center gap-1">
              <span className="min-w-0 flex-1 text-sm text-primary [overflow-wrap:anywhere]">
                {name}
              </span>
              <button
                type="button"
                aria-label={`Edit ${name}`}
                onClick={() => onEdit(view)}
                className={ICON_BUTTON}
              >
                <Pencil aria-hidden="true" className="size-4" />
              </button>
              <button
                type="button"
                aria-label={`Delete ${name}`}
                onClick={() => onDelete(view)}
                className={ICON_BUTTON}
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
