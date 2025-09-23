export type PlatformType = 'web' | 'native';

export interface ApiEndpointConfig {
  baseUrl: string;
  platform: PlatformType;
  requiresAuth: boolean;
}

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
const isDev =
  (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') ||
  (typeof window !== 'undefined' && (window as any).__DORKROOM_DEV__ === true);

const getEnvBaseUrl = (): string | undefined => {
  if (typeof process !== 'undefined') {
    return (
      process.env.NX_PUBLIC_DORKROOM_API_BASE_URL ||
      process.env.VITE_DORKROOM_API_BASE_URL ||
      process.env.PUBLIC_DORKROOM_API_BASE_URL ||
      process.env.DORKROOM_API_BASE_URL ||
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
  const baseUrl =
    getEnvBaseUrl() ||
    getWindowBaseUrl() ||
    (isWebPlatform() && !isDev ? '/api' : undefined) ||
    DEFAULT_BASE_URL;

  return {
    baseUrl,
    platform: getPlatformType(),
    requiresAuth: false,
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
