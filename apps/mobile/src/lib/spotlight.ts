// The on-device Spotlight index, through the local Expo module in
// `modules/dorkroom-shared` (`DorkroomSpotlight`). A dev client built before
// that module existed, or vitest, has no native module: every call is then a
// no-op that reports failure, with one warning in development, never a crash.
// A failed call leaves the record of what was indexed unchanged, so the next
// sync (or the first one after a rebuild) sends it again.
import {
  type DorkroomSpotlightModule,
  loadDorkroomSpotlight,
} from '../../modules/dorkroom-shared';
import {
  type IndexedRecord,
  parseIndexedRecord,
  planSpotlightSync,
  recordAfterSync,
  type SpotlightDomain,
  type SpotlightItem,
} from './spotlight-index';
import type { Scheduler } from './widgets/widget-sync';

export interface Spotlight {
  /** Each resolves true when the index accepted the change. */
  index: (items: readonly SpotlightItem[]) => Promise<boolean>;
  remove: (ids: readonly string[]) => Promise<boolean>;
  removeDomain: (domain: SpotlightDomain) => Promise<boolean>;
  removeAll: () => Promise<boolean>;
}

export const SPOTLIGHT_UNAVAILABLE =
  'Spotlight indexing unavailable: this dev client lacks the DorkroomSpotlight ' +
  'module (rebuild it after a prebuild), or Core Spotlight refused a change. ' +
  'Rolls and recipes will not show in the Home Screen search.';

/**
 * Wraps the native module so that a missing module or a rejected call
 * resolves false. `warn` is called once, on the first failure.
 */
export function createSpotlight(
  native: DorkroomSpotlightModule | null,
  warn: (message: string) => void
): Spotlight {
  let warned = false;
  const fail = () => {
    if (!warned) {
      warned = true;
      warn(SPOTLIGHT_UNAVAILABLE);
    }
    return false;
  };
  async function attempt(
    call: (module: DorkroomSpotlightModule) => Promise<void>
  ): Promise<boolean> {
    if (native === null) return fail();
    try {
      await call(native);
      return true;
    } catch {
      return fail();
    }
  }
  return {
    index: (items) =>
      attempt((m) =>
        m.indexSpotlightItems(
          items.map((item) => ({
            id: item.id,
            domain: item.domain,
            title: item.title,
            description: item.description,
            keywords: item.keywords,
          }))
        )
      ),
    remove: (ids) => attempt((m) => m.removeSpotlightItems([...ids])),
    removeDomain: (domain) => attempt((m) => m.removeSpotlightDomain(domain)),
    removeAll: () => attempt((m) => m.removeAllSpotlightItems()),
  };
}

/**
 * Where one domain's record of indexed items is kept, and the app build that
 * record was made under.
 */
export interface IndexedStore {
  read: () => string | undefined;
  write: (raw: string) => void;
  readBuild: () => string | undefined;
  writeBuild: (build: string) => void;
}

interface DomainTarget {
  domain: SpotlightDomain;
  store: IndexedStore;
  spotlight: Spotlight;
  /** This app's native version and build (`appBuildIdentity`). */
  build: string;
}

export interface DomainSyncInput extends DomainTarget {
  desired: readonly SpotlightItem[];
  now: number;
  /**
   * With nothing desired, clear the whole domain (catching anything the record
   * lost track of) rather than removing the recorded ids one by one.
   */
  clearWhenEmpty: boolean;
}

/** The record to plan from: empty when it was made under another build. */
export function currentRecord(
  store: IndexedStore,
  build: string
): IndexedRecord {
  return store.readBuild() === build ? parseIndexedRecord(store.read()) : {};
}

/**
 * Under a new build the index may have been wiped (a restore, a reinstall)
 * while the record says otherwise, so the domain is cleared and the record
 * forgotten once; the next plan then sends everything. Resolves to the record
 * to plan from, or null when the clear failed (try again next sync).
 */
async function recordForBuild({
  domain,
  store,
  spotlight,
  build,
}: DomainTarget): Promise<IndexedRecord | null> {
  if (store.readBuild() === build) return parseIndexedRecord(store.read());
  if (!(await spotlight.removeDomain(domain))) return null;
  store.write('{}');
  store.writeBuild(build);
  return {};
}

/**
 * Brings one domain of the index to `desired`, sending only what changed, and
 * records what the index accepted. Resolves to the record written.
 */
