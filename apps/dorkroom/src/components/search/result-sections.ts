/**
 * What the results panel beside the answer lists, in order: suggestions,
 * then the grouped matches, each row with the element id the search box
 * points at when it is the active option.
 */
import type {
  HomeLinkTarget,
  HomeResultGroup,
  HomeSuggestion,
  HomeSuggestionHint,
} from '@dorkroom/logic';
import { homeToolCards } from '@dorkroom/ui';

const HINT_LABELS = {
  film: 'Film',
  developer: 'Developer',
  tool: 'Tool',
  recipe: 'Recipe',
  reciprocity: 'Reciprocity',
  border: 'Border',
  resize: 'Resize',
  mat: 'Mat',
  lens: 'Lens',
  stops: 'Stops',
} as const satisfies Record<HomeSuggestionHint, string>;

/**
 * How the search box's active option is marked while the box has focus: a
 * tint and a hairline, never the focus ring, which belongs to real focus.
 */
export const activeOptionClass =
  'bg-[color:var(--color-surface-muted)] ring-1 ring-inset ring-[color:var(--color-border-primary)]';

/** How many suggestions the panel shows, once those the matches list are dropped. */
const MAX_SUGGESTIONS = 4;

/** How many match groups the panel shows. */
const MAX_GROUPS = 4;

interface LinkRow {
  kind: 'link';
  id: string;
  title: string;
  detail: string;
  meta: string;
  target: HomeLinkTarget;
}

interface SuggestionRow {
  kind: 'suggestion';
  id: string;
  title: string;
  hint: string;
  suggestion: HomeSuggestion;
}

export interface ResultSection {
  key: string;
  label: string;
  /** Every match, of which `rows` is the first few; none for suggestions. */
  total: number | null;
  rows: (LinkRow | SuggestionRow)[];
}

/** A tool as the home tool cards name it. */
const toolCard = (route: HomeLinkTarget['to']) =>
  homeToolCards.find((card) => card.href === route);

/** The rows a group lists; tools are named from the home tool cards. */
function linkRows(group: HomeResultGroup): Omit<LinkRow, 'id'>[] {
  if (group.key !== 'tools') {
    return group.items.map((item) => ({ kind: 'link', ...item }));
  }
  return group.tools.slice(0, 3).flatMap((route) => {
    const card = toolCard(route);
    return card
      ? [
          {
            kind: 'link' as const,
            title: card.title,
            detail: card.description,
            meta: '',
            target: { to: route, search: {} } satisfies HomeLinkTarget,
          },
        ]
      : [];
  });
}

/**
 * The panel's sections in order: the suggestions the matches do not already
 * list, then the matches. Each row gets an element id from `idPrefix`, which
 * the search box points at as its active option.
 */
export function resultSections(
  groups: readonly HomeResultGroup[],
  suggestions: readonly HomeSuggestion[],
  idPrefix: string
): ResultSection[] {
  const matches = groups.slice(0, MAX_GROUPS).map((group): ResultSection => ({
    key: group.key,
    label: group.label,
    total: group.total,
    rows: linkRows(group).map((row, index) => ({
      ...row,
      id: `${idPrefix}${group.key}-${index}`,
    })),
  }));
  const listed = new Set(
    matches.flatMap((section) => section.rows.map((row) => row.title))
  );
  const suggested = suggestions
    .map((suggestion) => ({
      suggestion,
      // A tool is named as its card and the tools group name it.
      title:
        (suggestion.tool && toolCard(suggestion.tool)?.title) ??
        suggestion.label,
    }))
    .filter(({ title }) => !listed.has(title))
    .slice(0, MAX_SUGGESTIONS)
    .map(({ suggestion, title }, index): SuggestionRow => ({
      kind: 'suggestion',
      id: `${idPrefix}suggestion-${index}`,
      title,
      hint: HINT_LABELS[suggestion.hint],
      suggestion,
    }));
  return [
    ...(suggested.length
      ? [
          {
            key: 'suggestions',
            label: 'Suggestions',
            total: null,
            rows: suggested,
          },
        ]
      : []),
    ...matches,
  ];
}
