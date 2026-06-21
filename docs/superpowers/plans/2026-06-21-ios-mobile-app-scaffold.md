# iOS Mobile App Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold an iOS app (`apps/mobile`) with Expo that reuses `@dorkroom/logic` and `@dorkroom/api` unchanged, shipping the four core calculators as native screens with iOS 26 Liquid Glass styling.

**Architecture:** A new Expo Router app in the existing Turborepo workspace. Metro consumes `@dorkroom/*` from TypeScript source (enabling `.native.ts` platform overrides). A synchronous MMKV-backed `localStorage` polyfill lets every persistence-using shared hook run unchanged. NativeWind v4 handles layout; Expo's `expo-glass-effect` + `NativeTabs` provide Liquid Glass.

**Tech Stack:** Expo SDK ≥54, Expo Router, React Native 0.81+, React 19, NativeWind v4 (Tailwind CSS v3), `react-native-mmkv`, `expo-glass-effect`, `@tanstack/react-query` (already a `logic` peer), `vitest` (unit), `bun` (package manager).

## Global Constraints

- **iOS deployment target: 26.0.** Liquid Glass headers/tabs are enabled (do NOT set `UIDesignRequiresCompatibility`).
- **App package name: `@dorkroom/mobile`**, located at `apps/mobile/`. Version matches CalVer of the day it lands.
- **Reuse, don't fork:** no existing file in `@dorkroom/logic` or `@dorkroom/api` may be modified. The only addition to a shared package is a NEW `.native.ts` sibling file (Task 4).
- **Never use `any`** — use specific types or `unknown` (repo rule).
- **Always import via package entrypoints** (`@dorkroom/logic`, `@dorkroom/api`) — never internal paths (repo rule).
- **NativeWind v4 requires Tailwind CSS v3** (`tailwindcss@^3.4`), isolated to `apps/mobile`. The web app's Tailwind v4 is untouched.
- **Custom dev build required from day one** — `react-native-mmkv` and `expo-glass-effect` are native modules; Expo Go will not work.
- **Gate safety:** `bun run test` runs `turbo run lint test build typecheck --filter='@dorkroom/*'`. `@dorkroom/mobile` is included, so it MUST define `lint`, `test`, `build` (no-op), and `typecheck` scripts that all pass. No existing `@dorkroom/logic` test may break.
- **Metro consumes `@dorkroom/*` from source** (`packages/*/src`), not `dist`.

---

### Task 1: Scaffold the `apps/mobile` Expo workspace

**Files:**
- Create: `apps/mobile/package.json`
- Create: `apps/mobile/app.json`
- Create: `apps/mobile/tsconfig.json`
- Create: `apps/mobile/.gitignore`
- Create: `apps/mobile/app/_layout.tsx` (temporary minimal root, replaced in Task 5)
- Create: `apps/mobile/app/index.tsx` (temporary boot screen, removed in Task 6)

**Interfaces:**
- Produces: a buildable workspace `@dorkroom/mobile` with gate-safe scripts. Later tasks add config and screens.

- [ ] **Step 1: Create `apps/mobile/package.json`**

```json
{
  "name": "@dorkroom/mobile",
  "version": "2026.06.21",
  "private": true,
  "license": "AGPL-3.0-only",
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start --dev-client",
    "ios": "expo run:ios",
    "prebuild": "expo prebuild --platform ios",
    "lint": "oxlint && biome check --linter-enabled=false .",
    "test": "vitest run --passWithNoTests",
    "build": "echo 'no-op: native app builds run via expo/EAS, not turbo'",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@dorkroom/api": "workspace:*",
    "@dorkroom/logic": "workspace:*",
    "@tanstack/react-query": "^5.90.14",
    "expo": "^54.0.0",
    "expo-glass-effect": "^0.1.0",
    "expo-router": "^6.0.0",
    "expo-status-bar": "^3.0.0",
    "nativewind": "^4.1.23",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "react-native": "0.81.4",
    "react-native-mmkv": "^3.0.0",
    "react-native-reanimated": "^4.0.0",
    "react-native-safe-area-context": "^5.0.0",
    "react-native-screens": "^4.0.0"
  },
  "devDependencies": {
    "@types/react": "~19.1.0",
    "tailwindcss": "^3.4.17",
    "typescript": "~5.9.0",
    "vitest": "4.1.7"
  }
}
```

> Versions are floors; let the Expo install (Step 4) align them to the SDK. React is pinned to Expo's React (19.1.x) to avoid a duplicate-React install alongside the root's 19.2.3.

- [ ] **Step 2: Create `apps/mobile/app.json`**

```json
{
  "expo": {
    "name": "Dorkroom",
    "slug": "dorkroom",
    "scheme": "dorkroom",
    "version": "1.0.0",
    "orientation": "portrait",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "art.dorkroom.mobile",
      "deploymentTarget": "26.0"
    },
    "plugins": [
      "expo-router",
      [
        "expo-build-properties",
        { "ios": { "deploymentTarget": "26.0" } }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

- [ ] **Step 3: Create `apps/mobile/tsconfig.json`**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.ts",
    "expo-env.d.ts",
    "nativewind-env.d.ts"
  ]
}
```

- [ ] **Step 4: Create `apps/mobile/.gitignore`**

```
.expo/
dist/
ios/
android/
*.log
```

- [ ] **Step 5: Create temporary `apps/mobile/app/_layout.tsx`**

```tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return <Stack />;
}
```

- [ ] **Step 6: Create temporary `apps/mobile/app/index.tsx`**

