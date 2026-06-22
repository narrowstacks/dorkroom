# iOS Light Meter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reflected/spot light meter to the iOS app that reads scene EV from the device camera and solves for camera settings against a chosen film speed.

**Architecture:** Pure EV/solver/smoothing math lives in `@dorkroom/logic` (unit-tested, no native deps) and reuses the existing camera-exposure module. `react-native-vision-camera` v5 in `apps/mobile` supplies the live auto-exposure reading (`exposureDuration` + `iso`); a thin mobile hook converts it to EV and feeds the pure solver. A new "Meter" native tab hosts a full-screen camera preview with an overlay GlassCard of controls.

**Tech Stack:** React 19, TypeScript, Expo SDK 54 / React Native 0.81, expo-router native tabs, NativeWind v4, react-native-vision-camera v5 (Nitro), react-native-mmkv, vitest + @testing-library/react.

## Global Constraints

- **Never use `any`** — use specific types or `unknown`.
- **Never import internal package paths** — import from `@dorkroom/logic` / `@dorkroom/api` / `@dorkroom/ui`, never deep paths.
- **No "warning"/"error" in file names** (breaks the build log scanner).
- **CalVer** — mobile `package.json` version is `YYYY.MM.DD` for the push date; web and mobile version independently. Mobile changelog is `apps/mobile/CHANGELOG.md`.
- **Health score** — `npx react-doctor@0.2.1 --score` must stay 100/100 for `@dorkroom/source`, `@dorkroom/logic`, `@dorkroom/ui`.
- **Gate** — `bun run test` (lint + test + build + typecheck) must pass; run `bun run format` after.
- **EV convention** — all EV values are EV at ISO 100 (EV₁₀₀); the existing `solveFor*` helpers already expect EV₁₀₀ + the actual ISO.
- **iOS only** — no web counterpart; do not touch `apps/dorkroom`.
- **Commit style** — conventional commits, short messages. Do not push.

---

## File Structure

**`packages/logic/src/` (pure, tested):**
- Create `constants/light-meter-defaults.ts` — default aperture, calibration offset, sample window, practical shutter range.
- Create `types/light-meter.ts` — `MeterPriority`, `LightMeterSolution`.
- Create `utils/light-meter.ts` — `evFromCameraReading`, `smoothEv`.
- Create `hooks/use-light-meter-solver.ts` — pure solver hook.
- Create `__tests__/utils/light-meter.test.ts`, `hooks/__tests__/use-light-meter-solver.test.ts`.
- Modify `index.ts` — export the new constants, types, utils, hook.

**`apps/mobile/` (native wiring):**
- Modify `package.json` — add `react-native-vision-camera`; bump version.
- Modify `app.json` — add vision-camera config plugin + camera permission string.
- Create `src/lib/meter-calibration.ts` — MMKV-backed calibration offset persistence.
- Create `src/hooks/use-camera-meter.ts` — polls the camera controller, returns live EV + permission/device state.
- Create `src/components/meter/reticle.tsx`, `ev-readout.tsx`, `iso-stepper.tsx`, `meter-controls.tsx`, `permission-fallback.tsx`.
- Create `app/(tabs)/meter.tsx` — the screen.
- Modify `app/(tabs)/_layout.tsx` — add the "Meter" tab.
- Modify `apps/mobile/CHANGELOG.md` — add entry.

---

## Task 1: Pure EV utilities, constants & types (logic)

**Files:**
- Create: `packages/logic/src/constants/light-meter-defaults.ts`
- Create: `packages/logic/src/types/light-meter.ts`
- Create: `packages/logic/src/utils/light-meter.ts`
- Test: `packages/logic/src/__tests__/utils/light-meter.test.ts`
- Modify: `packages/logic/src/index.ts`

**Interfaces:**
- Consumes: `calculateEV(aperture, shutterSpeed, iso): number` from `../utils/camera-exposure-calculations`.
- Produces:
  - `evFromCameraReading(exposureDuration: number, iso: number, aperture: number, calibrationOffset: number): number` — EV₁₀₀, or `NaN` for invalid input.
  - `smoothEv(samples: readonly number[]): number` — median of finite samples, or `NaN` when none.
  - Constants `DEFAULT_METER_APERTURE = 1.8`, `DEFAULT_METER_CALIBRATION_OFFSET = 0`, `METER_EV_SAMPLE_WINDOW = 8`, `METER_MIN_SHUTTER_SPEED = 1/8000`, `METER_MAX_SHUTTER_SPEED = 30`.
  - Types `MeterPriority = 'aperture' | 'shutter'`, `LightMeterSolution`.

- [ ] **Step 1: Write the failing test**

