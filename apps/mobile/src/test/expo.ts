// `expo`'s entry pulls in the native runtime. Under test no native module exists,
// so the optional lookup reports every one as missing: code that guards on it
// (the Live Activity) must take its no-native path.
export function requireOptionalNativeModule(_name: string): null {
  return null;
}