```tsx
import { Text, View } from 'react-native';

export default function BootScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Dorkroom mobile scaffold booting…</Text>
    </View>
  );
}
```

- [ ] **Step 7: Install dependencies and align Expo versions**

Run:
```bash
cd /Users/aaron/workspace/dorkroom
bun install
cd apps/mobile && bunx expo install --fix
cd /Users/aaron/workspace/dorkroom && bun install
```
Expected: install completes; `apps/mobile/node_modules` (or hoisted root) resolves `expo`, `expo-router`, `react-native`. `expo install --fix` rewrites RN-library versions to SDK-compatible ones.

- [ ] **Step 8: Verify the workspace is gate-safe**

Run: `bun run test 2>&1 | tail -30`
Expected: turbo runs `@dorkroom/mobile`'s `lint`/`test`/`build`/`typecheck`. `test` passes with no tests, `build` echoes the no-op. `typecheck` may report errors only from the not-yet-created config (NativeWind types) — if so, that is fixed in Task 2; confirm no *other* `@dorkroom/*` package regressed. If `lint` flags the temporary files, accept it for now (they are removed in Task 6).

- [ ] **Step 9: Commit**

```bash
git add apps/mobile
git commit -m "feat(mobile): scaffold @dorkroom/mobile Expo workspace"
```

---

### Task 2: Metro + monorepo + NativeWind v4 configuration

**Files:**
- Create: `apps/mobile/metro.config.js`
- Create: `apps/mobile/babel.config.js`
- Create: `apps/mobile/tailwind.config.js`
- Create: `apps/mobile/global.css`
- Create: `apps/mobile/nativewind-env.d.ts`
- Modify: `apps/mobile/app/_layout.tsx` (import `global.css`)

**Interfaces:**
- Consumes: the workspace from Task 1.
- Produces: Metro that (a) resolves `@dorkroom/*` from source across the monorepo and (b) compiles NativeWind `className` props. `className` is available on RN components app-wide.

- [ ] **Step 1: Create `apps/mobile/metro.config.js`**

```js
// Learn more: https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('node:path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch the whole monorepo so changes to @dorkroom/* hot-reload.
config.watchFolders = [workspaceRoot];

// 2. Resolve modules from the app first, then the workspace root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Force a single React/React Native instance (avoid duplicate copies).
config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, 'node_modules/react'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
};

module.exports = withNativeWind(config, { input: './global.css' });
```

- [ ] **Step 2: Create `apps/mobile/babel.config.js`**

```js
module.exports = (api) => {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  };
};
```

- [ ] **Step 3: Create `apps/mobile/tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

- [ ] **Step 4: Create `apps/mobile/global.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 5: Create `apps/mobile/nativewind-env.d.ts`**

```ts
/// <reference types="nativewind/types" />
```

- [ ] **Step 6: Import `global.css` in the root layout**

Replace the contents of `apps/mobile/app/_layout.tsx`:

```tsx
import '../global.css';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return <Stack />;
}
```

- [ ] **Step 7: Verify className compiles on a real component**

Temporarily replace `apps/mobile/app/index.tsx` body with a `className`-styled view:

```tsx
import { Text, View } from 'react-native';

export default function BootScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-black">
      <Text className="text-lg font-semibold text-white">NativeWind OK</Text>
    </View>
  );
}
```

Run: `cd apps/mobile && bunx tsc --noEmit`
Expected: PASS (NativeWind types now resolve `className`).

- [ ] **Step 8: Verify Metro bundles**

Run: `cd apps/mobile && bunx expo export --platform ios 2>&1 | tail -20`
Expected: export completes (bundle written to `dist/`). This proves Metro resolves `@dorkroom/*` source paths and NativeWind transforms run. (`dist/` is gitignored.)

- [ ] **Step 9: Commit**

```bash
git add apps/mobile
git commit -m "feat(mobile): metro monorepo + nativewind v4 config"
```

---

### Task 3: Synchronous `localStorage` polyfill (MMKV-backed)

**Files:**
- Create: `apps/mobile/src/polyfills/local-storage-shim.ts`
- Create: `apps/mobile/src/polyfills/local-storage-shim.test.ts`
- Create: `apps/mobile/src/polyfills/install-local-storage.ts`
- Create: `apps/mobile/vitest.config.ts`

**Interfaces:**
- Produces:
  - `interface KVBackend { getString(key: string): string | undefined; set(key: string, value: string): void; delete(key: string): void; getAllKeys(): string[] }`
  - `createWebStorageShim(backend: KVBackend): Storage` — a synchronous `Storage`-compatible object.
  - `installLocalStorage(): void` — installs an MMKV-backed shim as `globalThis.localStorage` (idempotent). Imported first in Task 5's root layout.

`KVBackend` matches the `react-native-mmkv` instance API (`getString`/`set`/`delete`/`getAllKeys`), so an MMKV instance is a valid backend with no adapter.

- [ ] **Step 1: Create `apps/mobile/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 2: Write the failing test**

Create `apps/mobile/src/polyfills/local-storage-shim.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { type KVBackend, createWebStorageShim } from './local-storage-shim';

function makeMemoryBackend(): KVBackend {
  const store = new Map<string, string>();
  return {
    getString: (k) => store.get(k),
    set: (k, v) => {
      store.set(k, v);
    },
    delete: (k) => {
      store.delete(k);
    },
    getAllKeys: () => [...store.keys()],
  };
}