Create `packages/logic/src/__tests__/utils/light-meter.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { calculateEV } from '../../utils/camera-exposure-calculations';
import { evFromCameraReading, smoothEv } from '../../utils/light-meter';

describe('evFromCameraReading', () => {
  it('matches calculateEV plus the calibration offset', () => {
    // f/1.8, 1/60s, ISO 100 with no offset.
    const expected = calculateEV(1.8, 1 / 60, 100);
    expect(evFromCameraReading(1 / 60, 100, 1.8, 0)).toBeCloseTo(expected, 6);
  });

  it('adds the calibration offset in stops', () => {
    const base = evFromCameraReading(1 / 60, 100, 1.8, 0);
    expect(evFromCameraReading(1 / 60, 100, 1.8, 1)).toBeCloseTo(base + 1, 6);
    expect(evFromCameraReading(1 / 60, 100, 1.8, -0.5)).toBeCloseTo(
      base - 0.5,
      6
    );
  });

  it('returns NaN for non-positive or non-finite readings', () => {
    expect(evFromCameraReading(0, 100, 1.8, 0)).toBeNaN();
    expect(evFromCameraReading(1 / 60, 0, 1.8, 0)).toBeNaN();
    expect(evFromCameraReading(Number.NaN, 100, 1.8, 0)).toBeNaN();
    expect(evFromCameraReading(1 / 60, Number.POSITIVE_INFINITY, 1.8, 0)).toBeNaN();
  });
});

describe('smoothEv', () => {
  it('returns the median of an odd-length sample set', () => {
    expect(smoothEv([10, 12, 11])).toBe(11);
  });

  it('averages the two middle values for an even-length set', () => {
    expect(smoothEv([10, 12, 11, 13])).toBe(11.5);
  });

  it('ignores non-finite samples', () => {
    expect(smoothEv([10, Number.NaN, 12, Number.POSITIVE_INFINITY, 11])).toBe(11);
  });

  it('returns NaN when there are no finite samples', () => {
    expect(smoothEv([])).toBeNaN();
    expect(smoothEv([Number.NaN])).toBeNaN();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/logic && bunx vitest run light-meter`
Expected: FAIL — `Failed to resolve import "../../utils/light-meter"`.

- [ ] **Step 3: Write the constants**

Create `packages/logic/src/constants/light-meter-defaults.ts`:

```typescript
/** Typical fixed aperture (f-number) of a modern iPhone main lens. */
export const DEFAULT_METER_APERTURE = 1.8;

/** User calibration offset in stops; 0 uses the raw camera reading. */
export const DEFAULT_METER_CALIBRATION_OFFSET = 0;

/** Number of recent EV samples to median-smooth over. */
export const METER_EV_SAMPLE_WINDOW = 8;

/** Practical shutter-speed range for flagging out-of-range solved results (seconds). */
export const METER_MIN_SHUTTER_SPEED = 1 / 8000;
export const METER_MAX_SHUTTER_SPEED = 30;
```

- [ ] **Step 4: Write the types**

Create `packages/logic/src/types/light-meter.ts`:

```typescript
/** Which setting the user fixes; the meter solves the other. */
export type MeterPriority = 'aperture' | 'shutter';

export interface LightMeterSolution {
  /** Aperture f-number (locked in aperture-priority, solved in shutter-priority). */
  aperture: number;
  /** Shutter speed in seconds (locked in shutter-priority, solved in aperture-priority). */
  shutterSpeed: number;
  /** Formatted label for the solved (non-locked) value, e.g. "1/125" or "f/5.6". */
  solvedLabel: string;
  /** True when the solved shutter falls outside the practical range. */
  outOfRange: boolean;
  /** False when the EV input or settings are invalid. */
  isValid: boolean;
}
```

- [ ] **Step 5: Write the utilities**

Create `packages/logic/src/utils/light-meter.ts`:

```typescript
import { calculateEV } from './camera-exposure-calculations';

/**
 * Computes scene EV at ISO 100 from a camera auto-exposure reading.
 *
 * The live metering API (react-native-vision-camera) exposes the chosen exposure
 * duration and ISO but not the lens f-number. iPhone main lenses have a fixed
 * aperture, so callers pass a known per-device aperture and fold any residual
 * error into a user calibration offset (in stops).
 *
 * @param exposureDuration - Shutter speed the camera chose, in seconds
 * @param iso - ISO the camera chose
 * @param aperture - Assumed (fixed) lens f-number
 * @param calibrationOffset - User calibration in stops, added to the EV
 * @returns EV at ISO 100, or NaN if the reading is invalid
 */
export const evFromCameraReading = (
  exposureDuration: number,
  iso: number,
  aperture: number,
  calibrationOffset: number
): number => {
  if (
    !Number.isFinite(exposureDuration) ||
    !Number.isFinite(iso) ||
    exposureDuration <= 0 ||
    iso <= 0
  ) {
    return Number.NaN;
  }
  const ev = calculateEV(aperture, exposureDuration, iso);
  if (!Number.isFinite(ev)) return Number.NaN;
  return ev + calibrationOffset;
};

/**
 * Returns the median of recent EV samples to damp auto-exposure jitter.
 * Non-finite samples are ignored; returns NaN when no finite samples remain.
 */
export const smoothEv = (samples: readonly number[]): number => {
  const valid = samples.filter((s) => Number.isFinite(s));
  if (valid.length === 0) return Number.NaN;
  const sorted = [...valid].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
};
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd packages/logic && bunx vitest run light-meter`
Expected: PASS — all 8 assertions green.

- [ ] **Step 7: Export from the package index**

Modify `packages/logic/src/index.ts`. Add to the constants block (near the other `export * from './constants/...'` lines):

```typescript
export * from './constants/light-meter-defaults';
```

Add to the types block (near `export * from './types/camera-exposure-calculator';`):

```typescript
export * from './types/light-meter';
```

Add to the utils block (near `export * from './utils/camera-exposure-calculations';`):

```typescript
export * from './utils/light-meter';
```

