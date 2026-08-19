// react-native-mmkv imports NitroModules at module scope but only calls it
// outside a test runner: createMMKV() returns the library's own in-memory
// instance when isTest() sees VITEST_WORKER_ID (react-native-mmkv/lib/isTest.js),
// and every Nitro touch is lazy inside getMMKVFactory/getPlatformContext.
// Nitro's real entry reaches Flow-typed react-native subpaths that Vite cannot
// parse, so this stands in for it. It throws rather than returning a fake: if a
// test ever does reach native code, that is a bug worth failing loudly on.
export const NitroModules = {
  createHybridObject(name: string): never {
    throw new Error(
      `NitroModules.createHybridObject(${name}) reached native code in a test. ` +
        'MMKV should have returned its in-memory instance instead.'
    );
  },
};
