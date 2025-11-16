import type { SortingFn } from '@tanstack/table-core';
import type { DevelopmentCombinationView } from '@dorkroom/logic';

declare module '@tanstack/table-core' {
  interface SortingFns {
    favoriteAware: SortingFn<DevelopmentCombinationView>;
  }
}

declare module '@tanstack/react-table' {
  interface SortingFns {
    favoriteAware: SortingFn<DevelopmentCombinationView>;
  }
}