- [ ] **Step 8: Commit**

```bash
git add packages/logic/src/constants/light-meter-defaults.ts packages/logic/src/types/light-meter.ts packages/logic/src/utils/light-meter.ts packages/logic/src/__tests__/utils/light-meter.test.ts packages/logic/src/index.ts
git commit -m "feat(logic): add light meter EV utilities and constants"
```

---

## Task 2: Pure solver hook (logic)

**Files:**
- Create: `packages/logic/src/hooks/use-light-meter-solver.ts`
- Test: `packages/logic/src/hooks/__tests__/use-light-meter-solver.test.ts`
- Modify: `packages/logic/src/index.ts`

**Interfaces:**
- Consumes: `solveForShutterSpeed`, `solveForAperture`, `formatShutterSpeed`, `formatAperture` from `../utils/camera-exposure-calculations`; `roundToPrecision` from `../utils/precision`; `DEFAULT_CAMERA_EXPOSURE_APERTURE`, `DEFAULT_CAMERA_EXPOSURE_ISO`, `DEFAULT_CAMERA_EXPOSURE_SHUTTER_SPEED` from `../constants/camera-exposure-defaults`; `METER_MIN_SHUTTER_SPEED`, `METER_MAX_SHUTTER_SPEED` from `../constants/light-meter-defaults`; `LightMeterSolution`, `MeterPriority` from `../types/light-meter`.
- Produces: `useLightMeterSolver(ev: number | null): UseLightMeterSolver` where `UseLightMeterSolver` exposes `iso`, `setIso`, `priority`, `setPriority`, `aperture`, `setAperture`, `shutterSpeed`, `setShutterSpeed`, `solution: LightMeterSolution`.

- [ ] **Step 1: Write the failing test**

Create `packages/logic/src/hooks/__tests__/use-light-meter-solver.test.ts`:

```typescript
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { calculateEV } from '../../utils/camera-exposure-calculations';
import { useLightMeterSolver } from '../use-light-meter-solver';

describe('useLightMeterSolver', () => {
  it('is invalid when EV is null or NaN', () => {
    const { result } = renderHook(() => useLightMeterSolver(null));
    expect(result.current.solution.isValid).toBe(false);
    expect(result.current.solution.solvedLabel).toBe('—');
  });

  it('solves shutter speed in aperture-priority (default)', () => {
    // Scene EV100 = 12. Default aperture f/8, ISO 100.
    const { result } = renderHook(() => useLightMeterSolver(12));
    expect(result.current.priority).toBe('aperture');
    expect(result.current.solution.isValid).toBe(true);
    // Solved shutter must reproduce EV 12 at f/8, ISO 100.
    const solved = result.current.solution.shutterSpeed;
    expect(calculateEV(8, solved, 100)).toBeCloseTo(12, 4);
  });

  it('re-solves shutter when ISO changes (faster film → faster shutter)', () => {
    const { result } = renderHook(() => useLightMeterSolver(12));
    const slow = result.current.solution.shutterSpeed;
    act(() => result.current.setIso(400));
    const fast = result.current.solution.shutterSpeed;
    expect(fast).toBeLessThan(slow);
    expect(calculateEV(8, fast, 400)).toBeCloseTo(12, 4);
  });

  it('solves aperture in shutter-priority', () => {
    const { result } = renderHook(() => useLightMeterSolver(12));
    act(() => result.current.setPriority('shutter'));
    act(() => result.current.setShutterSpeed(1 / 125));
    const solvedAperture = result.current.solution.aperture;
    expect(calculateEV(solvedAperture, 1 / 125, 100)).toBeCloseTo(12, 4);
    expect(result.current.solution.solvedLabel.startsWith('f/')).toBe(true);
  });

  it('flags out-of-range solved shutter for a very dark scene', () => {
    // EV -6 at f/8 ISO 100 → shutter far longer than 30s.
    const { result } = renderHook(() => useLightMeterSolver(-6));
    expect(result.current.solution.outOfRange).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/logic && bunx vitest run use-light-meter-solver`
Expected: FAIL — `Failed to resolve import "../use-light-meter-solver"`.

- [ ] **Step 3: Write the hook**

Create `packages/logic/src/hooks/use-light-meter-solver.ts`:

