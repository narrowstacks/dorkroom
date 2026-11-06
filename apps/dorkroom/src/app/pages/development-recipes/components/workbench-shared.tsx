import { LiveStatusAlert, Skeleton } from '@dorkroom/ui';
import { RecipePanel } from '@dorkroom/ui/development-recipes';
import { Plus, RotateCcw, Upload } from 'lucide-react';
import type { RecipeWorkbench } from '../hooks/useRecipeWorkbench';
import { OpenRecipeAnnouncement } from './open-recipe-announcement';
import { SharedRecipeNotice } from './shared-recipe-notice';

export const SIDE_BUTTON =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-1 border-secondary px-4 text-sm font-medium text-primary transition-colors hoverable-action-btn focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]';

export function WorkbenchSkeleton() {
  return (
    <div
      data-testid="workbench-skeleton"
      aria-hidden="true"
      className="flex flex-col gap-6 md:flex-row md:items-start"
    >
      <div className="flex shrink-0 flex-col gap-4 md:w-72 lg:w-80">
        <Skeleton className="border-1 border-secondary h-11 w-full rounded-xl" />
        <Skeleton className="border-1 border-secondary h-11 w-full rounded-xl" />
        <Skeleton className="border-1 border-secondary h-11 w-full rounded-xl" />
        <Skeleton className="border-1 border-secondary h-40 w-full rounded-xl" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <Skeleton className="border-1 border-secondary h-8 w-2/3 rounded-lg" />
        <Skeleton className="border-1 border-secondary h-24 w-1/2 rounded-lg" />
        <Skeleton className="border-1 border-secondary h-40 w-full rounded-xl" />
      </div>
    </div>
  );
}

/** A sheet's Retry too: the page's own is out of reach behind an open sheet. */
export function RetryButton({ wb }: { wb: RecipeWorkbench }) {
  return (
    <button
      type="button"
      onClick={() => void wb.retry()}
      disabled={wb.isRefreshing}
      className={SIDE_BUTTON}
    >
      <RotateCcw aria-hidden="true" className="size-4" />
      {wb.isRefreshing ? 'Retrying…' : 'Retry'}
    </button>
  );
}

/** Load failure with Retry, the shared-link notice and the screen reader line. */
export function WorkbenchBanners({ wb }: { wb: RecipeWorkbench }) {
  return (
    <>
      <LiveStatusAlert
        action="error"
        message={
          wb.loadFailed
            ? 'The recipe catalogue did not load. Your custom recipes are still here.'
            : null
        }
      />
      {wb.loadFailed && (
        <div>
          <RetryButton wb={wb} />
        </div>
      )}
      <SharedRecipeNotice
        isLoading={wb.isLoadingSharedRecipe}
        message={wb.sharedRecipeError ?? null}
        onDismiss={wb.dismissSharedRecipeError}
      />
      <OpenRecipeAnnouncement wb={wb} />
    </>
  );
}

/** Mounted while empty: a live region added with its text can be skipped. */
export function PromptNote({ wb }: { wb: RecipeWorkbench }) {
  return (
    <output className="block text-sm text-secondary empty:hidden">
      {wb.promptNote ?? (wb.isLoading ? 'Loading recipes…' : '')}
    </output>
  );
}

/** Two children, for the caller's own list: it may lead with Start over. */
export function AddImportButtons({
  wb,
  onAction,
}: {
  wb: RecipeWorkbench;
  /** Runs before either action, for a sheet that has to close first. */
  onAction?: () => void;
}) {
  return (
    <>
      <button
        type="button"
        onClick={() => {
          onAction?.();
          wb.openCustomForm();
        }}
        className={SIDE_BUTTON}
      >
        <Plus aria-hidden="true" className="size-4" />
        Add custom recipe
      </button>
      {wb.isLoaded && (
        <button
          type="button"
          onClick={() => {
            onAction?.();
            wb.openImport();
          }}
          className={SIDE_BUTTON}
        >
          <Upload aria-hidden="true" className="size-4" />
          Import recipe
        </button>
      )}
    </>
  );
}

/** The open recipe, under the note on any part of the link it could not honour. */
export function WorkbenchPanel({
  wb,
  layout,
  className,
}: {
  wb: RecipeWorkbench;
  layout?: 'phone';
  className?: string;
}) {
  const { openView, film } = wb;
  if (!openView) return null;
  return (
    <>
      {wb.hintNote && (
        <p className="rounded-xl border-1 border-secondary p-3 text-sm text-primary">
          {wb.hintNote}
        </p>
      )}
      <RecipePanel
        layout={layout}
        className={className}
        view={openView}
        film={film?.film}
        onSelectRecipe={wb.pickChoice}
        temperatureChoices={wb.temperatureChoices}
        speedChoices={wb.speedChoices}
        isSaved={wb.isSaved}
        onToggleSaved={() => wb.toggleSaved(openView)}
        onCopyLink={wb.copyLink}
        onEdit={() => wb.editRecipe(openView)}
        onDelete={() => wb.deleteRecipe(openView)}
        headingRef={wb.headingRef}
        mixVolumeMl={wb.mixVolumeMl}
        onMixVolumeMlChange={wb.setMixVolumeMl}
      />
    </>
  );
}
