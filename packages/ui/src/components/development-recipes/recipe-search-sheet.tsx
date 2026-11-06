import type { RecipeSearchHit, RecipeSearchResult } from '@dorkroom/logic';
import { type FC, type ReactNode, type RefObject, useRef } from 'react';
import { ResponsiveModal } from '../responsive-modal';
import { RecipeSearchBox } from './recipe-search-box';
import { RecipeSearchResults } from './recipe-search-results';
import {
  SHEET_CLOSE_BUTTON,
  SHEET_DRAWER_BODY,
  SHEET_LIST,
} from './recipe-sheet-classes';

export interface RecipeSearchSheetProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  onQueryChange: (query: string) => void;
  /**
   * What `result` answers, when it is not `query`: the deferred text, or blank
   * while the catalogue has not loaded and a result of nothing would be untrue.
   */
  resultsQuery?: string;
  /** From `searchRecipes`, on `resultsQuery`. */
  result: RecipeSearchResult;
  /** Called with the picked hit. The sheet then closes itself. */
  onSelectHit: (hit: RecipeSearchHit) => void;
  /** Drawn under the search box, such as a loading or failed status. */
  children?: ReactNode;
  /**
   * Drawn after the results and scrolling with them, for what must not push the
   * first result down behind the keyboard.
   */
  afterResults?: ReactNode;
  /** Said when nothing matches, where "Try fewer words" would mislead. */
  emptyText?: string;
  /** The search box, for the caller to move focus to. */
  inputRef?: RefObject<HTMLInputElement | null>;
  /**
   * Where focus goes on close, in place of the button that opened the sheet. Read
   * as the sheet closes, so an element the pick itself mounts is too late and
   * focus goes to the opener: focus that element from its own effect instead.
   */
  returnFocus?: RefObject<HTMLElement | null>;
}

/**
 * The phone's search: nearly full height from the start, so the keyboard coming
 * up does not push the page around. `vh` in the inline limit, because Chromium 80
 * lacks `dvh` and only class names get lowered for it. The class's `dvh` stops the
 * header sliding off the top on a phone with its browser bars showing.
 */
export const RecipeSearchSheet: FC<RecipeSearchSheetProps> = ({
  isOpen,
  onClose,
  query,
  onQueryChange,
  resultsQuery,
  result,
  onSelectHit,
  emptyText,
  children,
  afterResults,
  inputRef: givenInputRef,
  returnFocus,
}) => {
  const ownInputRef = useRef<HTMLInputElement>(null);
  const inputRef = givenInputRef ?? ownInputRef;
  const firstResultRef = useRef<HTMLButtonElement>(null);
  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title="Search recipes"
      isMobile
      mobileMaxHeight="92vh"
      drawerClassName="h-[92dvh] max-h-[92dvh]"
      closeButtonClassName={SHEET_CLOSE_BUTTON}
      drawerBodyClassName={SHEET_DRAWER_BODY}
      initialFocus={inputRef}
      returnFocus={returnFocus}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <RecipeSearchBox
          value={query}
          onChange={onQueryChange}
          hideLabel
          inputRef={inputRef}
          onEscape={onClose}
          onEnter={() => firstResultRef.current?.focus()}
          className="m-0.5 shrink-0"
        />
        {children}
        <RecipeSearchResults
          query={resultsQuery ?? query}
          result={result}
          emptyText={emptyText}
          firstResultRef={firstResultRef}
          onSelectHit={(hit) => {
            onSelectHit(hit);
            onClose();
          }}
          className={SHEET_LIST}
        >
          {afterResults}
        </RecipeSearchResults>
      </div>
    </ResponsiveModal>
  );
};