```typescript
import { useMemo, useState } from 'react';
import {
  DEFAULT_CAMERA_EXPOSURE_APERTURE,
  DEFAULT_CAMERA_EXPOSURE_ISO,
  DEFAULT_CAMERA_EXPOSURE_SHUTTER_SPEED,
} from '../constants/camera-exposure-defaults';
import {
  METER_MAX_SHUTTER_SPEED,
  METER_MIN_SHUTTER_SPEED,
} from '../constants/light-meter-defaults';
import type { LightMeterSolution, MeterPriority } from '../types/light-meter';
import {
  formatAperture,
  formatShutterSpeed,
  solveForAperture,
  solveForShutterSpeed,
} from '../utils/camera-exposure-calculations';
import { roundToPrecision } from '../utils/precision';

export interface UseLightMeterSolver {
  iso: number;
  setIso: (iso: number) => void;
  priority: MeterPriority;
  setPriority: (priority: MeterPriority) => void;
  aperture: number;
  setAperture: (aperture: number) => void;
  shutterSpeed: number;
  setShutterSpeed: (shutterSpeed: number) => void;
  solution: LightMeterSolution;
}

/**
 * Solves for the missing exposure setting from a metered EV (at ISO 100).
 *
 * Aperture-priority: the user fixes the aperture, the hook solves the shutter.
 * Shutter-priority: the user fixes the shutter, the hook solves the aperture.
 *
 * @param ev - Metered scene EV at ISO 100, or null/NaN when unavailable
 */
export const useLightMeterSolver = (ev: number | null): UseLightMeterSolver => {
  const [iso, setIso] = useState(DEFAULT_CAMERA_EXPOSURE_ISO);
  const [priority, setPriority] = useState<MeterPriority>('aperture');
  const [aperture, setAperture] = useState(DEFAULT_CAMERA_EXPOSURE_APERTURE);
  const [shutterSpeed, setShutterSpeed] = useState(
    DEFAULT_CAMERA_EXPOSURE_SHUTTER_SPEED
  );

  const solution = useMemo<LightMeterSolution>(() => {
    if (ev === null || !Number.isFinite(ev)) {
      return {
        aperture,
        shutterSpeed,
        solvedLabel: '—',
        outOfRange: false,
        isValid: false,
      };
    }

    if (priority === 'aperture') {
      const solvedShutter = solveForShutterSpeed(ev, aperture, iso);
      const outOfRange =
        solvedShutter < METER_MIN_SHUTTER_SPEED ||
        solvedShutter > METER_MAX_SHUTTER_SPEED;
      return {
        aperture,
        shutterSpeed: solvedShutter,
        solvedLabel: formatShutterSpeed(solvedShutter),
        outOfRange,
        isValid: Number.isFinite(solvedShutter),
      };
    }

    const solvedAperture = solveForAperture(ev, shutterSpeed, iso);
    return {
      aperture: solvedAperture,
      shutterSpeed,
      solvedLabel: formatAperture(roundToPrecision(solvedAperture, 1)),
      outOfRange: false,
      isValid: Number.isFinite(solvedAperture),
    };
  }, [ev, priority, aperture, shutterSpeed, iso]);

  return {
    iso,
    setIso,
    priority,
    setPriority,
    aperture,
    setAperture,
    shutterSpeed,
    setShutterSpeed,
    solution,
  };
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd packages/logic && bunx vitest run use-light-meter-solver`
Expected: PASS — all 5 assertions green.

- [ ] **Step 5: Export from the package index**

Modify `packages/logic/src/index.ts`. Add near the other hook exports (e.g. after the `useExposureCalculator`/`useReciprocityCalculator` exports — match the existing export style in that area; if hooks are re-exported with explicit names, use the named form, otherwise add a line):

```typescript
export {
  type UseLightMeterSolver,
  useLightMeterSolver,
} from './hooks/use-light-meter-solver';
```

- [ ] **Step 6: Run the logic test suite to confirm nothing regressed**

Run: `cd packages/logic && bunx vitest run`
Expected: PASS — full logic suite green.

- [ ] **Step 7: Commit**

```bash
git add packages/logic/src/hooks/use-light-meter-solver.ts packages/logic/src/hooks/__tests__/use-light-meter-solver.test.ts packages/logic/src/index.ts
git commit -m "feat(logic): add useLightMeterSolver hook"
```

---

## Task 3: Install vision-camera, configure Expo, camera spike (mobile)

This task is verified **on-device** (the iOS simulator has no real camera; vision-camera needs a physical device and a dev-client rebuild). There is no unit test — the deliverable is "a live camera preview renders on the Meter tab and exposure values log to the console."

**Files:**
- Modify: `apps/mobile/package.json`
- Modify: `apps/mobile/app.json`
- Create: `apps/mobile/app/(tabs)/meter.tsx` (temporary spike version, replaced in Task 7)
- Modify: `apps/mobile/app/(tabs)/_layout.tsx`

**Interfaces:**
- Produces: a working `react-native-vision-camera` install + Expo config; confirms the v5 controller accessor used by later tasks (`useCameraDevice`, `useCameraPermission`, and the exposure/iso readback API).

- [ ] **Step 1: Add the dependency**

Run (the repo enforces a 7-day `minimumReleaseAge`; vision-camera v5 is older than that, so a normal add works):

```bash
cd apps/mobile && bun add react-native-vision-camera
```

Confirm `apps/mobile/package.json` now lists `react-native-vision-camera` (v5.x) under `dependencies`.

- [ ] **Step 2: Configure the Expo config plugin and permission string**

Modify `apps/mobile/app.json`. Add the vision-camera plugin to the `plugins` array (after the `expo-build-properties` entry):

```json
[
  "react-native-vision-camera",
  {
    "cameraPermissionText": "Dorkroom uses the camera to meter the light in your scene."
  }
]
```

- [ ] **Step 3: Write the temporary camera spike screen**

Create `apps/mobile/app/(tabs)/meter.tsx` (this is a throwaway to confirm the native pipeline; Task 7 replaces it):

```tsx
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';

export default function MeterScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');

  useEffect(() => {
    if (!hasPermission) void requestPermission();
  }, [hasPermission, requestPermission]);

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Camera permission required.</Text>
      </View>
    );
  }
  if (device == null) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>No camera device.</Text>
      </View>
    );
  }

  return (
    <Camera style={StyleSheet.absoluteFill} device={device} isActive={true} />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b0b0c' },
  text: { color: '#f5f5f4' },
});
```

