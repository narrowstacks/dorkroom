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
