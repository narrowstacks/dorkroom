// Keeps the on-device Spotlight index in step with the film log and the recent
// recipes. What is indexed, and what never is, is decided in
// `spotlight-index.ts`; the runtime and the native calls are in `spotlight.ts`.
// This file wires them to MMKV, the film log and the app's build.
//
// - Rolls: shortly after start (never during bundle load) and when the film
//   log's rolls, cameras or lenses change (MMKV value listeners, coalesced like
//   the roll widget's so a burst of writes is read once). No rolls clears the
//   whole `rolls` domain, unless nothing is recorded.
// - Recipes: the recently opened ones the catalog can name, sent by
//   `SpotlightEffects`, which loads the catalog only when the record says a
//   recent recipe needs (re)indexing (`recipesNeedCatalog`).
//
// Only what changed is sent: the ids and content hashes last accepted are kept
// in MMKV (`dorkroom-spotlight`), one record per domain, with the native app
// version and build it was made under; a new build clears the domain once and
// re-sends everything (the index may have been wiped). First imported by
// `SpotlightEffects`. Native, so verify in the Simulator or on a device.
import Constants from 'expo-constants';
import { createMMKV } from 'react-native-mmkv';
import {
  getCameras,
  getLenses,
  getRolls,
  KEYS as FILM_LOG_KEYS,
  storage as filmLogStorage,
} from '@/lib/film-log-storage';
import { createCoalescer, platformScheduler } from '@/lib/widgets/widget-sync';
import {
  appBuildIdentity,
  createSpotlightRuntime,
  currentRecord,
  type IndexedStore,
  spotlight,
  type SpotlightRuntime,
} from './spotlight';
import {
  recipesNeedIndexing,
  rollSpotlightItems,
  type SpotlightDomain,
  type SpotlightItem,
} from './spotlight-index';

/** The film log's writes come in bursts (a form saves several keys). */
const ROLLS_DEBOUNCE_MS = 300;

const storage = createMMKV({ id: 'dorkroom-spotlight' });

const storeFor = (domain: SpotlightDomain): IndexedStore => ({
  read: () => storage.getString(`indexed.${domain}`),
  write: (raw) => storage.set(`indexed.${domain}`, raw),
  readBuild: () => storage.getString(`build.${domain}`),
  writeBuild: (build) => storage.set(`build.${domain}`, build),
});

/** The native binary: `CFBundleShortVersionString` from the config, `CFBundleVersion` from the binary. */
const BUILD = appBuildIdentity(
  Constants.expoConfig?.version,
  Constants.platform?.ios?.buildNumber
);

function createRuntime(): SpotlightRuntime {
  const scheduler = platformScheduler();
  const rollKeys: readonly string[] = [
    FILM_LOG_KEYS.rolls,
    FILM_LOG_KEYS.cameras,
    FILM_LOG_KEYS.lenses,
  ];
  return createSpotlightRuntime({
    spotlight,
    storeFor,
    build: BUILD,
    rollItems: () => rollSpotlightItems(getRolls(), getCameras(), getLenses()),
    onRollsChanged: (listener) => {
      const soon = createCoalescer(listener, ROLLS_DEBOUNCE_MS, scheduler);
      filmLogStorage.addOnValueChangedListener((key) => {
        if (rollKeys.includes(key)) soon();
      });
    },
    scheduler,
    now: Date.now,
  });
}

declare global {
  // Fast Refresh re-evaluates this module; a second runtime would double the
  // storage listener. Development only.
  var __dorkroomSpotlight: SpotlightRuntime | undefined;
}

let cached: SpotlightRuntime | undefined;

function getRuntime(): SpotlightRuntime {
  if (!__DEV__) return (cached ??= createRuntime());
  return (globalThis.__dorkroomSpotlight ??= createRuntime());
}

const runtime = getRuntime();

/**
 * Brings the `recipes` domain to exactly these items (the recent recipes the
 * catalog can name). Only changes are sent.
 */
export const syncRecipeSpotlight = (items: readonly SpotlightItem[]): void =>
  runtime.syncRecipes(items);

/** Removes indexed recipes whose path is not in `keep`, without the catalog. */
export const pruneRecipeSpotlight = (keep: ReadonlySet<string>): void =>
  runtime.pruneRecipes(keep);

/** Whether indexing these recent recipes needs the catalog loaded now. */
export const recipesNeedCatalog = (recipeIds: readonly string[]): boolean =>
  recipesNeedIndexing(
    recipeIds,
    currentRecord(storeFor('recipes'), BUILD),
    Date.now()
  );