- [ ] **Step 4: Add the Meter tab**

Modify `apps/mobile/app/(tabs)/_layout.tsx` — add a trigger after the `resize` trigger:

```tsx
<NativeTabs.Trigger name="meter">
  <Label>Meter</Label>
</NativeTabs.Trigger>
```

- [ ] **Step 5: Prebuild and run on a physical device**

Run:

```bash
cd apps/mobile && bun run native:prebuild
bun run ios --device
```

Expected: app installs on the connected iPhone; tapping the **Meter** tab prompts for camera permission, then shows a live camera preview. (If `bun run ios --device` cannot target the device in your setup, use the local EAS build per `apps/mobile/README.md`.)

- [ ] **Step 6: Confirm the exposure readback API**

In `meter.tsx`, temporarily add a Camera `ref` and log the controller's exposure values, then confirm the exact accessor against the installed version's types. Add to the spike:

```tsx
import { useRef } from 'react';
// inside component:
const camera = useRef<Camera>(null);
// add ref={camera} to <Camera/>, and an onInitialized handler:
// <Camera ... ref={camera} onInitialized={() => {
//   // Confirm the v5 readback path against node_modules type defs:
//   //   grep -rn "exposureDuration" node_modules/react-native-vision-camera/lib
//   console.log('[meter] exposure check wired');
// }} />
```

Run `grep -rn "exposureDuration\|supportsExposureMetering\|focusTo\|setExposureLocked" node_modules/react-native-vision-camera/lib/typescript` to record the exact controller accessor (via `camera.current` / a controller object) that Task 5 will use.

Expected: you have a confirmed path to read `exposureDuration` and `iso` and to call `focusTo(point, { modes: ['AE'] })`. Note the exact symbol names in your task notes for Task 5.

- [ ] **Step 7: Commit**

```bash
# bun workspaces keep a single lockfile at the repo root; include it.
git add apps/mobile/package.json apps/mobile/app.json apps/mobile/app/\(tabs\)/meter.tsx apps/mobile/app/\(tabs\)/_layout.tsx bun.lock
git commit -m "feat(mobile): add vision-camera, Meter tab camera spike"
```

---

## Task 4: Calibration offset persistence (mobile)

**Files:**
- Create: `apps/mobile/src/lib/meter-calibration.ts`

**Interfaces:**
- Consumes: `MMKV` from `react-native-mmkv`; `DEFAULT_METER_CALIBRATION_OFFSET` from `@dorkroom/logic`.
- Produces: `getCalibrationOffset(): number`, `setCalibrationOffset(stops: number): void`.

This is a thin native-storage wrapper verified via the integration in Task 5/7 (MMKV is not exercised under vitest). Keep it tiny and side-effect-isolated.

- [ ] **Step 1: Write the module**

Create `apps/mobile/src/lib/meter-calibration.ts`:

```typescript
import { DEFAULT_METER_CALIBRATION_OFFSET } from '@dorkroom/logic';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'dorkroom-light-meter' });
const KEY = 'calibrationOffsetStops';

/** Reads the persisted calibration offset in stops, defaulting when unset/invalid. */
export function getCalibrationOffset(): number {
  const value = storage.getNumber(KEY);
  return value === undefined || !Number.isFinite(value)
    ? DEFAULT_METER_CALIBRATION_OFFSET
    : value;
}

/** Persists the calibration offset in stops. */
export function setCalibrationOffset(stops: number): void {
  storage.set(KEY, stops);
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/mobile && bun run typecheck`
Expected: PASS (no type errors).

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/lib/meter-calibration.ts
git commit -m "feat(mobile): persist light meter calibration offset"
```

---

## Task 5: Camera metering hook (mobile)

**Files:**
- Create: `apps/mobile/src/hooks/use-camera-meter.ts`

**Interfaces:**
- Consumes: `useCameraDevice`, `useCameraPermission`, `Camera` from `react-native-vision-camera`; `evFromCameraReading`, `smoothEv`, `DEFAULT_METER_APERTURE`, `METER_EV_SAMPLE_WINDOW` from `@dorkroom/logic`; `getCalibrationOffset` from `../lib/meter-calibration`.
- Produces: `useCameraMeter(calibrationOffset: number): CameraMeter` where:

```typescript
interface CameraMeter {
  device: ReturnType<typeof useCameraDevice>;
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
  cameraRef: RefObject<Camera | null>;
  ev: number | null;          // smoothed scene EV100, null until metering
  isLocked: boolean;          // true after a tap-to-meter lock
  meterAtPoint: (point: { x: number; y: number }) => Promise<void>;
  onInitialized: () => void;
}
```

This hook is verified on-device (Task 7). Use the exact v5 controller accessor confirmed in Task 3, Step 6. The code below assumes the documented pattern where the camera controller exposes `exposureDuration` / `iso` and `focusTo`; adjust the two marked lines to the confirmed accessor if the installed version differs.

- [ ] **Step 1: Write the hook**

Create `apps/mobile/src/hooks/use-camera-meter.ts`:

```typescript
import {
  DEFAULT_METER_APERTURE,
  evFromCameraReading,
  METER_EV_SAMPLE_WINDOW,
  smoothEv,
} from '@dorkroom/logic';
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';

