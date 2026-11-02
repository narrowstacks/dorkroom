import { describe, expect, it } from 'vitest';
import {
  combinationsQueryOptions,
  developersQueryOptions,
  filmsQueryOptions,
} from '../../queries/api-query-options';
import { queryKeys } from '../../queries/query-keys';

describe('catalogue query options', () => {
  it('use the hooks’ query keys', () => {
    expect(filmsQueryOptions().queryKey).toEqual(queryKeys.films.list());
    expect(developersQueryOptions().queryKey).toEqual(
      queryKeys.developers.list()
    );
    expect(combinationsQueryOptions().queryKey).toEqual(
      queryKeys.combinations.list()
    );
  });
});
