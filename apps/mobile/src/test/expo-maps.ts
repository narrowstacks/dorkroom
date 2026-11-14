// expo-maps calls `requireNativeModule('ExpoMaps')` when it is imported, which
// throws wherever the native module is missing. This stand-in throws the same
// way, and first records that it was reached, so a test can tell an import
// that was guarded from one that was attempted and caught.
Reflect.set(globalThis, '__expoMapsImported', true);
throw new Error(
  'expo-maps was imported without its native module (check requireOptionalNativeModule first)'
);
