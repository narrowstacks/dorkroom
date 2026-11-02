/**
 * Dorkroom
 * Copyright (C) 2026 Aaron F. Anderson <aaron@affords.art>
 *
 * Licensed under the GNU Affero General Public License, version 3, WITH the
 * additional permission for app store distribution granted under AGPLv3
 * section 7. See LICENSE and LICENSE-EXCEPTION at the repository root.
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { fetchCombinations, fetchDevelopers, fetchFilms } from '@dorkroom/api';
import {
  combinationsQueryOptions,
  developersQueryOptions,
  filmsQueryOptions,
} from '@dorkroom/logic';
import type { QueryClient } from '@tanstack/react-query';

/*
 * Prefetches for the /development and /films loaders. The routes import this
 * module dynamically, inside the loader, so the API client and query options
 * stay out of the entry chunk; the import runs alongside the page chunk.
 *
 * Each prefetch uses the page's own query options (same key, so the page's
 * query picks up the request in flight), with one change: the fetch does not
 * take the query's AbortSignal. Nothing watches a prefetched list yet except,
 * on the home page, the search box's disabled watchers. Leaving home
 * unmounts those, and a fetch holding the signal is aborted when its last
 * watcher leaves, so the page would fetch the list a second time.
 *
 * prefetchQuery never throws, and skips a list whose cached copy is fresh.
 */

const films = () => ({ ...filmsQueryOptions(), queryFn: () => fetchFilms() });

export function prefetchFilmsPageData(queryClient: QueryClient): void {
  void queryClient.prefetchQuery(films());
}

export function prefetchDevelopmentPageData(queryClient: QueryClient): void {
  void queryClient.prefetchQuery(films());
  void queryClient.prefetchQuery({
    ...developersQueryOptions(),
    queryFn: () => fetchDevelopers(),
  });
  void queryClient.prefetchQuery({
    ...combinationsQueryOptions(),
    queryFn: () => fetchCombinations(),
  });
}
