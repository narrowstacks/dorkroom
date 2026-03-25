import { createSupabaseProxy } from '../utils/createSupabaseProxy';

export default createSupabaseProxy({
  name: 'combinations',
  allowedParams: [
    'film',
    'developer',
    'count',
    'page',
    'id',
    'query',
    'fuzzy',
    'limit',
  ],
});
