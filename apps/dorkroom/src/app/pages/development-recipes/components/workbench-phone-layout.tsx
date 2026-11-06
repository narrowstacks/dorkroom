import { recipeIdOf } from '@dorkroom/logic';
import { useTemperature } from '@dorkroom/ui';
import {
  RecipePickerSheet,
  recipeRowsToPickerOptions,
  RecipeSearchSheet,
  SavedRecipes,
} from '@dorkroom/ui/development-recipes';
import { Ellipsis, Search } from 'lucide-react';
import {
  type RefObject,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { RecipeWorkbench } from '../hooks/useRecipeWorkbench';
import { UnresolvedCustomRecipes } from './unresolved-custom-recipes';
import { WorkbenchActionBar } from './workbench-action-bar';
import {
  FieldButton,
  ICON_BUTTON,
  type PhoneSheet,
  WorkbenchPhoneHeader,
} from './workbench-phone-header';
import { WorkbenchPhoneMenu } from './workbench-phone-menu';
import { WorkbenchScopeNote } from './workbench-scope-note';
import {
  AddImportButtons,
  PromptNote,
  RetryButton,
  WorkbenchBanners,
  WorkbenchPanel,
  WorkbenchSkeleton,
} from './workbench-shared';

/** Why a sheet has nothing to show yet, or blank once the catalogue is here. */
const catalogueStatus = (wb: RecipeWorkbench) => {
  if (wb.isLoaded) return '';
  return wb.loadFailed
    ? 'The recipe catalogue did not load.'
    : 'Loading recipes…';
};

/** The status in place of "No recipes match", with a Retry the page's can't be. */
function SearchSheetStatus({
  wb,
  inputRef,
}: {
  wb: RecipeWorkbench;
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  const hasFailed = wb.loadFailed && !wb.isLoaded;
  // A Retry that works removes itself, which would leave focus on nothing.
  const hadFailed = useRef(hasFailed);
  useEffect(() => {
    if (
      hadFailed.current &&
      !hasFailed &&
      document.activeElement === document.body
    ) {
      inputRef.current?.focus();
    }
    hadFailed.current = hasFailed;
  }, [hasFailed, inputRef]);
  return (
    <>
      {/* Mounted while empty: a live region added with its text can be skipped. */}
      <output className="block shrink-0 px-2 text-sm text-primary empty:hidden">
        {catalogueStatus(wb)}
      </output>
      {hasFailed && (
        <div className="shrink-0 px-0.5">
          <RetryButton wb={wb} />
        </div>
      )}
    </>
  );
}

/**
 * The phone: pickers that open bottom sheets, and with a recipe open, the recipe
 * filling the screen under a compact header. It reads everything from the same
 * `useRecipeWorkbench` state as the wide layout, so a resize keeps the open
 * recipe, the search text and the mixer volume.
 */
export function WorkbenchPhoneLayout({ wb }: { wb: RecipeWorkbench }) {
  const { unit } = useTemperature();
  const { openView, film, developer } = wb;
  const isOpen = !!openView;

  // A search text already here, from `?q=` or the wide layout, opens the sheet,
  // unless this sheet was already closed on it.
  const [sheet, setSheet] = useState<PhoneSheet | null>(() =>
    wb.query.trim() === '' || wb.searchDismissed ? null : 'search'
  );
  const close = () => setSheet(null);

  const filmRef = useRef<HTMLButtonElement>(null);
  const developerRef = useRef<HTMLButtonElement>(null);
  const recipeRef = useRef<HTMLButtonElement>(null);
  // The prompt's search button or the header's: only one is mounted.
  const searchRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [focusRowRequest, setFocusRowRequest] = useState(0);
  const pickerProps = {
    focusRowRequest,
    emptyText:
      catalogueStatus(wb) ||
      (wb.scope === 'all'
        ? 'No recipes to choose from.'
        : `No ${wb.scope} recipes to choose from.`),
    children: (
      <WorkbenchScopeNote
        wb={wb}
        onShowAll={() => setFocusRowRequest((count) => count + 1)}
      />
    ),
  };
  // Start over lands on Film, which is a button here.
  useImperativeHandle(wb.pickersRef, () => ({
    focusFilm: () => filmRef.current?.focus(),
  }));

  // A pick that opens a recipe moves focus to its heading. Read after the commit,
  // because the heading may be mounted by that very pick.
  const [picks, setPicks] = useState(0);
  const pick = () => setPicks((count) => count + 1);
  useEffect(() => {
    if (picks > 0 && openView) wb.focusHeading();
    // Only a pick should do this, not every later change of recipe.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [picks]);

  const recipeOptions = useMemo(
    () => recipeRowsToPickerOptions(wb.rows, { unit, boxIso: wb.boxIso }),
    [wb.rows, unit, wb.boxIso]
  );
  const pickRecipe = (value: string) => {
    const row = wb.rows.find(({ view }) => recipeIdOf(view) === value);
    if (row) wb.pickRow(row.view);
  };

  const refs = {
    film: filmRef,
    developer: developerRef,
    recipe: recipeRef,
    search: searchRef,
    menu: menuRef,
  };

  return (
    <div className="flex min-w-0 flex-col gap-4 px-4 pb-4 pt-4">
      <WorkbenchBanners wb={wb} />
      {wb.showSkeleton ? (
        <WorkbenchSkeleton />
      ) : (
        <>
          <section
            aria-labelledby="workbench-title"
            className="flex min-w-0 flex-col gap-3"
          >
            {isOpen ? (
              <h1 id="workbench-title" className="sr-only">
                What are you developing?
              </h1>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <h1
                  id="workbench-title"
                  className="text-2xl font-semibold tracking-tight text-primary"
                >
                  What are you developing?
                </h1>
                <button
                  ref={menuRef}
                  type="button"
                  aria-label="More options"
                  aria-haspopup="dialog"
                  onClick={() => setSheet('menu')}
                  className={ICON_BUTTON}
                >
                  <Ellipsis aria-hidden="true" className="size-5" />
                </button>
              </div>
            )}
            <WorkbenchPhoneHeader
              wb={wb}
              refs={refs}
              recipeOptions={recipeOptions}
              onOpen={setSheet}
            />
            <WorkbenchScopeNote
              wb={wb}
              onShowAll={() => filmRef.current?.focus()}
            />
            <PromptNote wb={wb} />
            {!isOpen && (
              <>
                <FieldButton
                  ref={searchRef}
                  caption="Or search"
                  value={wb.query.trim() || 'Film, developer or speed'}
                  icon={Search}
                  onClick={() => setSheet('search')}
                />
                <SavedRecipes
                  recipes={wb.savedRecipes}
                  onSelect={(recipe) => {
                    pick();
                    wb.pickSaved(recipe);
                  }}
                />
                <UnresolvedCustomRecipes
                  recipes={wb.unresolvedCustom}
                  onEdit={wb.editRecipe}
                  onDelete={wb.deleteRecipe}
                />
                <div className="flex flex-col gap-2">
                  <AddImportButtons wb={wb} />
                </div>
              </>
            )}
          </section>

          {openView && (
            <>
              <WorkbenchPanel wb={wb} layout="phone" />
              <WorkbenchActionBar wb={wb} />
            </>
          )}
        </>
      )}

      <RecipePickerSheet
        isOpen={sheet === 'film'}
        onClose={close}
        title="Film"
        filterLabel="Filter films"
        options={wb.filmOptions}
        selectedValue={film?.key}
        onSelect={(value) => {
          pick();
          wb.selectFilm(value);
        }}
        returnFocus={filmRef}
        {...pickerProps}
      />
      <RecipePickerSheet
        isOpen={sheet === 'developer'}
        onClose={close}
        title="Developer"
        filterLabel="Filter developers"
        options={wb.developerOptions}
        selectedValue={developer?.key}
        onSelect={(value) => {
          pick();
          wb.selectDeveloper(value);
        }}
        returnFocus={developerRef}
        {...pickerProps}
      />
      <RecipePickerSheet
        isOpen={sheet === 'recipe'}
        onClose={close}
        title="Recipe"
        filterLabel="Filter recipes"
        options={recipeOptions}
        selectedValue={openView ? recipeIdOf(openView) : null}
        onSelect={(value) => {
          pick();
          pickRecipe(value);
        }}
        returnFocus={recipeRef}
        {...pickerProps}
      />
      <RecipeSearchSheet
        isOpen={sheet === 'search'}
        onClose={() => {
          wb.dismissSearch();
          close();
        }}
        query={wb.query}
        onQueryChange={wb.setQuery}
        resultsQuery={wb.resultsQuery}
        result={wb.searchResult}
        onSelectHit={wb.pickSearchHit}
        returnFocus={searchRef}
        inputRef={searchInputRef}
        afterResults={
          <WorkbenchScopeNote
            wb={wb}
            onShowAll={() => searchInputRef.current?.focus()}
          />
        }
        emptyText={
          wb.scope === 'all'
            ? undefined
            : `No ${wb.scope} recipes match. Try Show all, or fewer words.`
        }
      >
        <SearchSheetStatus wb={wb} inputRef={searchInputRef} />
      </RecipeSearchSheet>
      <WorkbenchPhoneMenu
        wb={wb}
        isOpen={sheet === 'menu'}
        onClose={close}
        returnFocus={menuRef}
        onPicked={pick}
      />
    </div>
  );
}
