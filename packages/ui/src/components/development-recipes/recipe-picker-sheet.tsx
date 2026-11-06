import {
  type FC,
  type ReactNode,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { labelMatches } from '../../lib/label-match';
import { ResponsiveModal } from '../responsive-modal';
import { RecipeOptionList } from './recipe-option-list';
import type { RecipePickerOption } from './recipe-picker-option';
import { RecipeSearchBox } from './recipe-search-box';
import {
  SHEET_CLOSE_BUTTON,
  SHEET_DRAWER_BODY,
  SHEET_LIST,
} from './recipe-sheet-classes';

export interface RecipePickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  /** From `getFilmOptions`, `getDeveloperOptions` or `recipeRowsToPickerOptions`. */
  options: readonly RecipePickerOption[];
  selectedValue?: string | null;
  /** Called with the option's value. The sheet then closes itself. */
  onSelect: (value: string) => void;
  /** Names the filter input: "Filter films". */
  filterLabel: string;
  /** Where focus goes on close, in place of the button that opened the sheet. */
  returnFocus?: RefObject<HTMLElement | null>;
  /** Said when there are no options at all, whatever is in the filter. */
  emptyText?: string;
  /** Drawn under the filter, such as a note on what the list leaves out. */
  children?: ReactNode;
  /**
   * Bump to move focus to the selected row, or the first if none is selected.
   * Taken after the commit, so a change of `options` in the same update counts.
   */
  focusRowRequest?: number;
}

/** Scroll `list` just far enough to show `row`. No `scrollIntoView` options: Safari before 16 misreads them. */
function revealInList(list: HTMLElement, row: Element) {
  const listBox = list.getBoundingClientRect();
  const rowBox = row.getBoundingClientRect();
  if (rowBox.top < listBox.top) list.scrollTop += rowBox.top - listBox.top;
  else if (rowBox.bottom > listBox.bottom) {
    list.scrollTop += rowBox.bottom - listBox.bottom;
  }
}

const PickerBody: FC<
  Pick<
    RecipePickerSheetProps,
    | 'options'
    | 'selectedValue'
    | 'onSelect'
    | 'onClose'
    | 'emptyText'
    | 'children'
    | 'focusRowRequest'
  > & { filterLabel: string }
> = ({
  options,
  selectedValue,
  onSelect,
  onClose,
  filterLabel,
  emptyText = 'Nothing to choose from.',
  children,
  focusRowRequest = 0,
}) => {
  const [filter, setFilter] = useState('');
  const listRef = useRef<HTMLUListElement>(null);
  const enterRowRef = useRef<HTMLButtonElement>(null);
  const filterRef = useRef<HTMLInputElement>(null);

  // Mounted fresh on each open, so this opens on the selected row, and typing in
  // the filter does not scroll the list back to it.
  useLayoutEffect(() => {
    const list = listRef.current;
    const row = list?.querySelector('[aria-current]');
    if (list && row) revealInList(list, row);
  }, []);

  // This body mounts on each open, so a count left from the last open is not a request.
  const seenRequest = useRef(focusRowRequest);
  useEffect(() => {
    if (focusRowRequest === seenRequest.current) return;
    seenRequest.current = focusRowRequest;
    (enterRowRef.current ?? filterRef.current)?.focus();
  }, [focusRowRequest]);

  const words = filter.trim();
  const shown = options.filter((option) => labelMatches(option.label, words));

  // With nothing typed, Enter lands where the list opened: on the selected row.
  const enterValue =
    words === '' && shown.some((option) => option.value === selectedValue)
      ? selectedValue
      : shown[0]?.value;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <RecipeSearchBox
        value={filter}
        onChange={setFilter}
        label={filterLabel}
        hideLabel
        placeholder={filterLabel}
        inputRef={filterRef}
        onEscape={onClose}
        onEnter={() => enterRowRef.current?.focus()}
        className="m-0.5 shrink-0"
      />
      {children}
      <output className="block min-h-4 shrink-0 px-2 text-xs text-secondary">
        {options.length === 0
          ? emptyText
          : shown.length === 0
            ? 'Nothing matches that.'
            : ''}
      </output>
      <RecipeOptionList
        ref={listRef}
        options={shown}
        currentValue={selectedValue}
        onSelect={(value) => {
          onSelect(value);
          onClose();
        }}
        rowRefValue={enterValue}
        rowRef={enterRowRef}
        className={SHEET_LIST}
      />
    </div>
  );
};

/**
 * The phone's film, developer and recipe picker: a filter input over a list of
 * 44px buttons. The filter gets no focus on open, because that would raise the
 * keyboard over a list most people only need to tap.
 */
export const RecipePickerSheet: FC<RecipePickerSheetProps> = ({
  isOpen,
  onClose,
  title,
  options,
  selectedValue,
  onSelect,
  filterLabel,
  returnFocus,
  emptyText,
  children,
  focusRowRequest,
}) => (
  <ResponsiveModal
    isOpen={isOpen}
    onClose={onClose}
    title={title}
    isMobile
    closeButtonClassName={SHEET_CLOSE_BUTTON}
    drawerBodyClassName={SHEET_DRAWER_BODY}
    returnFocus={returnFocus}
  >
    <PickerBody
      options={options}
      selectedValue={selectedValue}
      onSelect={onSelect}
      onClose={onClose}
      filterLabel={filterLabel}
      emptyText={emptyText}
      focusRowRequest={focusRowRequest}
    >
      {children}
    </PickerBody>
  </ResponsiveModal>
);
