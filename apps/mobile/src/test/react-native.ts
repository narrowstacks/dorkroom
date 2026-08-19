// React Native's JS entry point is Flow-typed, which Vite cannot parse, so any
// module that imports it is unloadable under vitest. This stands in for the two
// members `react-native-mmkv` imports at module scope; it never reaches native
// code, because `createMMKV` returns the library's own in-memory instance when
// it detects a test runner (see react-native-mmkv/lib/isTest.js).
export const Platform = { OS: 'ios' } as const;

interface AppStateSubscription {
  remove: () => void;
}

export const AppState = {
  // Nothing dispatches app-state events outside the app, so a listener is
  // registered and simply never called.
  addEventListener(_type: string, _listener: () => void): AppStateSubscription {
    return { remove: () => {} };
  },
};
