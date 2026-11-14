// The JS face of the local Expo modules in ./ios. Import them through
// `src/lib/shared-defaults.ts` and `src/lib/spotlight.ts`, which fall back to a
// no-op when the native module is missing (a dev client built before it, or
// vitest).
import { requireOptionalNativeModule } from 'expo';

export interface DorkroomSharedModule {
  /** The App Group value, or null when it was never written. Throws when the group is unavailable. */
  getSharedBool(key: string): boolean | null;
  setSharedBool(key: string, value: boolean): void;
  getSharedNumber(key: string): number | null;
  setSharedNumber(key: string, value: number): void;
  /** Reloads one Control Center control kind, or every control when omitted. */
  reloadControls(kind?: string): void;
}

/** The native module, or null when this build does not include it. */
export function loadDorkroomShared(): DorkroomSharedModule | null {
  return requireOptionalNativeModule<DorkroomSharedModule>('DorkroomShared');
}

/** One Core Spotlight item. `id` is the app path it opens. */
export interface NativeSpotlightItem {
  id: string;
  domain: string;
  title: string;
  description?: string;
  keywords?: string[];
}

export interface DorkroomSpotlightModule {
  /** Indexes (or replaces) items in the on-device Spotlight index. */
  indexSpotlightItems(items: NativeSpotlightItem[]): Promise<void>;
  removeSpotlightItems(ids: string[]): Promise<void>;
  removeSpotlightDomain(domain: string): Promise<void>;
  removeAllSpotlightItems(): Promise<void>;
}

/**
 * The Spotlight module, or null when this build does not include it. A
 * separate native module from `DorkroomShared`, so a dev client built before
 * it existed reports it missing instead of lacking its functions.
 */
export function loadDorkroomSpotlight(): DorkroomSpotlightModule | null {
  return requireOptionalNativeModule<DorkroomSpotlightModule>(
    'DorkroomSpotlight'
  );
}
