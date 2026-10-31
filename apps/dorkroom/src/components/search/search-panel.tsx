import {
  type HomeSearchResult,
  searchHome,
  suggestHome,
  useDebounce,
} from '@dorkroom/logic';
import { cn, TemperatureProvider, useTemperature } from '@dorkroom/ui';
import {
  type MouseEventHandler,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSiteSearchAnalytics } from '../../app/lib/analytics/use-site-search-analytics';
import { AnswerCard } from './answer-card';
import { ResultGroups } from './result-groups';
import { resultSections } from './result-sections';
import { SearchCombobox } from './search-combobox';
import { PAGE_SEARCH_ID } from './search-shortcut';
import { useSearchData } from './use-search-data';

/**
 * What the home page's empty box shows: a real answer, worked out like any
 * other. A calculator query, so it needs no data and is ready on first paint.
 * The nav dialog shows only the Try chips until something is typed.
 */
const EXAMPLE_QUERY = '8x10 35mm 1/2';
const EXAMPLE = searchHome(EXAMPLE_QUERY);

/** Queries that show what the box can do, one per kind of answer. */
const TRY_QUERIES = [
  'hp5 at 800 in dd-x',
  'tri-x 30s',
  '11x14 6x7 1.45',
  '8x10 to 11x14 12s',
  '80mm on 6x6',
  '12s +1/3',
  '16x20 mat 8x10',
];

/** How long the result has to sit unchanged before a screen reader hears it. */
const ANNOUNCE_SETTLE_MS = 600;

/** What the card says while catalog data is missing. */
const pendingText = (loadError: string | null): string =>
  loadError
    ? `${loadError} Calculator questions still work.`
    : 'Loading recipes and films…';

/** One sentence for screen readers when the result changes. */
function announce(result: HomeSearchResult, loadError: string | null): string {
  const { answer, count, pending } = result;
  if (answer) {
    const figure = answer.figure
      ? `${answer.figure.value}${answer.figure.unit ? ` ${answer.figure.unit}` : ''}, ${answer.figure.caption}`
      : null;
    // The notice comes before the number, as on the card.
    if (answer.notice) {
      return `${answer.title}. ${answer.notice}${figure ? ` ${figure}.` : ''}`;
    }
    return figure ? `${answer.title}: ${figure}` : answer.title;
  }
  if (pending) return pendingText(loadError);
  if (!count) return 'No matches.';
  return `${count} ${count === 1 ? 'match' : 'matches'}.`;
}

