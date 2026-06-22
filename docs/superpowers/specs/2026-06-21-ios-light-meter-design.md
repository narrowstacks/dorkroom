# iOS Light Meter — Design Spec

**Date:** 2026-06-21
**App:** `@dorkroom/mobile` (iOS)
**Status:** Approved design, pending implementation plan

## Summary

Add a reflected/spot **light meter** to the iOS app. The photographer points the
phone at a scene, the meter reads the camera's auto-exposure, computes the scene's
Exposure Value (EV₁₀₀), and solves for camera settings against a chosen film speed.
It reuses the existing camera-exposure math in `@dorkroom/logic`; the camera only
needs to supply a real-world EV.

This is an iOS-only feature (no web counterpart).

## Goals

- Live EV reading of a scene from the device camera.
- Solve for the missing exposure setting: pick film ISO + a priority
  (aperture-priority → get shutter, or shutter-priority → get aperture).
- Spot metering: tap the preview to meter and lock on that point.
- Work offline; no network dependency.

## Non-Goals (v1, YAGNI)

- Film-database ISO lookup (manual ISO picker only for v1).
- Incident metering / dome simulation.
- Exposure history or averaging multiple spot readings.
- Hand-off to the reciprocity calculator.
- Full equivalent-exposure table display (solver shows a single solved pair).

## Approach & Calibration

Let iOS run its own auto-exposure on the scene and read back the values
vision-camera v5 exposes — `controller.exposureDuration` and `controller.iso`.
The vision-camera docs explicitly document these "for light metering purposes."
Scene EV at ISO 100 is then computed with the math already present in
`@dorkroom/logic` (`calculateEV(aperture, shutterSpeed, iso)`).

**Calibration crux:** the live metering API exposes shutter + ISO but **not** the
lens aperture, and EV₁₀₀ = log₂(N²·100 / (t·S)) needs the f-number N. Modern
iPhones have a *fixed* main-lens aperture, so N is a per-device constant. We
therefore compute:

```
EV = evFromCameraReading(exposureDuration, iso, assumedAperture, calibrationOffset)
   = calculateEV(assumedAperture, exposureDuration, iso) + calibrationOffset
```

- `assumedAperture` — default to a typical iPhone main-lens value (~f/1.8).
- `calibrationOffset` — stops, default `0`, user-adjustable, persisted in MMKV.
  Lets the user match the reading to a trusted meter once. Because the device
  aperture is fixed, any per-device error folds cleanly into this single offset.

This is the standard, well-trodden approach for phone light-meter apps. Reading
the native `AVCaptureDevice.lensAperture` is a possible future enhancement to
improve the out-of-box default, but is not required for v1.

## Architecture

Clear split between pure, testable logic and native camera wiring.

### `@dorkroom/logic` (pure, unit-tested)

New `light-meter` module:

- **`evFromCameraReading(exposureDuration, iso, aperture, offset)` → number**
  Thin wrapper over existing `calculateEV`, adds the calibration offset. Returns
  the scene EV₁₀₀.
- **`smoothEv(samples)` → number**
  Jitter reduction over recent EV samples (rolling median / EMA). Reflected EV
  jitters frame-to-frame as the camera's AE hunts; this stabilizes the display.
- **`useLightMeterSolver`** — pure React hook (no native deps):
  - State: film ISO, priority (`aperture` | `shutter`), the locked value.
  - Input: a live EV.
  - Output: the solved setting (the other of aperture/shutter), formatted,
    plus an out-of-range flag.
  - Reuses existing `solveForShutterSpeed` / `solveForAperture`,
    `findNearestStandard`, formatters (`formatShutterSpeed`, `formatAperture`),
    the `STANDARD_APERTURES` / `STANDARD_SHUTTER_SPEEDS` / ISO tables, and the
    practical shutter-range constants (1/8000 s – 30 s).
- Constants: default assumed aperture, default calibration offset, the standard
  ISO list for the picker.