const POLL_MS = 250;

export interface CameraMeter {
  device: ReturnType<typeof useCameraDevice>;
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
  cameraRef: RefObject<Camera | null>;
  ev: number | null;
  isLocked: boolean;
  meterAtPoint: (point: { x: number; y: number }) => Promise<void>;
  onInitialized: () => void;
}

/**
 * Polls the camera's auto-exposure (exposureDuration + iso), smooths the EV, and
 * exposes a tap-to-meter lock. Returns EV at ISO 100 for the pure solver.
 */
export const useCameraMeter = (calibrationOffset: number): CameraMeter => {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const cameraRef = useRef<Camera | null>(null);
  const samplesRef = useRef<number[]>([]);
  const initializedRef = useRef(false);
  const [ev, setEv] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  const readEv = useCallback((): number => {
    const controller = cameraRef.current;
    if (controller == null) return Number.NaN;
    // CONFIRMED IN TASK 3: read the current AE values from the controller.
    const exposureDuration = controller.exposureDuration;
    const iso = controller.iso;
    return evFromCameraReading(
      exposureDuration,
      iso,
      DEFAULT_METER_APERTURE,
      calibrationOffset
    );
  }, [calibrationOffset]);

  const onInitialized = useCallback(() => {
    initializedRef.current = true;
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (!initializedRef.current) return;
      const sample = readEv();
      const buffer = samplesRef.current;
      buffer.push(sample);
      if (buffer.length > METER_EV_SAMPLE_WINDOW) buffer.shift();
      const smoothed = smoothEv(buffer);
      setEv(Number.isFinite(smoothed) ? smoothed : null);
    }, POLL_MS);
    return () => clearInterval(id);
  }, [readEv]);

  const meterAtPoint = useCallback(
    async (point: { x: number; y: number }) => {
      const controller = cameraRef.current;
      if (controller == null) return;
      try {
        // CONFIRMED IN TASK 3: AE-only metering at the tapped point.
        await controller.focus(point);
        setIsLocked(true);
      } catch {
        // Focus/metering not supported on this device; leave reading live.
      }
    },
    []
  );

  return {
    device,
    hasPermission,
    requestPermission,
    cameraRef,
    ev,
    isLocked,
    meterAtPoint,
    onInitialized,
  };
};
```

> Note for the implementer: the two `// CONFIRMED IN TASK 3` lines (reading `controller.exposureDuration`/`controller.iso`) and `meterAtPoint`'s `controller.focus(point)` call must match the accessor recorded in Task 3, Step 6. If the installed v5 exposes AE-only metering as `focusTo(point, { modes: ['AE'] })`, use that instead of `focus(point)`.

- [ ] **Step 2: Typecheck**

Run: `cd apps/mobile && bun run typecheck`
Expected: PASS. If the controller accessor names differ from the installed type defs, fix them now using the Task 3 notes until typecheck is clean.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/hooks/use-camera-meter.ts
git commit -m "feat(mobile): add useCameraMeter live EV hook"
```

---

## Task 6: Meter UI components (mobile)

**Files:**
- Create: `apps/mobile/src/components/meter/reticle.tsx`
- Create: `apps/mobile/src/components/meter/ev-readout.tsx`
- Create: `apps/mobile/src/components/meter/iso-stepper.tsx`
- Create: `apps/mobile/src/components/meter/permission-fallback.tsx`
- Create: `apps/mobile/src/components/meter/meter-controls.tsx`

**Interfaces:**
- Consumes: `STANDARD_ISOS`, `STANDARD_APERTURES`, `STANDARD_SHUTTER_SPEEDS`, `formatAperture`, `formatShutterSpeed`, types `LightMeterSolution`, `MeterPriority` from `@dorkroom/logic`; existing `GlassCard`, `OptionRow`, `ResultRow` from `@/components/*`.
- Produces: presentational components consumed by Task 7:
  - `Reticle()` — center crosshair overlay.
  - `EvReadout({ ev }: { ev: number | null })`.
  - `IsoStepper({ iso, onChange }: { iso: number; onChange: (iso: number) => void })`.
  - `PermissionFallback({ onRequest }: { onRequest: () => void })`.
  - `MeterControls(props: MeterControlsProps)` (see Step 5 for the prop type).

- [ ] **Step 1: Reticle**

Create `apps/mobile/src/components/meter/reticle.tsx`:

```tsx
import { View } from 'react-native';

/** A center metering crosshair drawn over the camera preview. */
export function Reticle() {
  return (
    <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
      <View className="h-16 w-16 rounded-full border-2 border-white/80" />
      <View className="absolute h-px w-6 bg-white/80" />
      <View className="absolute h-6 w-px bg-white/80" />
    </View>
  );
}
```

- [ ] **Step 2: EV readout**

Create `apps/mobile/src/components/meter/ev-readout.tsx`:

```tsx
import { Text, View } from 'react-native';

/** Large live EV display; shows a metering placeholder until a value arrives. */
export function EvReadout({ ev }: { ev: number | null }) {
  return (
    <View className="items-center">
      <Text className="text-xs uppercase tracking-wide text-white/50">EV @ ISO 100</Text>
      <Text className="text-4xl font-bold text-white">
        {ev === null ? 'metering…' : ev.toFixed(1)}
      </Text>
    </View>
  );
}
```

- [ ] **Step 3: ISO stepper**

Create `apps/mobile/src/components/meter/iso-stepper.tsx`:

```tsx
import { STANDARD_ISOS } from '@dorkroom/logic';
import { OptionRow } from '@/components/option-row';

