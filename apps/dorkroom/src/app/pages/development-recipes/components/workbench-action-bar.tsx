import { RecipePanelActions } from '@dorkroom/ui/development-recipes';
import { useEffect } from 'react';
import { BESIDE_MOBILE_FABS } from '../../../../components/mobile-fab';
import type { RecipeWorkbench } from '../hooks/useRecipeWorkbench';

/**
 * Save and Copy link, pinned on the phone in the floating buttons' row, so the
 * three together cover one strip of the page. `__root.tsx` already reserves that
 * strip at the end of the page. Below the sheets (z-50) so an open sheet covers it.
 */
export function WorkbenchActionBar({ wb }: { wb: RecipeWorkbench }) {
  // Tabbing scrolls a focused control only into the viewport, which would leave
  // it under this row. Same height as `__root.tsx`'s padding.
  useEffect(() => {
    const { style } = document.documentElement;
    style.scrollPaddingBottom = 'calc(env(safe-area-inset-bottom) + 5rem)';
    return () => {
      style.scrollPaddingBottom = '';
    };
  }, []);

  return (
    <div className={`${BESIDE_MOBILE_FABS} z-30`}>
      <RecipePanelActions
        compact
        className="flex-nowrap"
        isSaved={wb.isSaved}
        onToggleSaved={() => wb.openView && wb.toggleSaved(wb.openView)}
        onCopyLink={wb.copyLink}
      />
    </div>
  );
}
