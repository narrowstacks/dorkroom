import type { DevelopmentCombinationView } from '@dorkroom/logic';
import type { Table } from '@tanstack/react-table';
import { cn } from '../../lib/cn';

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
    <div
      className="flex items-center justify-end gap-2 text-sm"
      style={{ color: 'var(--color-text-secondary)' }}
    >
      <button
        type="button"
        onClick={() => table.previousPage()}
        disabled={!table.getCanPreviousPage()}
        className={cn(
          'rounded-full border px-3 py-1.5 transition',
          !table.getCanPreviousPage() && 'cursor-not-allowed opacity-50'
        )}
        style={{
          borderColor: 'var(--color-border-secondary)',
          color: 'var(--color-text-secondary)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-border-primary)';
          e.currentTarget.style.color = 'var(--color-text-primary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-border-secondary)';
          e.currentTarget.style.color = 'var(--color-text-secondary)';
        }}
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
          'rounded-full border px-3 py-1.5 transition',
          !table.getCanNextPage() && 'cursor-not-allowed opacity-50'
        )}
        style={{
          borderColor: 'var(--color-border-secondary)',
          color: 'var(--color-text-secondary)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-border-primary)';
          e.currentTarget.style.color = 'var(--color-text-primary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-border-secondary)';
          e.currentTarget.style.color = 'var(--color-text-secondary)';
        }}
      >
        Next
      </button>
    </div>
  );
}
