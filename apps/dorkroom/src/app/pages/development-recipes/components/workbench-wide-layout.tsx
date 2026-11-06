import { recipeIdOf } from '@dorkroom/logic';
import { cn } from '@dorkroom/ui';
import {
  FilmDeveloperSelection,
  RecipeList,
  RecipeScopeFilter,
  RecipeSearchBox,
  RecipeSearchResults,
  SavedRecipes,
} from '@dorkroom/ui/development-recipes';
import { useLayoutEffect, useRef } from 'react';
import type { RecipeWorkbench } from '../hooks/useRecipeWorkbench';
import { UnresolvedCustomRecipes } from './unresolved-custom-recipes';
import {
  AddImportButtons,
  PromptNote,
  SIDE_BUTTON,
  WorkbenchBanners,
  WorkbenchPanel,
  WorkbenchSkeleton,
} from './workbench-shared';

/**
 * The pair's recipes in their own scroller, because a pair can list 14 rows and
 * the panel beside them would scroll out of view on picking one far down. A link
 * can open any of them, so the open row is brought into view.
 */
function RecipeRows({ wb }: { wb: RecipeWorkbench }) {
  const { openView, rows, boxIso, pickRow } = wb;
  const scrollerRef = useRef<HTMLDivElement>(null);
  const currentId = openView ? recipeIdOf(openView) : null;
  useLayoutEffect(() => {
    const reveal = () => {
      const scroller = scrollerRef.current;
      const row = scroller?.querySelector<HTMLElement>('[aria-current]');
      if (!scroller || !row) return;
      const rowBox = row.getBoundingClientRect();
      const box = scroller.getBoundingClientRect();
      if (rowBox.top >= box.top && rowBox.bottom <= box.bottom) return;
      scroller.scrollTop +=
        rowBox.top - box.top - (scroller.clientHeight - rowBox.height) / 2;
    };
    if (!currentId) return;
    reveal();
    // Web fonts change the row heights after this first measurement.
    let live = true;
    document.fonts?.ready.then(() => {
      if (live) reveal();
    });
    return () => {
      live = false;
    };
  }, [currentId]);
  return (
    <div ref={scrollerRef} className="max-h-[50vh] overflow-y-auto">
      <RecipeList
        rows={rows}
        currentId={currentId}
        boxIso={boxIso}
        onSelect={pickRow}
      />
    </div>
  );
}

/**
 * The prompt and the workbench are one tree: the side column just narrows when a
 * recipe opens, so the pickers, search and saved shortcuts keep their DOM nodes
 * and focus across the change, as on `/films`. Nothing in the column clips,
 * because the needed outline reaches 4px outside its input.
 */
export function WorkbenchWideLayout({ wb }: { wb: RecipeWorkbench }) {
  const firstResultRef = useRef<HTMLButtonElement>(null);
  const { openView, film, developer } = wb;
  const isOpen = !!openView;
  const showResults = wb.resultsQuery.trim() !== '';

  return (
    <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-4 py-6 sm:px-6">
      <WorkbenchBanners wb={wb} />

      {wb.showSkeleton ? (
        <WorkbenchSkeleton />
      ) : (
        <div
          className={cn(
            'flex flex-col gap-6',
            isOpen && 'md:flex-row md:items-start lg:gap-8'
          )}
        >
          <section
            aria-labelledby="workbench-title"
            className={cn(
              'flex min-w-0 flex-col gap-4',
              isOpen
                ? 'shrink-0 md:w-72 lg:w-80'
                : 'mx-auto w-full max-w-[720px] pt-[clamp(1rem,8vh,5rem)]'
            )}
          >
            <h1
              id="workbench-title"
              className={cn(
                isOpen
                  ? 'sr-only'
                  : 'text-3xl font-semibold tracking-tight text-primary md:text-4xl'
              )}
            >
              What are you developing?
            </h1>
            <FilmDeveloperSelection
              ref={wb.pickersRef}
              layout={isOpen ? 'stacked' : 'columns'}
              hideClear
              needs={wb.needs}
              selectedFilm={film?.key ?? ''}
              onFilmChange={wb.selectFilm}
              filmOptions={wb.filmOptions}
              selectedDeveloper={developer?.key ?? ''}
              onDeveloperChange={wb.selectDeveloper}
              developerOptions={wb.developerOptions}
            />
            <PromptNote wb={wb} />
            <RecipeSearchBox
              label="Or search"
              value={wb.query}
              onChange={wb.setQuery}
              onEnter={() => firstResultRef.current?.focus()}
            />
            <RecipeScopeFilter value={wb.scope} onChange={wb.changeScope} />

            {showResults ? (
              <RecipeSearchResults
                query={wb.resultsQuery}
                result={wb.searchResult}
                onSelectHit={wb.pickSearchHit}
                firstResultRef={firstResultRef}
              />
            ) : (
              isOpen && <RecipeRows wb={wb} />
            )}

            <SavedRecipes
              recipes={wb.savedRecipes}
              currentId={openView ? recipeIdOf(openView) : null}
              onSelect={wb.pickSaved}
            />
            <UnresolvedCustomRecipes
              recipes={wb.unresolvedCustom}
              onEdit={wb.editRecipe}
              onDelete={wb.deleteRecipe}
            />

            <div className="flex flex-wrap gap-2">
              {wb.canStartOver && (
                <button
                  type="button"
                  onClick={wb.startOver}
                  className={SIDE_BUTTON}
                >
                  Start over
                </button>
              )}
              <AddImportButtons wb={wb} />
            </div>
          </section>

          {openView && (
            <div className="flex min-w-0 flex-1 flex-col gap-4">
              <WorkbenchPanel
                wb={wb}
                className="rounded-2xl border-1 border-secondary bg-[color:var(--color-surface)] p-5 lg:p-8"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
