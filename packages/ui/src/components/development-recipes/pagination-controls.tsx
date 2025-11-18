import { cn } from '../../lib/cn';
import type { DevelopmentCombinationView } from '@dorkroom/logic';
import type { Table } from '@tanstack/react-table';

interface PaginationControlsProps {
  table: Table<DevelopmentCombinationView>;
}

export function PaginationControls({ table }: PaginationControlsProps) {
  const { pageIndex } = table.getState().pagination;
  const pageCount = table.getPageCount();
  const currentPage = pageIndex + 1;

  if (pageCount <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-end gap-2 text-sm text-white/70">
      <button
        type="button"
        onClick={() => table.previousPage()}
        disabled={!table.getCanPreviousPage()}
        className={cn(
          'rounded-full border border-white/20 px-3 py-1.5 transition hover:border-white/40 hover:text-white',
          !table.getCanPreviousPage() && 'cursor-not-allowed opacity-50'
        )}
      >
        Previous
      </button>
      <span>
        Page {currentPage} of {pageCount}
      </span>
      <button
        type="button"
        onClick={() => table.nextPage()}
        disabled={!table.getCanNextPage()}
        className={cn(
          'rounded-full border border-white/20 px-3 py-1.5 transition hover:border-white/40 hover:text-white',
          !table.getCanNextPage() && 'cursor-not-allowed opacity-50'
        )}
      >
        Next
      </button>
    </div>
  );
}
