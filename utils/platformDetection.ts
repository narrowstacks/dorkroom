// Mock Platform for web environment
const Platform = { OS: 'web' };

/**
 * Platform types supported by the app
 */
export type PlatformType = 'web' | 'native';

/**
 * API endpoint configuration
 */
export interface ApiEndpointConfig {
  baseUrl: string;
  platform: PlatformType;
  requiresAuth: boolean;
}

/**
 * Determines the current platform category.
 *
 * @returns `'web'` if `Platform.OS` equals `'web'`, `'native'` otherwise.
 */
export function getPlatformType(): PlatformType {
  return Platform.OS === 'web' ? 'web' : 'native';
}

/**
 * Determine whether the current platform is web.
 *
 * @returns `true` if the platform is 'web', `false` otherwise.
 */
export function isWebPlatform(): boolean {
  return Platform.OS === 'web';
}

/**
 * Determine whether the current runtime is a native platform.
 *
 * @returns `true` if running on a native platform, `false` otherwise.
 */
export function isNativePlatform(): boolean {
  return Platform.OS !== 'web';
}

/**
 * Determine the API endpoint configuration appropriate for the current platform and environment.
 *
 * @returns An ApiEndpointConfig describing `baseUrl`, `platform` ('web' | 'native'), and `requiresAuth` chosen according to the runtime platform and `NODE_ENV`.
 */
export function getApiEndpointConfig(): ApiEndpointConfig {
  if (isWebPlatform()) {
    // For web platform, check if we're in development mode
    if (process.env.NODE_ENV === 'development') {
      // In development, use beta.dorkroom.art/api directly
      return {
        baseUrl: 'https://beta.dorkroom.art/api',
        platform: 'web',
        requiresAuth: false,
      };
    } else {
      // In production web, use the local API route which proxies to Supabase
      return {
        baseUrl: '/api',
        platform: 'web',
        requiresAuth: false, // No auth required since the proxy handles the API key
      };
    }
  } else {
    // For native platform, determine the API endpoint based on environment
    let deployedUrl: string;

    if (process.env.NODE_ENV === 'development') {
      // In development, use beta.dorkroom.art/api
      deployedUrl = 'https://beta.dorkroom.art';
    } else {
      // In production, use the deployed Vercel function
      deployedUrl =
        process.env.EXPO_PUBLIC_VERCEL_URL ||
        process.env.EXPO_PUBLIC_API_URL ||
        'https://your-app.vercel.app';
    }

    return {
      baseUrl: `${deployedUrl}/api`,
      platform: 'native',
      requiresAuth: false, // No auth required since the proxy handles the API key
    };
  }
}

/**
 * Constructs the absolute API URL for a given endpoint, normalizing leading and trailing slashes.
 *
 * @param endpoint - Endpoint path which may include a leading slash (e.g., "/users")
 * @returns The full API URL formed by joining the configured base URL and the normalized endpoint
 */
export function getApiUrl(endpoint: string): string {
  const config = getApiEndpointConfig();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const cleanBaseUrl = config.baseUrl.endsWith('/')
    ? config.baseUrl.slice(0, -1)
    : config.baseUrl;

  return `${cleanBaseUrl}/${cleanEndpoint}`;
}

/**
 * Environment configuration helper
 */
export function getEnvironmentConfig() {
  return {
    isDevelopment: process.env.NODE_ENV === 'development',
    platform: getPlatformType(),
    apiEndpoint: getApiEndpointConfig(),
  };
}
