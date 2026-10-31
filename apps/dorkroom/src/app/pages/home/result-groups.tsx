import type { HomeLinkTarget, HomeSuggestion } from '@dorkroom/logic';
import { cn } from '@dorkroom/ui';
import { Link } from '@tanstack/react-router';
import { useId } from 'react';
import { activeOptionClass, type ResultSection } from './result-sections';

const rowClass =
  '-mx-2 grid scroll-my-24 grid-cols-[1fr_auto] gap-x-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-[color:var(--color-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus-ring)]';

/** The answer's link as the listbox's first option. */
interface AnswerOption {
  id: string;
  /** The link and the answer it opens: "Open recipe: Ilford HP5 Plus in …". */
  name: string;
  target: HomeLinkTarget;
}

interface Listbox {
  /** The option Enter opens. */
  activeId: string | null;
  /** Mark the active option (the box has focus). */
  highlight: boolean;
  answer: AnswerOption | null;
}

interface ResultGroupsProps {
  /** The listbox's id, which the search box controls. */
  id: string;
  sections: readonly ResultSection[];
  /** A suggestion was picked: fill the box with its query. */
  onSuggest: (suggestion: HomeSuggestion) => void;
  /** While the box has a query the panel is its listbox and the rows its options. */
  listbox: Listbox | null;
  className?: string;
}

/**
 * Suggestions and grouped matches beside the answer: recipes, films,
 * developers and tools. Rows are links (suggestions fill the box), and while
 * there is a query they are also the search box's options, led by the
 * answer's link. That one is for screen readers only, since the card shows
 * the link itself; keeping it here keeps the listbox's order the arrow keys'.
 */
export function ResultGroups({
  id,
  sections,
  onSuggest,
  listbox,
  className,
}: ResultGroupsProps) {
  const empty = sections.length === 0;
  if (empty && !listbox) return null;
  const answer = listbox?.answer;
  return (
    <div
      className={cn(
        // An empty listbox stays for the screen reader, holding the answer's link.
        empty
          ? 'sr-only'
          : 'rounded-2xl border border-[color:var(--color-border-secondary)] bg-[color:var(--color-surface)] px-4',
        className
      )}
    >
      {empty ? null : <h2 className="sr-only">Matches</h2>}
      <div
        id={id}
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- combobox listbox pattern; a <select> cannot hold links or follow aria-activedescendant
        // eslint-disable-next-line react-doctor/prefer-tag-over-role -- combobox listbox pattern; a <select> cannot hold links or follow aria-activedescendant
        role={listbox ? 'listbox' : undefined}
        aria-label={listbox ? 'Search results' : undefined}
        className="divide-y divide-[color:var(--color-border-secondary)]"
      >
        {answer ? (
          <div
            // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a group of listbox options; a <fieldset> is for form controls
            // eslint-disable-next-line react-doctor/prefer-tag-over-role -- a group of listbox options; a <fieldset> is for form controls
            role="group"
            aria-label="Answer"
            className="sr-only"
          >
            <Link
              id={answer.id}
              to={answer.target.to}
              search={answer.target.search}
              // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- combobox listbox pattern; an <option> cannot be a link
              // eslint-disable-next-line react-doctor/prefer-tag-over-role -- combobox listbox pattern; an <option> cannot be a link
              role="option"
              aria-selected={answer.id === listbox?.activeId}
              // Reached with the arrow keys; Tab reaches the card's own link.
              tabIndex={-1}
            >
              {answer.name}
            </Link>
          </div>
        ) : null}
        {sections.map((section) => (
          <Section
            key={section.key}
            section={section}
            onSuggest={onSuggest}
            options={listbox !== null}
            activeId={listbox?.activeId ?? null}
            highlight={listbox?.highlight ?? false}
          />
        ))}
      </div>
    </div>
  );
}

function Section({
  section,
  onSuggest,
  options,
  activeId,
  highlight,
}: {
  section: ResultSection;
  onSuggest: (suggestion: HomeSuggestion) => void;
  /** The rows are listbox options. */
  options: boolean;
  activeId: string | null;
  highlight: boolean;
}) {
  const labelId = useId();
  // Inside a listbox a group may hold only options, so its name is plain text.
  const Label = options ? 'div' : 'h3';
  const optionProps = (rowId: string) =>
    options ? { role: 'option', 'aria-selected': rowId === activeId } : {};
  const classFor = (rowId: string) =>
    cn(rowClass, highlight && rowId === activeId && activeOptionClass);
  return (
    <div
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a group of listbox options; a <fieldset> is for form controls
      // eslint-disable-next-line react-doctor/prefer-tag-over-role -- a group of listbox options; a <fieldset> is for form controls
      role={options ? 'group' : undefined}
      aria-labelledby={options ? labelId : undefined}
      className="py-3"
    >
      <div className="mb-1 flex items-center justify-between">
        <Label
          id={labelId}
          className="text-xs font-medium uppercase tracking-wider text-[color:var(--color-text-tertiary)]"
        >
          {section.label}
        </Label>
        {section.total === null ? null : (
          <span className="text-xs text-[color:var(--color-text-tertiary)]">
            {section.total.toLocaleString('en-US')}
          </span>
        )}
      </div>
      {section.rows.map((row) =>
        row.kind === 'link' ? (
          <Link
            key={row.id}
            id={row.id}
            to={row.target.to}
            search={row.target.search}
            {...optionProps(row.id)}
            className={classFor(row.id)}
          >
            <span className="min-w-0 text-sm font-medium text-[color:var(--color-text-primary)]">
              {row.title}
            </span>
            <span className="row-span-2 self-center text-xs text-[color:var(--color-text-secondary)]">
              {row.meta}
            </span>
            <span className="min-w-0 truncate text-xs text-[color:var(--color-text-tertiary)]">
              {row.detail}
            </span>
          </Link>
        ) : (
          <button
            key={row.id}
            id={row.id}
            type="button"
            {...optionProps(row.id)}
            onClick={() => onSuggest(row.suggestion)}
            className={cn(classFor(row.id), 'w-full items-center')}
          >
            <span className="min-w-0 text-sm text-[color:var(--color-text-primary)]">
              {row.title}
            </span>
            <span className="text-xs text-[color:var(--color-text-tertiary)]">
              {row.hint}
            </span>
          </button>
        )
      )}
    </div>
  );
}
