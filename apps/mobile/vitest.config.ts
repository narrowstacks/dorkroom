import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Mirror the tsconfig `@/* -> src/*` alias so tests can exercise modules
    // that import via `@/` (Metro/tsc resolve this; vitest needs it spelled out).
    // Array form on purpose: object-form aliases match by PREFIX, so a
    // 'react-native' key would also rewrite 'react-native-mmkv' and
    // 'react-native-nitro-modules' and break their resolution.
    alias: [
      {
        find: '@',
        replacement: fileURLToPath(new URL('./src', import.meta.url)),
      },
      // React Native's entry ships Flow-typed JS that Vite cannot parse, so any
      // module reaching it is unloadable. Point just that entry at a test
      // implementation so the real app modules can be imported and exercised.
      {
        find: /^react-native$/,
        replacement: fileURLToPath(
          new URL('./src/test/react-native.ts', import.meta.url)
        ),
      },
      // Both are native modules with no JS-only mode: expo-file-system only
      // forwards to the Expo runtime and Skia is a native canvas. See each file
      // for what it implements faithfully and what it refuses to fake.
      {
        find: /^expo-file-system\/legacy$/,
        replacement: fileURLToPath(
          new URL('./src/test/expo-file-system.ts', import.meta.url)
        ),
      },
      {
        find: /^@shopify\/react-native-skia$/,
        replacement: fileURLToPath(
          new URL('./src/test/react-native-skia.ts', import.meta.url)
        ),
      },
      // Reached only through react-native-mmkv, and only at import time — see
      // the stub for why it is safe and why it throws if actually called.
      {
        find: /^react-native-nitro-modules$/,
        replacement: fileURLToPath(
          new URL('./src/test/react-native-nitro-modules.ts', import.meta.url)
        ),
      },
    ],
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
