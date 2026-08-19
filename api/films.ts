import {
  createSupabaseProxy,
  type SupabaseProxyConfig,
} from '../utils/createSupabaseProxy';

export const filmsProxyConfig: SupabaseProxyConfig = {
  name: 'films',
  allowedParams: ['query', 'fuzzy', 'limit', 'colorType', 'brand', 'slug'],
};

export default createSupabaseProxy(filmsProxyConfig);