function TryChips({
  onTry,
  className,
}: {
  onTry: (query: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <span className="text-xs text-[color:var(--color-text-tertiary)]">
        Try
      </span>
      {TRY_QUERIES.map((query) => (
        <button
          key={query}
          type="button"
          onClick={() => onTry(query)}
          className="rounded-full border border-[color:var(--color-border-secondary)] px-3 py-1 text-xs text-[color:var(--color-text-secondary)] transition-colors hover:border-[color:var(--color-border-primary)] hover:text-[color:var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]"
        >
          {query}
        </button>
      ))}
    </div>
  );
}

interface SearchPanelProps {
  /**
   * Where the panel sits. `hero`: the home page's box, where Escape clears it.
   * `dialog`: the nav search, which takes focus on open, leaves Escape to
   * close the dialog, and reports `nav_search` rather than `home_search`.
   */
  variant: 'hero' | 'dialog';
  /** Called when an answer's or a match's link is clicked. */
  onNavigate?: MouseEventHandler<HTMLAnchorElement>;
}

/**
 * The site search: a box that answers darkroom questions (a recipe time, a
 * border, a resize, a lens equivalent) and lists suggestions and matching
 * recipes, films, developers and tools beside the answer. Those results are
 * the box's options: the arrow keys move through them in reading order, and
 * Enter opens the top one (or the one moved to). The home page's hero and
 * the nav bar's search dialog both render it. Recipe answers follow the
 * visitor's °C/°F setting, the stored unit /development reads too.
 */
export function SearchPanel(props: SearchPanelProps) {
  return (
    <TemperatureProvider>
      <SearchPanelBody {...props} />
    </TemperatureProvider>
  );
}

function SearchPanelBody({ variant, onNavigate }: SearchPanelProps) {
  const inDialog = variant === 'dialog';
  const [query, setQuery] = useState('');
  // The option the arrow keys moved to; null means the top one.
  const [chosen, setChosen] = useState<string | null>(null);
  // The active option is marked only while the box has focus, so it never
  // looks like a second focused element.
  const [focused, setFocused] = useState(false);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const { data, load, loadError } = useSearchData();
  // Results trail the keystrokes a little on slow devices; the box never does.
  const settledQuery = useDeferredValue(query);
  const { unit: temperatureUnit } = useTemperature();
  const result = useMemo(
    () => searchHome(settledQuery, data, { temperatureUnit }),
    [settledQuery, data, temperatureUnit]
  );
  // From the same query as the result, so the options never mix two queries.
  const suggestions = useMemo(
    () => suggestHome(settledQuery, data),
    [settledQuery, data]
  );
  useSiteSearchAnalytics(
    inDialog ? 'nav_search' : 'home_search',
    settledQuery,
    result,
    loadError !== null
  );

  // The dialog opens straight into its box. Once, on mount: `inDialog` never
  // changes for a mounted panel.
  useEffect(() => {
    if (inDialog) inputRef.current?.focus();
  }, [inDialog]);

  const searching = settledQuery.trim() !== '';
  // One sentence per settled query, not one per keystroke.
  const announcement = useDebounce(
    searching ? announce(result, loadError) : '',
    ANNOUNCE_SETTLE_MS
  );
  const shown = searching ? result : EXAMPLE;
  const { answer, groups } = shown;
  // The dialog's empty box shows only the Try chips: no example, no listbox.
  const showResults = searching || !inDialog;
  const sections = resultSections(
    groups,
    searching ? suggestions : [],
    `${listId}-`
  );
  const answerOptionId = `${listId}-answer`;
  const answerLinkId = `${listId}-answer-link`;
  // Only a query's results are options; the example's are plain links.
  const options = searching
    ? [
        ...(answer ? [answerOptionId] : []),
        ...sections.flatMap((section) => section.rows.map((row) => row.id)),
      ]
    : [];
  // Enter opens the answer, else the first match; a suggestion only fills
  // the box, so it is the top option only when nothing else is listed.
  const firstMatch = sections.find((section) => section.key !== 'suggestions')
    ?.rows[0]?.id;
  const top = searching
    ? answer
      ? answerOptionId
      : (firstMatch ?? options[0] ?? null)
    : null;
  const activeId = chosen !== null && options.includes(chosen) ? chosen : top;

  const choose = (id: string) => {
    setChosen(id);
    // The answer's option is for screen readers; the eye follows the card's
    // own link. jsdom has no scrollIntoView.
    document
      .getElementById(id === answerOptionId ? answerLinkId : id)
      ?.scrollIntoView?.({ block: 'nearest' });
  };

  const changeQuery = (next: string) => {
    setQuery(next);
    setChosen(null);
  };

  const fill = (next: string) => {
    load();
    changeQuery(next);
    // A Try chip unmounts once the box has a query; keep keyboard users here.
    inputRef.current?.focus();
  };

  return (
    <div
      id={inDialog ? undefined : PAGE_SEARCH_ID}
      className="search-panel flex flex-col gap-4"
    >
      <SearchCombobox
        inputRef={inputRef}
        value={query}
        onChange={changeQuery}
        onIntent={load}
        listId={listId}
        options={options}
        activeId={activeId}
        onActiveChange={choose}
        onFocusedChange={setFocused}
        placeholder="Ask: hp5 at 800 in dd-x"
        standalone={!inDialog}
      />
      <output className="sr-only">{announcement}</output>

      {searching ? null : <TryChips onTry={fill} />}

      {showResults ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start">
          {answer ? (
            <AnswerCard
              answer={answer}
              example={searching ? undefined : EXAMPLE_QUERY}
              linkId={answerLinkId}
              highlighted={focused && activeId === answerOptionId}
              onNavigate={onNavigate}
              className={sections.length ? 'lg:col-span-7' : 'lg:col-span-12'}
            />
          ) : null}
          {!answer && shown.pending ? (
            <p className="rounded-2xl border border-[color:var(--color-border-secondary)] bg-[color:var(--color-surface)] p-4 text-sm text-[color:var(--color-text-secondary)] lg:col-span-7">
              {pendingText(loadError)}
            </p>
          ) : null}
          {!answer && !shown.pending && sections.length === 0 ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-[color:var(--color-border-secondary)] bg-[color:var(--color-surface)] p-4 lg:col-span-12">
              <p className="text-sm text-[color:var(--color-text-secondary)]">
                Nothing matches that yet. Name a film, a developer or a size, or
                try one of these.
              </p>
              <TryChips onTry={fill} />
            </div>
          ) : null}
          <ResultGroups
            id={listId}
            sections={sections}
            onSuggest={(suggestion) => fill(suggestion.query)}
            onNavigate={onNavigate}
            listbox={
              searching
                ? {
                    activeId,
                    highlight: focused,
                    answer: answer
                      ? {
                          id: answerOptionId,
                          name: `${answer.link.label}: ${answer.title}`,
                          target: answer.link.target,
                        }
                      : null,
                  }
                : null
            }
            className={
              answer || shown.pending ? 'lg:col-span-5' : 'lg:col-span-12'
            }
          />
        </div>
      ) : null}
    </div>
  );
}
