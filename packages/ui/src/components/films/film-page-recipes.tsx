import type { FilmRecipe, RecipeIsoGroup } from '@dorkroom/logic';
import { type FC, type KeyboardEvent, useId, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { cn } from '../../lib/cn';
import { FilmPageRecipeRow } from './film-page-recipe-row';

/** Rows shown before "See all". */
const VISIBLE_ROWS = 5;

interface FilmPageRecipesProps {
  filmSlug: string;
  groups: Array<RecipeIsoGroup<FilmRecipe>>;
  defaultIso: number | undefined;
  developersReady: boolean;
  onRecipeOpen?: () => void;
}

/**
 * The Recipes section of a film page: ISO tabs over a short list of recipe
 * links. Mount it with `key={film.uuid}` so the selected tab and the
 * expansion start over for every film without an effect.
 */
export const FilmPageRecipes: FC<FilmPageRecipesProps> = ({
  filmSlug,
  groups,
  defaultIso,
  developersReady,
  onRecipeOpen,
}) => {
  const baseId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  const [selectedIso, setSelectedIso] = useState(defaultIso);
  const [expanded, setExpanded] = useState(false);

  const activeIndex = Math.max(
    0,
    groups.findIndex((group) => group.shootingIso === selectedIso)
  );
  const active = groups[activeIndex];
  if (!active) return null;

  const select = (index: number) => {
    const group = groups[index];
    if (!group) return;
    setSelectedIso(group.shootingIso);
    setExpanded(false);
    tabRefs.current[index]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = groups.length - 1;
    let target: number | null = null;
    if (event.key === 'ArrowRight')
      target = activeIndex === last ? 0 : activeIndex + 1;
    else if (event.key === 'ArrowLeft')
      target = activeIndex === 0 ? last : activeIndex - 1;
    else if (event.key === 'Home') target = 0;
    else if (event.key === 'End') target = last;
    if (target === null) return;
    event.preventDefault();
    select(target);
  };

  const rows = expanded
    ? active.recipes
    : active.recipes.slice(0, VISIBLE_ROWS);
  const hasMore = active.recipes.length > VISIBLE_ROWS && !expanded;

  return (
    <section
      aria-labelledby={`${baseId}-title`}
      className="rounded-2xl border border-[color:var(--color-border-secondary)] bg-[color:var(--color-surface)] px-4 pt-4 pb-1"
    >
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        <h3
          id={`${baseId}-title`}
          className="text-xl font-semibold text-primary"
        >
          Recipes
        </h3>
        {/* Arrow keys move between tabs, as the tabs pattern requires. */}
        {/* eslint-disable-next-line jsx-a11y/interactive-supports-focus -- the focusable elements are the tab buttons inside */}
        <div
          role="tablist"
          aria-label="Shooting ISO"
          onKeyDown={onKeyDown}
          className="flex flex-wrap gap-1.5"
        >
          {groups.map((group, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                key={group.shootingIso}
                ref={(node) => {
                  tabRefs.current[index] = node;
                }}
                type="button"
                role="tab"
                id={`${baseId}-tab-${group.shootingIso}`}
                aria-selected={isActive}
                aria-controls={`${baseId}-panel`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => select(index)}
                className={cn(
                  'min-h-11 min-w-11 rounded-full border px-3.5 text-sm tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]',
                  isActive
                    ? 'border-[color:var(--color-text-primary)] bg-text-primary font-semibold text-background'
                    : 'border-[color:var(--color-border-secondary)] font-normal text-secondary hover:bg-hover-surface hover:text-on-hover-surface'
                )}
              >
                {group.shootingIso}
              </button>
            );
          })}
        </div>
      </div>
      <div
        ref={panelRef}
        role="tabpanel"
        id={`${baseId}-panel`}
        aria-labelledby={`${baseId}-tab-${active.shootingIso}`}
      >
        {rows.map((recipe) => (
          <FilmPageRecipeRow
            key={recipe.combination.uuid}
            recipe={recipe}
            filmSlug={filmSlug}
            developersReady={developersReady}
            onOpen={onRecipeOpen}
          />
        ))}
        {hasMore && (
          <button
            type="button"
            onClick={() => {
              // Rows are about to replace this button's place in the list:
              // render them first, then keep focus on the first new one.
              flushSync(() => setExpanded(true));
              panelRef.current?.querySelectorAll('a')[VISIBLE_ROWS]?.focus();
            }}
            className="min-h-11 w-full border-t border-[color:var(--color-border-muted)] text-sm font-medium text-primary transition-colors hover:bg-[color:var(--color-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--color-focus-ring)]"
          >
            See all {active.recipes.length} at ISO {active.shootingIso}
          </button>
        )}
      </div>
    </section>
  );
};
