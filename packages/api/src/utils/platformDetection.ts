export type PlatformType = 'web' | 'native';

export interface ApiEndpointConfig {
  baseUrl: string;
  platform: PlatformType;
  requiresAuth: boolean;
}

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
const isDev =
  (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') ||
  (typeof window !== 'undefined' && (window as { __DORKROOM_DEV__?: boolean }).__DORKROOM_DEV__ === true);

const getEnvBaseUrl = (): string | undefined => {
  if (typeof process !== 'undefined') {
    return (
      process.env.NX_PUBLIC_DORKROOM_API_BASE_URL ||
      process.env.VITE_DORKROOM_API_BASE_URL ||
      process.env.PUBLIC_DORKROOM_API_BASE_URL ||
      process.env.DORKROOM_API_BASE_URL ||
      process.env.DORKROOM_API?.replace(/\/$/, '') || // Support DORKROOM_API and remove trailing slash
      undefined
    );
  }
  return undefined;
};

const getWindowBaseUrl = (): string | undefined => {
  if (typeof window !== 'undefined') {
    const win = window as unknown as Record<string, unknown>;
    const candidate = win.__DORKROOM_API_BASE_URL__;
    if (typeof candidate === 'string') {
      return candidate;
    }
  }
  return undefined;
};

const DEFAULT_BASE_URL = isDev ? 'https://beta.dorkroom.art/api' : 'https://beta.dorkroom.art/api';

export function getPlatformType(): PlatformType {
  return isBrowser ? 'web' : 'native';
}

export function isWebPlatform(): boolean {
  return getPlatformType() === 'web';
}

export function isNativePlatform(): boolean {
  return !isWebPlatform();
}

export function getApiEndpointConfig(): ApiEndpointConfig {
  // Check if we have Supabase master API key for direct access
  const supabaseMasterKey = typeof process !== 'undefined' 
    ? process.env.SUPABASE_MASTER_API_KEY 
    : undefined;
  
  let baseUrl: string;
  let requiresAuth = false;
  
  if (supabaseMasterKey) {
    // Use direct Supabase endpoints when we have the master key
    baseUrl = 'https://REDACTED_SUPABASE_URL/functions/v1';
    requiresAuth = true;
  } else {
    // Fall back to API proxy endpoints
    baseUrl =
      getEnvBaseUrl() ||
      getWindowBaseUrl() ||
      (isWebPlatform() && !isDev ? '/api' : undefined) ||
      DEFAULT_BASE_URL;
    requiresAuth = false;
  }

  return {
    baseUrl,
    platform: getPlatformType(),
    requiresAuth,
  };
}

export function getApiUrl(endpoint: string): string {
  const config = getApiEndpointConfig();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const cleanBaseUrl = config.baseUrl.endsWith('/')
    ? config.baseUrl.slice(0, -1)
    : config.baseUrl;

  return `${cleanBaseUrl}/${cleanEndpoint}`;
}

export function getEnvironmentConfig() {
  return {
    isDevelopment: isDev,
    platform: getPlatformType(),
    apiEndpoint: getApiEndpointConfig(),
  };
}
