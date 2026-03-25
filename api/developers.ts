import { createSupabaseProxy } from '../utils/createSupabaseProxy';

export default createSupabaseProxy({
  name: 'developers',
  allowedParams: ['query', 'fuzzy', 'limit', 'type', 'manufacturer', 'slug'],
});