describe('createWebStorageShim', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = createWebStorageShim(makeMemoryBackend());
  });

  it('returns null for a missing key', () => {
    expect(storage.getItem('missing')).toBeNull();
  });

  it('round-trips a value via setItem/getItem', () => {
    storage.setItem('k', 'v');
    expect(storage.getItem('k')).toBe('v');
  });

  it('overwrites an existing value', () => {
    storage.setItem('k', 'a');
    storage.setItem('k', 'b');
    expect(storage.getItem('k')).toBe('b');
  });

  it('removeItem deletes the key', () => {
    storage.setItem('k', 'v');
    storage.removeItem('k');
    expect(storage.getItem('k')).toBeNull();
  });

  it('reports length and clears all keys', () => {
    storage.setItem('a', '1');
    storage.setItem('b', '2');
    expect(storage.length).toBe(2);
    storage.clear();
    expect(storage.length).toBe(0);
    expect(storage.getItem('a')).toBeNull();
  });

  it('key(index) returns the key name at that index', () => {
    storage.setItem('only', '1');
    expect(storage.key(0)).toBe('only');
    expect(storage.key(5)).toBeNull();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd apps/mobile && bunx vitest run src/polyfills/local-storage-shim.test.ts`
Expected: FAIL — `Failed to resolve import './local-storage-shim'` / `createWebStorageShim is not a function`.

- [ ] **Step 4: Write the implementation**

Create `apps/mobile/src/polyfills/local-storage-shim.ts`:

```ts
/**
 * Minimal key-value backend, structurally satisfied by a react-native-mmkv
 * instance (getString / set / delete / getAllKeys).
 */
export interface KVBackend {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  delete(key: string): void;
  getAllKeys(): string[];
}

/**
 * Wrap a synchronous key-value backend in a DOM `Storage`-compatible object.
 * Shared hooks call `window.localStorage` (directly or via createStorageManager);
 * installing this as globalThis.localStorage lets them run unchanged on RN.
 */
export function createWebStorageShim(backend: KVBackend): Storage {
  const shim: Storage = {
    get length(): number {
      return backend.getAllKeys().length;
    },
    clear(): void {
      for (const key of backend.getAllKeys()) {
        backend.delete(key);
      }
    },
    getItem(key: string): string | null {
      return backend.getString(key) ?? null;
    },
    key(index: number): string | null {
      return backend.getAllKeys()[index] ?? null;
    },
    removeItem(key: string): void {
      backend.delete(key);
    },
    setItem(key: string, value: string): void {
      backend.set(key, String(value));
    },
  };
  return shim;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd apps/mobile && bunx vitest run src/polyfills/local-storage-shim.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Write the MMKV installer (not unit-tested — native module)**

Create `apps/mobile/src/polyfills/install-local-storage.ts`:

```ts
import { MMKV } from 'react-native-mmkv';
import { createWebStorageShim } from './local-storage-shim';

let installed = false;

/**
 * Install a synchronous MMKV-backed localStorage onto the global scope.
 * Idempotent. Must run before any shared hook reads/writes persisted state.
 */
export function installLocalStorage(): void {
  if (installed) {
    return;
  }
  const mmkv = new MMKV({ id: 'dorkroom-mobile' });
  const shim = createWebStorageShim(mmkv);
  Object.defineProperty(globalThis, 'localStorage', {
    value: shim,
    configurable: true,
    writable: true,
  });
  installed = true;
}
```

- [ ] **Step 7: Run the package test suite to confirm gate safety**

Run: `cd apps/mobile && bunx vitest run`
Expected: PASS. (`install-local-storage.ts` is excluded by the `src/**/*.test.ts` include and never imported by a test, so MMKV's native module is not loaded under vitest.)

- [ ] **Step 8: Commit**

```bash
git add apps/mobile/src/polyfills apps/mobile/vitest.config.ts
git commit -m "feat(mobile): synchronous MMKV-backed localStorage polyfill"
```

---

### Task 4: `.native.ts` override for `useWindowDimensions`

**Files:**
- Create: `packages/logic/src/hooks/use-window-dimensions.native.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: a React Native implementation of the existing
  `useWindowDimensions(): { width: number; height: number }` export. Metro
  prefers `.native.ts` over `.ts`; the web build (tsgo/Vite) ignores it. The
  border calculator's `useGeometryCalculations` (which imports this hook) then
  works natively.

> This is the ONE permitted addition to a shared package: a new sibling file.
> The existing `use-window-dimensions.ts` is NOT modified.

- [ ] **Step 1: Create the native override**

Create `packages/logic/src/hooks/use-window-dimensions.native.ts`:

```ts
import { useWindowDimensions as useRNWindowDimensions } from 'react-native';

/**
 * React Native implementation of useWindowDimensions, mirroring the web hook's
 * return shape. Metro resolves this `.native.ts` file on iOS/Android; the web
 * build uses `use-window-dimensions.ts`.
 *
 * @returns Object containing current window width and height
 */
export function useWindowDimensions(): { width: number; height: number } {
  const { width, height } = useRNWindowDimensions();
  return { width, height };
}
```

- [ ] **Step 2: Verify the web `@dorkroom/logic` build & tests are unaffected**

Run: `bun run test:unit "@dorkroom/logic" 2>&1 | tail -20`
Expected: PASS — the new `.native.ts` file is invisible to the web build/tests; no existing logic test changes.

- [ ] **Step 3: Verify Metro picks the native variant**

Run: `cd apps/mobile && bunx expo export --platform ios 2>&1 | tail -10`
Expected: export succeeds (a follow-up sanity check; the screen in Task 11 confirms behavior at runtime).

- [ ] **Step 4: Commit**

```bash
git add packages/logic/src/hooks/use-window-dimensions.native.ts
git commit -m "feat(logic): native useWindowDimensions override for RN"
```

---

### Task 5: Root providers — QueryClient, ThemeProvider, polyfill install

**Files:**
- Create: `apps/mobile/src/theme/tokens.ts`
- Create: `apps/mobile/src/providers/query-client.ts`
- Modify: `apps/mobile/app/_layout.tsx`

**Interfaces:**
- Consumes: `installLocalStorage()` (Task 3).
- Produces:
  - `tokens` — shared color/spacing object.
  - `queryClient: QueryClient` configured for mobile.
  - Root layout that installs the polyfill, provides React Query + Expo theme, and renders a `Stack`.

- [ ] **Step 1: Create design tokens**

Create `apps/mobile/src/theme/tokens.ts`:

```ts
/** Shared design tokens mirrored from the web palette. */
export const tokens = {
  color: {
    background: '#0b0b0c',
    surface: 'rgba(255,255,255,0.06)',
    text: '#f5f5f4',
    textMuted: '#a1a1aa',
    accent: '#e11d48',
    warning: '#f59e0b',
  },
  space: {
    sm: 8,
    md: 16,
    lg: 24,
  },
} as const;
```

- [ ] **Step 2: Create the QueryClient**

Create `apps/mobile/src/providers/query-client.ts`:

```ts
import { QueryClient } from '@tanstack/react-query';

/** QueryClient tuned for mobile: no window-focus refetch, mobile-friendly retry. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
      staleTime: 5 * 60 * 1000,
    },
  },
});
```

- [ ] **Step 3: Wire the root layout**

Replace `apps/mobile/app/_layout.tsx`:

```tsx
import '../global.css';
import { installLocalStorage } from '@/polyfills/install-local-storage';

installLocalStorage();

import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { queryClient } from '@/providers/query-client';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }} />
        <StatusBar style="auto" />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
```

> `installLocalStorage()` runs at module load, before any screen mounts a
> persistence-using hook. The import placement (after the side-effect call) is
> intentional and must stay first.

- [ ] **Step 4: Typecheck**

Run: `cd apps/mobile && bunx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/theme apps/mobile/src/providers apps/mobile/app/_layout.tsx
git commit -m "feat(mobile): root providers, theme tokens, polyfill install"
```

---

### Task 6: Liquid Glass tab navigation + screen routes

**Files:**
- Create: `apps/mobile/app/(tabs)/_layout.tsx`
- Create: `apps/mobile/app/(tabs)/border.tsx` (stub)
- Create: `apps/mobile/app/(tabs)/exposure.tsx` (stub)
- Create: `apps/mobile/app/(tabs)/reciprocity.tsx` (stub)
- Create: `apps/mobile/app/(tabs)/resize.tsx` (stub)
- Delete: `apps/mobile/app/index.tsx`

**Interfaces:**
- Consumes: root layout (Task 5).
- Produces: a `NativeTabs` Liquid Glass tab bar with four routes. Each stub is replaced by a real screen in Tasks 8–11.

- [ ] **Step 1: Create the tabs layout**

Create `apps/mobile/app/(tabs)/_layout.tsx`:

```tsx
import { NativeTabs } from 'expo-router/unstable-native-tabs';

export default function TabsLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="border">
        <NativeTabs.Trigger.Label>Border</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="exposure">
        <NativeTabs.Trigger.Label>Exposure</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="reciprocity">
        <NativeTabs.Trigger.Label>Reciprocity</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="resize">
        <NativeTabs.Trigger.Label>Resize</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
```

> If the installed Expo SDK exposes a different native-tabs import path, run
> `bunx expo customize` / check `expo-router/unstable-native-tabs` exports and
> adjust. The `ThemeProvider` from Task 5 already wraps these tabs (prevents the
> documented tab-switch flicker on iOS 26).

- [ ] **Step 2: Create four stub screens**

Create `apps/mobile/app/(tabs)/border.tsx`, `exposure.tsx`, `reciprocity.tsx`, `resize.tsx`, each with the matching title:

```tsx
// border.tsx
import { Text, View } from 'react-native';

export default function BorderScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-black">
      <Text className="text-white">Border (stub)</Text>
    </View>
  );
}
```

Repeat for `exposure.tsx` (`Exposure (stub)`), `reciprocity.tsx` (`Reciprocity (stub)`), `resize.tsx` (`Resize (stub)`) — change the component name and label text in each.

- [ ] **Step 3: Remove the temporary boot screen**

Run: `rm apps/mobile/app/index.tsx`
Expected: `(tabs)` group now provides the initial route.

- [ ] **Step 4: Typecheck**

Run: `cd apps/mobile && bunx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Boot the dev build on an iOS 26 simulator**

Run:
```bash
cd apps/mobile && bunx expo run:ios
```
Expected: the app builds a dev client, launches on an iOS 26 simulator, and shows a Liquid Glass tab bar with four tabs; each shows its stub text. (First run compiles native code — this is the dev build the rest of the plan uses.)

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/app
git commit -m "feat(mobile): liquid glass native tab navigation + screen routes"
```

---

### Task 7: Shared native UI primitives

**Files:**
- Create: `apps/mobile/src/components/glass-card.tsx`
- Create: `apps/mobile/src/components/screen.tsx`
- Create: `apps/mobile/src/components/labeled-text-field.tsx`
- Create: `apps/mobile/src/components/option-row.tsx`
- Create: `apps/mobile/src/components/result-row.tsx`

**Interfaces:**
- Produces (consumed by Tasks 8–11):
  - `GlassCard({ children, className? }): JSX.Element` — `GlassView` when available (`isGlassEffectAPIAvailable()`/`isLiquidGlassAvailable()`), else a NativeWind fallback card.
  - `Screen({ children }): JSX.Element` — scrollable safe-area page container.
  - `LabeledTextField({ label, value, onChangeText, keyboardType?, placeholder? }): JSX.Element`
  - `OptionRow<T>({ label, options, value, onChange }): JSX.Element` where `options: { label: string; value: T }[]`.
  - `ResultRow({ label, value }): JSX.Element`

- [ ] **Step 1: Create `GlassCard` (guarded Liquid Glass)**

Create `apps/mobile/src/components/glass-card.tsx`:

```tsx
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from 'expo-glass-effect';
import type { ReactNode } from 'react';
import { View } from 'react-native';

function glassAvailable(): boolean {
  try {
    // isGlassEffectAPIAvailable exists on SDK 55+; fall back to SDK 54 check.
    const apiCheck =
      typeof isGlassEffectAPIAvailable === 'function'
        ? isGlassEffectAPIAvailable()
        : true;
    return apiCheck && isLiquidGlassAvailable();
  } catch {
    return false;
  }
}

interface GlassCardProps {
  children: ReactNode;
  className?: string;
}

/** A Liquid Glass card on iOS 26; a translucent NativeWind card elsewhere. */
export function GlassCard({ children, className }: GlassCardProps) {
  if (glassAvailable()) {
    return (
      <GlassView
        glassEffectStyle="regular"
        style={{ borderRadius: 20, overflow: 'hidden' }}
      >
        <View className={`p-5 ${className ?? ''}`}>{children}</View>
      </GlassView>
    );
  }
  return (
    <View className={`rounded-2xl bg-white/10 p-5 ${className ?? ''}`}>
      {children}
    </View>
  );
}
```

- [ ] **Step 2: Create `Screen`**

Create `apps/mobile/src/components/screen.tsx`:

```tsx
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function Screen({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-black">
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingTop: insets.top + 16,
          gap: 16,
        }}
      >
        {children}
      </ScrollView>
    </View>
  );
}
```

- [ ] **Step 3: Create `LabeledTextField`**

Create `apps/mobile/src/components/labeled-text-field.tsx`:

```tsx
import { Text, TextInput, View } from 'react-native';

interface LabeledTextFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  placeholder?: string;
}

export function LabeledTextField({
  label,
  value,
  onChangeText,
  keyboardType = 'default',
  placeholder,
}: LabeledTextFieldProps) {
  return (
    <View className="gap-1">
      <Text className="text-sm text-white/60">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor="#71717a"
        className="rounded-xl bg-white/10 px-4 py-3 text-base text-white"
      />
    </View>
  );
}
```

- [ ] **Step 4: Create `OptionRow`**

Create `apps/mobile/src/components/option-row.tsx`:

```tsx
import { Pressable, ScrollView, Text, View } from 'react-native';

interface OptionRowProps<T extends string | number> {
  label: string;
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}

export function OptionRow<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: OptionRowProps<T>) {
  return (
    <View className="gap-2">
      <Text className="text-sm text-white/60">{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-2">
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <Pressable
                key={String(option.value)}
                onPress={() => onChange(option.value)}
                className={`rounded-full px-4 py-2 ${
                  selected ? 'bg-rose-600' : 'bg-white/10'
                }`}
              >
                <Text
                  className={selected ? 'text-white' : 'text-white/70'}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
```

- [ ] **Step 5: Create `ResultRow`**

Create `apps/mobile/src/components/result-row.tsx`:

```tsx
import { Text, View } from 'react-native';

export function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between py-1.5">
      <Text className="text-white/60">{label}</Text>
      <Text className="text-base font-semibold text-white">{value}</Text>
    </View>
  );
}
```

- [ ] **Step 6: Typecheck**

Run: `cd apps/mobile && bunx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/components
git commit -m "feat(mobile): shared native UI primitives (glass card, fields, rows)"
```

---

### Task 8: Exposure calculator screen

**Files:**
- Modify: `apps/mobile/app/(tabs)/exposure.tsx`

**Interfaces:**
- Consumes: `useExposureCalculator` from `@dorkroom/logic` — returns
  `{ originalTime: string; setOriginalTime(v: string): void; stops: string; setStops(v: string): void; adjustStops(n: number): void; newTime: string; calculation: { newTimeValue: number; addedTime: number; percentageIncrease: number } | null; formatTime(seconds: number): string }`.
  Plus `Screen`, `GlassCard`, `LabeledTextField`, `ResultRow` (Task 7).

- [ ] **Step 1: Implement the screen**

Replace `apps/mobile/app/(tabs)/exposure.tsx`:

```tsx
import { useExposureCalculator } from '@dorkroom/logic';
import { Pressable, Text, View } from 'react-native';
import { GlassCard } from '@/components/glass-card';
import { LabeledTextField } from '@/components/labeled-text-field';
import { ResultRow } from '@/components/result-row';
import { Screen } from '@/components/screen';

export default function ExposureScreen() {
  const {
    originalTime,
    setOriginalTime,
    stops,
    setStops,
    adjustStops,
    calculation,
    formatTime,
  } = useExposureCalculator();

  return (
    <Screen>
      <Text className="text-2xl font-bold text-white">Exposure</Text>

      <GlassCard className="gap-4">
        <LabeledTextField
          label="Original time (s)"
          value={originalTime}
          onChangeText={setOriginalTime}
          keyboardType="decimal-pad"
        />
        <LabeledTextField
          label="Stops"
          value={stops}
          onChangeText={setStops}
          keyboardType="default"
        />
        <View className="flex-row gap-2">
          <Pressable
            onPress={() => adjustStops(-1 / 3)}
            className="flex-1 items-center rounded-xl bg-white/10 py-3"
          >
            <Text className="text-white">- ⅓</Text>
          </Pressable>
          <Pressable
            onPress={() => adjustStops(1 / 3)}
            className="flex-1 items-center rounded-xl bg-white/10 py-3"
          >
            <Text className="text-white">+ ⅓</Text>
          </Pressable>
        </View>
      </GlassCard>

      <GlassCard>
        {calculation ? (
          <>
            <ResultRow
              label="New time"
              value={formatTime(calculation.newTimeValue)}
            />
            <ResultRow
              label="Added time"
              value={formatTime(Math.abs(calculation.addedTime))}
            />
            <ResultRow
              label="Change"
              value={`${calculation.percentageIncrease.toFixed(0)}%`}
            />
          </>
        ) : (
          <Text className="text-white/60">Enter a valid time and stops.</Text>
        )}
      </GlassCard>
    </Screen>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/mobile && bunx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Verify on simulator**

Reload the running dev build (Task 6). On the Exposure tab: set Original time `10`, Stops `2` → New time shows `40s` (or `40`). Confirm Change reads `300%`.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/(tabs)/exposure.tsx
git commit -m "feat(mobile): exposure calculator screen"
```

---

### Task 9: Reciprocity calculator screen

**Files:**
- Modify: `apps/mobile/app/(tabs)/reciprocity.tsx`

**Interfaces:**
- Consumes: `useReciprocityCalculator` from `@dorkroom/logic` — returns
  `{ filmType: string; setFilmType(v: string): void; meteredTime: string; setMeteredTime(v: string): void; formattedTime: string | null; timeFormatError: string | null; calculation: { originalTime: number; adjustedTime: number; factor: number; filmName: string; percentageIncrease: number } | null; formatTime(seconds: number): string; filmTypes: { label: string; value: string; factor?: number }[] }`.
  Plus `Screen`, `GlassCard`, `LabeledTextField`, `OptionRow`, `ResultRow`.

- [ ] **Step 1: Implement the screen**

Replace `apps/mobile/app/(tabs)/reciprocity.tsx`:

```tsx
import { useReciprocityCalculator } from '@dorkroom/logic';
import { Text } from 'react-native';
import { GlassCard } from '@/components/glass-card';
import { LabeledTextField } from '@/components/labeled-text-field';
import { OptionRow } from '@/components/option-row';
import { ResultRow } from '@/components/result-row';
import { Screen } from '@/components/screen';

export default function ReciprocityScreen() {
  const {
    filmType,
    setFilmType,
    meteredTime,
    setMeteredTime,
    timeFormatError,
    calculation,
    formatTime,
    filmTypes,
  } = useReciprocityCalculator();

  const filmOptions = filmTypes.map((film) => ({
    label: film.label,
    value: film.value,
  }));

  return (
    <Screen>
      <Text className="text-2xl font-bold text-white">Reciprocity</Text>

      <GlassCard className="gap-4">
        <OptionRow
          label="Film"
          options={filmOptions}
          value={filmType}
          onChange={setFilmType}
        />
        <LabeledTextField
          label="Metered time"
          value={meteredTime}
          onChangeText={setMeteredTime}
          placeholder="e.g. 30s, 1m30s"
        />
        {timeFormatError ? (
          <Text className="text-amber-500">{timeFormatError}</Text>
        ) : null}
      </GlassCard>

      <GlassCard>
        {calculation ? (
          <>
            <ResultRow
              label="Corrected time"
              value={formatTime(calculation.adjustedTime)}
            />
            <ResultRow
              label="Metered time"
              value={formatTime(calculation.originalTime)}
            />
            <ResultRow
              label="Factor"
              value={calculation.factor.toFixed(2)}
            />
            <ResultRow
              label="Increase"
              value={`${calculation.percentageIncrease.toFixed(0)}%`}
            />
          </>
        ) : (
          <Text className="text-white/60">Enter a valid metered time.</Text>
        )}
      </GlassCard>
    </Screen>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/mobile && bunx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Verify on simulator**

Reciprocity tab: pick a film, enter `30s` → Corrected time updates to a value larger than 30s, Factor matches the film, no format error. Enter `abc` → format-error text appears.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/(tabs)/reciprocity.tsx
git commit -m "feat(mobile): reciprocity calculator screen"
```

---

### Task 10: Resize calculator screen

**Files:**
- Modify: `apps/mobile/app/(tabs)/resize.tsx`

**Interfaces:**
- Consumes: `useResizeCalculator` from `@dorkroom/logic` (return type
  `UseResizeCalculatorReturn`) — fields used here:
  `{ isEnlargerHeightMode: boolean; setIsEnlargerHeightMode(v: boolean): void; originalWidth/originalLength/newWidth/newLength/originalTime: string; setOriginalWidth/setOriginalLength/setNewWidth/setNewLength/setOriginalTime(v: string): void; newTime: string; stopsDifference: string; isAspectRatioMatched: boolean }`.
  Plus `Screen`, `GlassCard`, `LabeledTextField`, `ResultRow`, plus a `Switch`.

- [ ] **Step 1: Implement the screen**

Replace `apps/mobile/app/(tabs)/resize.tsx`:

```tsx
import { useResizeCalculator } from '@dorkroom/logic';
import { Switch, Text, View } from 'react-native';
import { GlassCard } from '@/components/glass-card';
import { LabeledTextField } from '@/components/labeled-text-field';
import { ResultRow } from '@/components/result-row';
import { Screen } from '@/components/screen';

export default function ResizeScreen() {
  const {
    isEnlargerHeightMode,
    setIsEnlargerHeightMode,
    originalWidth,
    setOriginalWidth,
    originalLength,
    setOriginalLength,
    newWidth,
    setNewWidth,
    newLength,
    setNewLength,
    originalTime,
    setOriginalTime,
    newTime,
    stopsDifference,
    isAspectRatioMatched,
  } = useResizeCalculator();

  return (
    <Screen>
      <Text className="text-2xl font-bold text-white">Resize</Text>

      <GlassCard className="gap-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-white/80">Enlarger height mode</Text>
          <Switch
            value={isEnlargerHeightMode}
            onValueChange={setIsEnlargerHeightMode}
          />
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <LabeledTextField
              label="Orig. width"
              value={originalWidth}
              onChangeText={setOriginalWidth}
              keyboardType="decimal-pad"
            />
          </View>
          <View className="flex-1">
            <LabeledTextField
              label="Orig. length"
              value={originalLength}
              onChangeText={setOriginalLength}
              keyboardType="decimal-pad"
            />
          </View>
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <LabeledTextField
              label="New width"
              value={newWidth}
              onChangeText={setNewWidth}
              keyboardType="decimal-pad"
            />
          </View>
          <View className="flex-1">
            <LabeledTextField
              label="New length"
              value={newLength}
              onChangeText={setNewLength}
              keyboardType="decimal-pad"
            />
          </View>
        </View>
        <LabeledTextField
          label="Original time (s)"
          value={originalTime}
          onChangeText={setOriginalTime}
          keyboardType="decimal-pad"
        />
      </GlassCard>

      <GlassCard>
        {newTime ? (
          <>
            <ResultRow label="New time" value={`${newTime}s`} />
            <ResultRow label="Stops difference" value={stopsDifference} />
            {!isAspectRatioMatched && !isEnlargerHeightMode ? (
              <Text className="mt-2 text-amber-500">
                Aspect ratios do not match.
              </Text>
            ) : null}
          </>
        ) : (
          <Text className="text-white/60">Enter dimensions and a time.</Text>
        )}
      </GlassCard>
    </Screen>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/mobile && bunx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Verify on simulator**

Resize tab: with defaults, a New time and Stops difference appear. Set new dimensions to a mismatched ratio (e.g. orig `4x5`, new `8x8`) → the aspect-ratio warning shows. Toggle Enlarger height mode → warning hides.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/(tabs)/resize.tsx
git commit -m "feat(mobile): resize calculator screen"
```

---

### Task 11: Border calculator screen (validates window-dimensions seam + persistence)

**Files:**
- Modify: `apps/mobile/app/(tabs)/border.tsx`

**Interfaces:**
- Consumes:
  - `useBorderCalculator` from `@dorkroom/logic` (the modular hook) — fields used:
    `{ aspectRatio: string; setAspectRatio(v: string): void; paperSize: string; setPaperSize(v: string): void; minBorder: number; setMinBorderSlider(v: number): void; calculation: { leftBorder; rightBorder; topBorder; bottomBorder; printWidth; printHeight: number } }`.
  - `ASPECT_RATIOS` and `PAPER_SIZES` from `@dorkroom/logic` — each is a
    `readonly { label: string; value: string }[]`.
  - `Screen`, `GlassCard`, `OptionRow`, `ResultRow`.
- Note: `useBorderCalculator` transitively calls `useWindowDimensions`, which
  resolves to the `.native.ts` override from Task 4. A successful render here
  confirms that seam.

- [ ] **Step 1: Implement the screen**

Replace `apps/mobile/app/(tabs)/border.tsx`:

```tsx
import {
  ASPECT_RATIOS,
  PAPER_SIZES,
  useBorderCalculator,
} from '@dorkroom/logic';
import { Pressable, Text, View } from 'react-native';
import { GlassCard } from '@/components/glass-card';
import { OptionRow } from '@/components/option-row';
import { ResultRow } from '@/components/result-row';
import { Screen } from '@/components/screen';

const MIN_BORDER_STEPS = [0.25, 0.5, 0.75, 1, 1.5];

export default function BorderScreen() {
  const {
    aspectRatio,
    setAspectRatio,
    paperSize,
    setPaperSize,
    minBorder,
    setMinBorderSlider,
    calculation,
  } = useBorderCalculator();

  const aspectOptions = ASPECT_RATIOS.map((r) => ({
    label: r.label,
    value: r.value,
  }));
  const paperOptions = PAPER_SIZES.map((p) => ({
    label: p.label,
    value: p.value,
  }));

  return (
    <Screen>
      <Text className="text-2xl font-bold text-white">Border</Text>

      <GlassCard className="gap-4">
        <OptionRow
          label="Aspect ratio"
          options={aspectOptions}
          value={aspectRatio}
          onChange={setAspectRatio}
        />
        <OptionRow
          label="Paper size"
          options={paperOptions}
          value={paperSize}
          onChange={setPaperSize}
        />
        <View className="gap-2">
          <Text className="text-sm text-white/60">
            Min border: {minBorder}"
          </Text>
          <View className="flex-row gap-2">
            {MIN_BORDER_STEPS.map((step) => (
              <Pressable
                key={step}
                onPress={() => setMinBorderSlider(step)}
                className={`rounded-full px-3 py-2 ${
                  minBorder === step ? 'bg-rose-600' : 'bg-white/10'
                }`}
              >
                <Text className="text-white/80">{step}"</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </GlassCard>

      <GlassCard>
        <ResultRow
          label="Print size"
          value={`${calculation.printWidth.toFixed(2)}" × ${calculation.printHeight.toFixed(2)}"`}
        />
        <ResultRow
          label="Left / Right border"
          value={`${calculation.leftBorder.toFixed(2)}" / ${calculation.rightBorder.toFixed(2)}"`}
        />
        <ResultRow
          label="Top / Bottom border"
          value={`${calculation.topBorder.toFixed(2)}" / ${calculation.bottomBorder.toFixed(2)}"`}
        />
      </GlassCard>
    </Screen>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/mobile && bunx tsc --noEmit`
Expected: PASS. If `ASPECT_RATIOS`/`PAPER_SIZES` items expose a different value key, adjust the `.map` — confirm via `packages/logic/src/constants/border-calculator.ts`.

- [ ] **Step 3: Verify on simulator (the key seam check)**

Border tab renders without a `window is not defined` / `innerWidth` crash (proves the `.native.ts` override is resolved). Select aspect `2:3`, paper `8x10`, min border `0.5"` → print size and borders compute. Change paper size → results update.

- [ ] **Step 4: Verify MMKV persistence**

The border calculator persists state via `window.localStorage` (now MMKV). Change a value, fully reload the dev build (`r` in the Metro terminal or relaunch). Expected: the last-used border settings are restored — confirming the polyfill writes through to MMKV.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/(tabs)/border.tsx
git commit -m "feat(mobile): border calculator screen + verify RN seams"
```

---

### Task 12: Final verification, docs, and CLAUDE.md note

**Files:**
- Create: `apps/mobile/README.md`
- Modify: `CHANGELOG.md`
- Modify: `CLAUDE.md` (add `apps/mobile` to the structure list)

**Interfaces:**
- Consumes: the complete app from Tasks 1–11.
- Produces: passing gate, documentation.

- [ ] **Step 1: Run the full gate**

Run: `bun run test 2>&1 | tail -40`
Expected: PASS for all `@dorkroom/*` packages including `@dorkroom/mobile` (`lint`, `test` (shim tests + passWithNoTests), `build` (no-op), `typecheck`). `@dorkroom/logic` tests unchanged and green.

- [ ] **Step 2: Run formatting**

Run: `bun run format`
Expected: Biome formats `apps/mobile`; re-run `bun run test` if anything changed.

- [ ] **Step 3: Write `apps/mobile/README.md`**

```markdown
# @dorkroom/mobile

iOS app for Dorkroom (Expo + Expo Router), reusing `@dorkroom/logic` and
`@dorkroom/api` from source.

## Requirements

- A **custom dev build** — `react-native-mmkv` and `expo-glass-effect` are
  native modules, so Expo Go does NOT work.
- iOS 26 simulator or device (Liquid Glass).

## Run

```bash
cd apps/mobile
bunx expo run:ios      # first run builds the dev client
bunx expo start --dev-client
```

## How code is shared

- Metro consumes `@dorkroom/*` from `src` (see `metro.config.js`).
- `src/polyfills/install-local-storage.ts` installs a synchronous MMKV-backed
  `localStorage`, so persistence-using shared hooks run unchanged.
- `packages/logic/src/hooks/use-window-dimensions.native.ts` overrides the web
  resize hook for RN.

## Out of scope (v1)

Development-recipes DB, custom recipes, favorites, in-app sharing/deep links,
border image overlay.
```

- [ ] **Step 4: Add a CHANGELOG entry**

Add under a new dated heading in `CHANGELOG.md` (Keep a Changelog format):

```markdown
## [2026.06.21]

### Added
- `@dorkroom/mobile`: iOS app scaffold (Expo Router, NativeWind v4, iOS 26
  Liquid Glass) with native border, exposure, reciprocity, and resize
  calculators reusing `@dorkroom/logic` and `@dorkroom/api`.
```

- [ ] **Step 5: Note the new app in CLAUDE.md**

In `CLAUDE.md`, under **Structure**, add the line:

```markdown
- `apps/mobile/` - iOS app (Expo, React Native) reusing @dorkroom/logic and @dorkroom/api
```

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/README.md CHANGELOG.md CLAUDE.md
git commit -m "docs(mobile): readme, changelog, and CLAUDE.md note"
```

---

## Self-Review notes

- **Spec coverage:** scaffold (T1–2), MMKV storage seam (T3, T11.4), window-dimensions seam (T4, T11.3), Query provider (T5), Liquid Glass nav (T6) + guarded `GlassView` (T7), four calculators (T8–11), gate safety (T1.8, T12.1), iOS 26 target (T1.2). Deferred items (recipes/sharing/image overlay) are explicitly out of scope and untouched.
- **No logic-package edits:** only a new `.native.ts` file is added (T4); the web build/tests are re-verified green (T4.2).
- **Type consistency:** hook return field names in T8–11 are copied from the actual hook source (`newTimeValue`, `adjustedTime`, `stopsDifference`, `setMinBorderSlider`, modular `useBorderCalculator.calculation.*`).
- **Open risk to watch during execution:** exact `NativeTabs` import path and `expo-glass-effect` API names can vary by installed SDK — T6.1 and T7.1 call this out with a verification fallback.
```
