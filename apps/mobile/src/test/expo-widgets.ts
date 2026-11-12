// expo-widgets calls `requireNativeModule('ExpoWidgets')` when it is imported,
// which throws wherever the native module is missing. This stand-in throws the
// same way, so a test fails if code imports it without checking first.
throw new Error(
  'expo-widgets was imported without its native module (check requireOptionalNativeModule first)'
);
