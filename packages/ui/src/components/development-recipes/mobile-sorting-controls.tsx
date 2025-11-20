import { type FC } from 'react';
import { Select } from '../select';
import type { SelectItem } from '@dorkroom/logic';
import type { SortingState } from '@tanstack/react-table';
import { cn } from '../../lib/cn';

interface MobileSortingControlsProps {
  className?: string;
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
}

const sortingOptions: SelectItem[] = [
  { label: 'Film (A-Z)', value: 'film-asc' },
  { label: 'Film (Z-A)', value: 'film-desc' },
  { label: 'Developer (A-Z)', value: 'developer-asc' },
  { label: 'Developer (Z-A)', value: 'developer-desc' },
  { label: 'ISO (Low to High)', value: 'iso-asc' },
  { label: 'ISO (High to Low)', value: 'iso-desc' },
  { label: 'Time (Short to Long)', value: 'time-asc' },
  { label: 'Time (Long to Short)', value: 'time-desc' },
  { label: 'Temperature (Low to High)', value: 'temp-asc' },
  { label: 'Temperature (High to Low)', value: 'temp-desc' },
];

export const MobileSortingControls: FC<MobileSortingControlsProps> = ({
  className,
  sorting,
  onSortingChange,
}) => {
  // Get current sorting value for select
  const getCurrentSortingValue = (): string => {
    if (sorting.length === 0) return 'film-asc';
    const sort = sorting[0];
    const direction = sort.desc ? 'desc' : 'asc';
    return `${sort.id}-${direction}`;
  };

  const handleSortingChange = (value: string) => {
    const [id, direction] = value.split('-');
    onSortingChange([{ id, desc: direction === 'desc' }]);
  };

  return (
    <div
      className={cn('rounded-2xl border p-4 shadow-subtle', className)}
      style={{
        borderColor: 'var(--color-border-secondary)',
        backgroundColor: 'rgba(var(--color-background-rgb), 0.25)',
      }}
    >
      <Select
        label="Sort by"
        selectedValue={getCurrentSortingValue()}
        onValueChange={handleSortingChange}
        items={sortingOptions}
      />
    </div>
  );
};
