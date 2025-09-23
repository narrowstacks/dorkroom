import Constants from 'expo-constants';
import { generateSharingUrls, getNativeUrl } from './urlHelpers';
import { debugLog, debugWarn, debugError } from '../utils/debugLogger';

/**
 * Debug helper to test deep link URL generation
 */
export const debugDeepLinking = () => {
  const testEncoded = 'Qm9yZGVyJTIwU2V0dGluZ3MtMC0zLTUwLTAtMC04';

  debugLog('=== Deep Link Debug Info ===');
  debugLog('__DEV__:', __DEV__);
  debugLog('Constants.appOwnership:', Constants.appOwnership);
  debugLog('Constants.expoConfig?.hostUri:', Constants.expoConfig?.hostUri);

  const urls = generateSharingUrls(testEncoded);
  debugLog('Generated URLs:', urls);

  const nativeUrl = getNativeUrl(testEncoded);
  debugLog('Native URL:', nativeUrl);

  debugLog('Test command for iOS simulator:');
  debugLog(`npx uri-scheme open "${nativeUrl}" --ios`);

  debugLog('===========================');

  return urls;
};

// For easier console testing
if (__DEV__ && typeof window !== 'undefined') {
  (window as any).debugDeepLinking = debugDeepLinking;
}
