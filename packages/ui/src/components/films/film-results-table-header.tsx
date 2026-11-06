import type { FilmSort } from '@dorkroom/logic';
import type { FC } from 'react';
import {
  ResultsTableHead,
  SortableResultsTableHead,
} from '../results/results-table-head';
import type { FilmTableView } from './film-results-view';

interface FilmResultsTableHeaderProps {
  view: FilmTableView;
  sort: FilmSort;
  onSortChange: (sort: FilmSort) => void;
  showRecipes: boolean;
}

interface SortableHeaderProps {
  label: string;
  sortKey: FilmSort;
  /** Each column has the one direction that makes sense; no toggle. */
  direction: 'ascending' | 'descending';
  sort: FilmSort;
  onSortChange: (sort: FilmSort) => void;
  align?: 'left' | 'right';
  className?: string;
}

const SortableHeader: FC<SortableHeaderProps> = ({
  sortKey,
  sort,
  onSortChange,
  ...props
}) => (
  <SortableResultsTableHead
    {...props}
    active={sort === sortKey}
    onSort={() => onSortChange(sortKey)}
  />
);

/**
 * The sticky head of the films table; `view` decides which columns it has.
 * Percent widths from `2xl` spread the columns, so a very wide table does not
 * put a long gap between a film's name and its details.
 */
export const FilmResultsTableHeader: FC<FilmResultsTableHeaderProps> = ({
  view,
  sort,
  onSortChange,
  showRecipes,
}) => {
  const full = view === 'table';
  const sortProps = { sort, onSortChange };
  return (
    <thead className="sticky top-0 z-10 bg-surface-muted">
      <tr>
        <ResultsTableHead className="w-16">
          <span className="sr-only">Photo</span>
        </ResultsTableHead>
        <SortableHeader
          {...sortProps}
          label="Film"
          sortKey="name"
          direction="ascending"
        />
        <ResultsTableHead className="w-28 2xl:w-[14%]">Type</ResultsTableHead>
        <SortableHeader
          {...sortProps}
          label="ISO"
          sortKey="iso"
          direction="ascending"
          align="right"
          className="w-20 2xl:w-[10%]"
        />
        {full && (
          <ResultsTableHead className="w-36 text-right 2xl:w-[14%]">
            Reciprocity
          </ResultsTableHead>
        )}
        {showRecipes && (
          <SortableHeader
            {...sortProps}
            label="Recipes"
            sortKey="recipes"
            direction="descending"
            align="right"
            className="w-24 2xl:w-[12%]"
          />
        )}
        {full && (
          <ResultsTableHead className="w-32 2xl:w-[16%]">
            Status
          </ResultsTableHead>
        )}
      </tr>
    </thead>
  );
};
