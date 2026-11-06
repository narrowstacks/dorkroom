import {
  type FC,
  type RefObject,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
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
    'options' | 'selectedValue' | 'onSelect' | 'onClose'
  > & { filterLabel: string }
> = ({ options, selectedValue, onSelect, onClose, filterLabel }) => {
  const [filter, setFilter] = useState('');
  const listRef = useRef<HTMLUListElement>(null);
  const enterRowRef = useRef<HTMLButtonElement>(null);

  // Mounted fresh on each open, so this opens on the selected row, and typing in
  // the filter does not scroll the list back to it.
  useLayoutEffect(() => {
    const list = listRef.current;
    const row = list?.querySelector('[aria-current]');
    if (list && row) revealInList(list, row);
  }, []);

  const words = filter.trim().toLowerCase();
  const shown = options.filter((option) =>
    option.label.toLowerCase().includes(words)
  );

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
        onEscape={onClose}
        onEnter={() => enterRowRef.current?.focus()}
        className="m-0.5 shrink-0"
      />
      <output className="block min-h-4 shrink-0 px-2 text-xs text-secondary">
        {shown.length === 0 ? 'Nothing matches that.' : ''}
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
    />
  </ResponsiveModal>
);
