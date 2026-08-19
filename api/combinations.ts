import {
  createSupabaseProxy,
  type SupabaseProxyConfig,
} from '../utils/createSupabaseProxy';

export const combinationsProxyConfig: SupabaseProxyConfig = {
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
};

export default createSupabaseProxy(combinationsProxyConfig);