/** Picks the film speed from the standard ISO list. */
export function IsoStepper({
  iso,
  onChange,
}: {
  iso: number;
  onChange: (iso: number) => void;
}) {
  const options = STANDARD_ISOS.map((entry) => ({
    label: entry.label,
    value: entry.value,
  }));
  return (
    <OptionRow label="Film speed" options={options} value={iso} onChange={onChange} />
  );
}
```

- [ ] **Step 4: Permission fallback**

Create `apps/mobile/src/components/meter/permission-fallback.tsx`:

```tsx
import { Linking, Pressable, Text, View } from 'react-native';

/** Shown when camera permission is missing; offers request + Settings deep-link. */
export function PermissionFallback({ onRequest }: { onRequest: () => void }) {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-[#0b0b0c] p-8">
      <Text className="text-center text-base text-white/80">
        Dorkroom needs camera access to meter your scene.
      </Text>
      <Pressable
        onPress={onRequest}
        accessibilityRole="button"
        className="rounded-xl bg-rose-600 px-5 py-3"
      >
        <Text className="font-semibold text-white">Allow camera</Text>
      </Pressable>
      <Pressable onPress={() => void Linking.openSettings()} accessibilityRole="button">
        <Text className="text-white/60">Open Settings</Text>
      </Pressable>
    </View>
  );
}
```

- [ ] **Step 5: Meter controls (overlay card)**

Create `apps/mobile/src/components/meter/meter-controls.tsx`:

```tsx
import {
  type LightMeterSolution,
  type MeterPriority,
  STANDARD_APERTURES,
  STANDARD_SHUTTER_SPEEDS,
} from '@dorkroom/logic';
import { Text, View } from 'react-native';
import { GlassCard } from '@/components/glass-card';
import { OptionRow } from '@/components/option-row';
import { ResultRow } from '@/components/result-row';
import { EvReadout } from './ev-readout';
import { IsoStepper } from './iso-stepper';

export interface MeterControlsProps {
  ev: number | null;
  iso: number;
  onIsoChange: (iso: number) => void;
  priority: MeterPriority;
  onPriorityChange: (priority: MeterPriority) => void;
  aperture: number;
  onApertureChange: (aperture: number) => void;
  shutterSpeed: number;
  onShutterSpeedChange: (shutterSpeed: number) => void;
  solution: LightMeterSolution;
}

const PRIORITY_OPTIONS: { label: string; value: MeterPriority }[] = [
  { label: 'Aperture priority', value: 'aperture' },
  { label: 'Shutter priority', value: 'shutter' },
];

/** Bottom overlay: EV, ISO, priority, the locked input, and the solved result. */
export function MeterControls(props: MeterControlsProps) {
  const apertureOptions = STANDARD_APERTURES.map((a) => ({
    label: a.label,
    value: a.value,
  }));
  const shutterOptions = STANDARD_SHUTTER_SPEEDS.map((s) => ({
    label: s.label,
    value: s.value,
  }));

  return (
    <GlassCard className="gap-4">
      <EvReadout ev={props.ev} />
      <IsoStepper iso={props.iso} onChange={props.onIsoChange} />
      <OptionRow
        label="Priority"
        options={PRIORITY_OPTIONS}
        value={props.priority}
        onChange={props.onPriorityChange}
      />
      {props.priority === 'aperture' ? (
        <OptionRow
          label="Aperture"
          options={apertureOptions}
          value={props.aperture}
          onChange={props.onApertureChange}
        />
      ) : (
        <OptionRow
          label="Shutter"
          options={shutterOptions}
          value={props.shutterSpeed}
          onChange={props.onShutterSpeedChange}
        />
      )}
      <ResultRow
        label={props.priority === 'aperture' ? 'Shutter' : 'Aperture'}
        value={props.solution.isValid ? props.solution.solvedLabel : '—'}
      />
      {props.solution.outOfRange ? (
        <Text className="text-sm text-amber-400">
          Solved shutter is outside 1/8000s–30s.
        </Text>
      ) : null}
    </GlassCard>
  );
}
```

- [ ] **Step 6: Typecheck**

Run: `cd apps/mobile && bun run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/components/meter
git commit -m "feat(mobile): add light meter UI components"
```

---

## Task 7: Meter screen wiring + tap-to-meter (mobile)

**Files:**
- Modify: `apps/mobile/app/(tabs)/meter.tsx` (replace the Task 3 spike)

**Interfaces:**
- Consumes: `useLightMeterSolver` from `@dorkroom/logic`; `useCameraMeter` from `@/hooks/use-camera-meter`; `getCalibrationOffset` from `@/lib/meter-calibration`; the Task 6 components; `Camera` from `react-native-vision-camera`; `useIsFocused` from `@react-navigation/native`.

This screen is verified on-device.

- [ ] **Step 1: Replace the spike screen with the full screen**

Replace the entire contents of `apps/mobile/app/(tabs)/meter.tsx`:

```tsx
import { useLightMeterSolver } from '@dorkroom/logic';
import { useIsFocused } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Camera } from 'react-native-vision-camera';
import { MeterControls } from '@/components/meter/meter-controls';
import { PermissionFallback } from '@/components/meter/permission-fallback';
import { Reticle } from '@/components/meter/reticle';
import { useCameraMeter } from '@/hooks/use-camera-meter';
import { getCalibrationOffset } from '@/lib/meter-calibration';

