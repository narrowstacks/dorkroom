import { createSupabaseProxy } from '../utils/createSupabaseProxy';

export default createSupabaseProxy({
  name: 'films',
  allowedParams: ['query', 'fuzzy', 'limit', 'colorType', 'brand', 'slug'],
});