### `apps/mobile` (native wiring)

- **`app/(tabs)/meter.tsx`** — the screen:
  - Full-screen `<Camera>` preview, `isActive` only when the tab is focused.
  - Center metering reticle.
  - Tap-to-spot-meter: `controller.focusTo(point, { modes: ['AE'] })` (guarded by
    `supportsExposureMetering`), which locks AE on the tapped point so the reading
    freezes/stabilizes until the next tap.
  - Bottom translucent `GlassCard` overlay holding the controls.
- **`src/components/meter/`** — presentational pieces:
  - EV readout, ISO stepper, aperture↔shutter priority toggle, solved-result row,
    calibration control, and a permission / no-device fallback card.
- **`useCameraMeter`** hook (mobile, depends on vision-camera):
  - Polls the controller's `exposureDuration` + `iso` at ~4 Hz.
  - Feeds samples through `smoothEv` then `evFromCameraReading` (with the persisted
    calibration offset) to produce the live EV.
- **`app/(tabs)/_layout.tsx`** — add a 5th native tab, "Meter".

## Data Flow

```
camera AE
  → poll exposureDuration + iso (~4 Hz)
  → smoothEv(samples)
  → evFromCameraReading(smoothedReading, assumedAperture, calibrationOffset)
  → live EV display
  → useLightMeterSolver(EV, ISO, priority, lockedValue)
  → solved aperture/shutter

tap preview → lock AE on point → reading freezes until next tap
```

## Solver UX

- **Default:** aperture-priority — user picks an f-stop, meter returns the shutter.
- **Toggle:** shutter-priority — pick a shutter speed, get the aperture.
- **ISO:** manual stepper over standard film speeds (25, 50, 100, 200, 400, 800,
  1600, 3200, …).
- **Out-of-range:** solved shutter beyond the practical 1/8000 s – 30 s range is
  flagged (reuse existing range constants).
- **Reading capture:** live + smoothed EV by default; tapping to spot-meter locks
  AE for a stable held reading until the next tap.

## Error / Edge Handling

- **Permission denied / restricted** → fallback card with an "Open Settings" action
  (use `useCameraPermission`).
- **No camera device** → explanatory message.
- **Metering not yet available** (`exposureDuration`/`iso` is 0 / NaN) → show a
  "metering…" state rather than a bogus EV.
- **Calibration offset** persisted via the existing `react-native-mmkv` dependency.

## Build / Setup Call-outs

- Add `react-native-vision-camera` (v5 — Nitro-based, compatible with the existing
  `react-native-nitro-modules` dependency).
- Add its **Expo config plugin** and `NSCameraUsageDescription` to `app.json`.
- Requires `expo prebuild` + a dev-client / local-EAS rebuild (cannot run in Expo
  Go — the app already uses `expo-dev-client`).
- Bump mobile CalVer (`apps/mobile/package.json`) and add an
  `apps/mobile/CHANGELOG.md` entry (the iOS app versions independently of web).

## Testing

- **Pure logic** — `evFromCameraReading`, `smoothEv`, and `useLightMeterSolver`
  unit-tested with vitest in `@dorkroom/logic` (success cases, edge cases,
  out-of-range, NaN/invalid inputs, calibration offset).
- **Camera wiring** — verified on-device manually (native, not unit-testable);
  sanity-check the reading against a known meter and confirm the calibration
  offset corrects it.

## Risks / Open Questions

- vision-camera v5 + Expo SDK 54 / RN 0.81 compatibility — verify the config
  plugin and native build succeed during implementation (first task should be a
  thin "camera renders on device" spike before building the solver UI).
- Exact v5 controller access API (ref vs. hook) to be confirmed against installed
  version during implementation.
- Accuracy of the default `assumedAperture` across iPhone models — mitigated by
  the user calibration offset; revisit native `lensAperture` read if defaults are
  consistently off.
