// The JS face of the local Expo module in ./ios. Import it through
// `src/lib/shared-defaults.ts`, which falls back to a no-op when the native
// module is missing (a dev client built before this module, or vitest).
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
