import {
  createSupabaseProxy,
  type SupabaseProxyConfig,
} from '../utils/createSupabaseProxy';

export const statsProxyConfig: SupabaseProxyConfig = {
  name: 'stats',
  allowedParams: [],
};

export default createSupabaseProxy(statsProxyConfig);