export default function MeterScreen() {
  const [calibrationOffset] = useState(getCalibrationOffset);
  const meter = useCameraMeter(calibrationOffset);
  const solver = useLightMeterSolver(meter.ev);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (!meter.hasPermission) void meter.requestPermission();
  }, [meter.hasPermission, meter.requestPermission]);

  if (!meter.hasPermission) {
    return <PermissionFallback onRequest={() => void meter.requestPermission()} />;
  }
  if (meter.device == null) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>No camera device available.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={(e) =>
          void meter.meterAtPoint({
            x: e.nativeEvent.locationX,
            y: e.nativeEvent.locationY,
          })
        }
      >
        <Camera
          ref={meter.cameraRef}
          style={StyleSheet.absoluteFill}
          device={meter.device}
          isActive={isFocused}
          onInitialized={meter.onInitialized}
        />
        <Reticle />
      </Pressable>
      <View style={styles.overlay} pointerEvents="box-none">
        <MeterControls
          ev={meter.ev}
          iso={solver.iso}
          onIsoChange={solver.setIso}
          priority={solver.priority}
          onPriorityChange={solver.setPriority}
          aperture={solver.aperture}
          onApertureChange={solver.setAperture}
          shutterSpeed={solver.shutterSpeed}
          onShutterSpeedChange={solver.setShutterSpeed}
          solution={solver.solution}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0b0c' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b0b0c' },
  text: { color: '#f5f5f4' },
  overlay: { position: 'absolute', left: 16, right: 16, bottom: 32 },
});
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/mobile && bun run typecheck`
Expected: PASS.

- [ ] **Step 3: Run on device and verify the full flow**

Run: `cd apps/mobile && bun run ios --device`
Expected on a physical iPhone:
- Meter tab shows the live preview with a center reticle and the overlay card.
- EV readout updates (a bright window reads higher EV than a dim corner).
- Changing ISO / aperture updates the solved shutter; switching to shutter-priority solves aperture instead.
- Tapping a point meters there and the reading stabilizes (locked).
- A very dark scene shows the out-of-range warning.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/\(tabs\)/meter.tsx
git commit -m "feat(mobile): wire light meter screen with tap-to-meter"
```

---

## Task 8: Changelog, version bump, full verification

**Files:**
- Modify: `apps/mobile/CHANGELOG.md`
- Modify: `apps/mobile/package.json`

- [ ] **Step 1: Add the changelog entry**

Modify `apps/mobile/CHANGELOG.md` — under `## [Unreleased]` → `### Added`, add:

```markdown
- Native light meter screen ("Meter" tab): a full-screen camera preview that reads
  the scene's exposure value from the device's auto-exposure, with a center reticle
  and tap-to-spot-meter (locks the reading). The overlay solves camera settings
  against a chosen film ISO in aperture- or shutter-priority, flags out-of-range
  shutter speeds, and supports a persisted calibration offset. EV/solver/smoothing
  math is a pure, unit-tested module in `@dorkroom/logic`; the camera wiring uses
  `react-native-vision-camera`.
```

- [ ] **Step 2: Bump the mobile version to today's date**

Modify `apps/mobile/package.json` — set `"version"` to the current date in `YYYY.MM.DD` form (the push date).

- [ ] **Step 3: Run the full gate**

Run: `bun run test`
Expected: PASS — lint, test, build, typecheck across `@dorkroom/*` all green.

- [ ] **Step 4: Run React Doctor**

Run: `npx react-doctor@0.2.1 --score`
Expected: 100/100 for `@dorkroom/source`, `@dorkroom/logic`, and `@dorkroom/ui`. If a new mobile file regresses a score, fix the finding (prefer a real fix; only suppress a genuine false positive with a justifying `// eslint-disable-next-line react-doctor/<rule> -- why` comment).

- [ ] **Step 5: Format**

Run: `bun run format`
Expected: Biome writes formatting; re-stage any reformatted files.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/CHANGELOG.md apps/mobile/package.json
git commit -m "chore(mobile): changelog and version bump for light meter"
```

---

## Verification Summary

- **Unit-tested (CI gate):** `evFromCameraReading`, `smoothEv`, `useLightMeterSolver` in `@dorkroom/logic`.
- **On-device manual:** camera preview, live EV, tap-to-meter lock, ISO/priority solving, out-of-range warning, calibration offset persistence.
- **Gate:** `bun run test` green; React Doctor 100/100 ×3; `bun run format` applied.

## Notes / Risks Carried From the Spec

- vision-camera v5 + Expo SDK 54 / RN 0.81: Task 3 is a deliberate spike to de-risk the native install before building UI. If the config plugin or build fails, resolve there before proceeding.
- Exact v5 controller accessor for `exposureDuration`/`iso`/`focusTo` is confirmed in Task 3, Step 6 and applied in Task 5 — adjust those marked lines to the installed version's API.
- `assumedAperture` default (f/1.8) accuracy across iPhone models is absorbed by the user calibration offset; revisit a native `lensAperture` read later if defaults are consistently off.