export async function syncSpotlightDomain(
  input: DomainSyncInput
): Promise<IndexedRecord> {
  const { domain, desired, store, spotlight, now, clearWhenEmpty } = input;
  const indexed = await recordForBuild(input);
  if (indexed === null) return parseIndexedRecord(store.read());
  if (desired.length === 0 && clearWhenEmpty) {
    // Nothing recorded: nothing of ours to clear, so no native call.
    if (Object.keys(indexed).length === 0) return indexed;
    if (await spotlight.removeDomain(domain)) {
      store.write('{}');
      return {};
    }
    return indexed;
  }
  const { toIndex, toRemove } = planSpotlightSync({ desired, indexed, now });
  if (toIndex.length === 0 && toRemove.length === 0) return indexed;
  const removed = toRemove.length > 0 && (await spotlight.remove(toRemove));
  const sent = toIndex.length > 0 && (await spotlight.index(toIndex));
  const next = recordAfterSync(
    indexed,
    { indexedItems: sent ? toIndex : [], removedIds: removed ? toRemove : [] },
    now
  );
  store.write(JSON.stringify(next));
  return next;
}

/**
 * Removes the recorded items whose id is not in `keep`, without the items
 * themselves: how recipes that left the recent list are dropped when the
 * catalog was not loaded. Only under the current build (a new build needs a
 * full sync).
 */
export async function pruneSpotlightDomain({
  keep,
  store,
  spotlight,
  build,
}: DomainTarget & { keep: ReadonlySet<string> }): Promise<void> {
  if (store.readBuild() !== build) return;
  const indexed = parseIndexedRecord(store.read());
  const toRemove = Object.keys(indexed).filter((id) => !keep.has(id));
  if (toRemove.length === 0) return;
  if (!(await spotlight.remove(toRemove))) return;
  store.write(
    JSON.stringify(
      recordAfterSync(indexed, { indexedItems: [], removedIds: toRemove }, 0)
    )
  );
}

/** One string for the native app version and build: a change means a new binary. */
export function appBuildIdentity(
  version: string | null | undefined,
  buildNumber: string | null | undefined
): string {
  return `${version ?? '?'}+${buildNumber ?? '?'}`;
}

/**
 * Runs tasks one after another, so two syncs of one domain never interleave
 * (each reads the record the last one wrote). A failed task does not stop the
 * next.
 */
export function createSerialQueue(): (task: () => Promise<void>) => void {
  let tail: Promise<void> = Promise.resolve();
  return (task) => {
    tail = tail.then(task).catch(() => undefined);
  };
}

/** The first roll sync waits this long after the bundle loads. */
export const STARTUP_SYNC_DELAY_MS = 3000;

export interface SpotlightRuntimeDeps {
  spotlight: Spotlight;
  storeFor: (domain: SpotlightDomain) => IndexedStore;
  build: string;
  /** Every roll as an item, read when a sync runs. */
  rollItems: () => SpotlightItem[];
  /** Calls `listener` (already coalesced) when the film log changes. */
  onRollsChanged: (listener: () => void) => void;
  scheduler: Scheduler;
  now: () => number;
}

export interface SpotlightRuntime {
  syncRecipes: (items: readonly SpotlightItem[]) => void;
  pruneRecipes: (keep: ReadonlySet<string>) => void;
}

/**
 * The sync runtime: rolls on film log changes and once shortly after start,
 * recipes when `SpotlightEffects` sends them. Nothing reaches Spotlight before
 * `STARTUP_SYNC_DELAY_MS` has passed: work asked for earlier waits. Each
 * domain's work runs through its own queue, in the order asked for.
 */
export function createSpotlightRuntime(
  deps: SpotlightRuntimeDeps
): SpotlightRuntime {
  const queues = {
    rolls: createSerialQueue(),
    recipes: createSerialQueue(),
  } satisfies Record<SpotlightDomain, ReturnType<typeof createSerialQueue>>;
  const target = (domain: SpotlightDomain) => ({
    domain,
    store: deps.storeFor(domain),
    spotlight: deps.spotlight,
    build: deps.build,
  });

  let start = () => {};
  const started = new Promise<void>((resolve) => {
    start = resolve;
  });
  const syncRolls = () =>
    queues.rolls(async () => {
      await started;
      await syncSpotlightDomain({
        ...target('rolls'),
        desired: deps.rollItems(),
        now: deps.now(),
        // An empty film log clears the domain, so nothing of a deleted roll
        // can linger even if the record lost track of it.
        clearWhenEmpty: true,
      });
    });
  deps.onRollsChanged(syncRolls);
  deps.scheduler.setTimeout(() => {
    start();
    syncRolls();
  }, STARTUP_SYNC_DELAY_MS);

  return {
    syncRecipes: (items) =>
      queues.recipes(async () => {
        await started;
        await syncSpotlightDomain({
          ...target('recipes'),
          desired: items,
          now: deps.now(),
          clearWhenEmpty: true,
        });
      }),
    pruneRecipes: (keep) =>
      queues.recipes(async () => {
        await started;
        await pruneSpotlightDomain({ ...target('recipes'), keep });
      }),
  };
}

/** `__DEV__`, or false where it is not defined at all (vitest). */
function isDevelopment(): boolean {
  try {
    return __DEV__;
  } catch {
    return false;
  }
}

export const spotlight: Spotlight = createSpotlight(
  loadDorkroomSpotlight(),
  (message) => {
    if (isDevelopment()) console.warn(message);
  }
);
