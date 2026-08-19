import {
  createSupabaseProxy,
  type SupabaseProxyConfig,
} from '../utils/createSupabaseProxy';

export const developersProxyConfig: SupabaseProxyConfig = {
  name: 'developers',
  allowedParams: ['query', 'fuzzy', 'limit', 'type', 'manufacturer', 'slug'],
};

export default createSupabaseProxy(developersProxyConfig);
