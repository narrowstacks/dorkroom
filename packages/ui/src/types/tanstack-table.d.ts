import type { SortingFn } from '@tanstack/table-core';

declare module '@tanstack/table-core' {
  interface SortingFns {
    favoriteAware: SortingFn<unknown>;
  }
}

declare module '@tanstack/react-table' {
  interface SortingFns {
    favoriteAware: SortingFn<unknown>;
  }
}
