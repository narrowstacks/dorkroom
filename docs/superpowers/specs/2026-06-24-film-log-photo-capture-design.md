# Film Log — Photo Capture & Attach (iOS)

**Status:** Approved design · **Date:** 2026-06-24 · **App:** `@dorkroom/mobile`

## Context

The Film Log feature (shipped in `apps/mobile`) lets a photographer catalog shots
on film rolls and log shots from the light meter. Today a shot records only
settings (frame, aperture, shutter, lens, holder) — there is no image. This
feature lets the light meter **capture a reference photo** and attach it to the
logged shot, lets manually-added shots **import a photo** from the camera roll,
and shows those photos in the log. It is the foundation for the later
databack-imprint feature.

This is iteration 1 of photo support. Databack-style settings imprinting,
multiple photos per shot, and exporting the photo *files* are explicitly deferred.

## Goals

- Pressing a shutter button on the meter captures a still and attaches it to a
  newly logged shot, with a quick-confirm step.
- Manual shots can attach/replace/remove a photo chosen from the iOS photo library.
- Each shot's photo is owned by the app (stable, survives Photos-app changes,
  deleted with the shot/roll).
- Captured photos can *optionally* also be saved to the iOS Photos library.
- No regression: the meter's ISO-lock + mismatch-warning behavior is preserved;
  React Doctor stays 100/100; the gate (`typecheck`/`lint`/`test`) stays green.

## Non-goals (deferred)

- Databack-style imprint of settings onto the image.
- More than one photo per shot.
- Including photo *files* in the JSON export (export keeps referencing the
  filename only).
- A custom in-app capture screen for manual shots (manual = library import only).

## Library stack

| Concern | Library | Notes |
| --- | --- | --- |
| Capture still | `react-native-vision-camera` (installed) | Meter `<Camera>` gains `photo={true}`; capture via the existing `cameraRef` (`useCameraMeter`). |
| Persist on device | `expo-file-system` | Copy into `documentDirectory/film-log/<id>.jpg` (app-owned source of truth). |
| Import from library | `expo-image-picker` | `launchImageLibraryAsync` for manual shots. |
| Optional "save to Photos" | `expo-media-library` | `createAssetAsync`; add-only permission; only called when the toggle is on. |
| Display | `expo-image` | Cached `Image`; also satisfies React Doctor `rn-prefer-expo-image`. |

**Build impact:** every library except vision-camera is a **new native dependency**,
so this ships as a **development build** (workflow #2 in `apps/mobile/CLAUDE.md`),
not a Metro reload. Pin versions to Expo SDK 56; install with the repo's
`minimumReleaseAge` gate in mind.

**Permissions / `app.json`:** add `NSPhotoLibraryUsageDescription` (pick) and
`NSPhotoLibraryAddUsageDescription` (save) usage strings via the relevant config
plugins; camera usage string already exists. Verify the built `Info.plist` per
the CLAUDE.md dev-build checklist.

## Data model

One **primary photo per shot**. Extend `Shot` in
`apps/mobile/src/types/film-log.ts`:

```ts
export interface ShotPhoto {
  fileName: string;   // e.g. "<id>.jpg" under documentDirectory/film-log/
  width: number;
  height: number;
  capturedAt: string; // ISO
  source: 'meter' | 'library';
}

export interface Shot {
  // …existing fields…
  photo?: ShotPhoto;
}
```

- Only this metadata is persisted in MMKV / the JSON export. The bytes live on disk.
- Add a matching `shotPhotoSchema` and wire it into `shotSchema` in
  `apps/mobile/src/schemas/film-log.schema.ts` (optional, so existing shots and
  old data still validate).
- The stored value is a bare **filename**, never an absolute path — absolute
  document-directory paths change between installs. Resolve to a full URI at read
  time (see Storage).

## Storage — `apps/mobile/src/lib/film-log-photos.ts` (new)

A small module that owns the photo files; pure-ish path helpers are unit-testable,
the FS calls are thin wrappers.

- `PHOTO_DIR = documentDirectory + 'film-log/'`; `ensurePhotoDir()` (idempotent `makeDirectoryAsync`).
- `photoUri(fileName)` → absolute URI for display/export (pure given the dir).
- `savePhoto(sourceUri, { source, width, height }): Promise<ShotPhoto>` — generate
  an id-based filename (reuse `generateId()` from `film-log-storage`), copy the
  source file into `PHOTO_DIR`, return the `ShotPhoto`.
- `deletePhotoFile(fileName)` — best-effort delete (ignore missing).

**Lifecycle hooks in `film-log-storage.ts`:** when a shot is removed
(`removeShot`), or a roll is deleted (`deleteRoll`), or a shot's photo is replaced,
delete the orphaned file via `deletePhotoFile`. `deleteRoll` must delete every
shot's photo. Keep these deletions best-effort so a missing file never blocks the
data mutation.

## Capture flow (meter) — `apps/mobile/src/screens/meter-screen.tsx`

- Replace the top-left "+ Log" pill with a **bottom-center shutter button**
  (filled white circle, thin white ring, `+` inside) — a new
  `components/meter/shutter-button.tsx`. The Matrix/Spot toggle moves into the
  readout area to make room (it currently sits just above the readout panel).
  The ISO-lock pill stays near the top.
- Press → `cameraRef.takePhoto()` → `savePhoto(...)` → open a **quick-confirm
  bottom sheet** (`components/film-log/capture-confirm-sheet.tsx`, built on the
  existing `BottomSheet`): photo thumbnail (`expo-image`), `f/8 · 1/125 · EI 400`,
  the active roll's name, and **Save** / **Edit…**.
  - **Save** → `addShot` to the active roll (settings from the solver, auto
    frame #, `source: 'meter'`, the `photo`), dismiss, stay on the meter. Fire a
    light haptic.
  - **Edit…** → navigate to the shot form prefilled with settings + the saved
    photo (pass the `fileName` so the form attaches the already-saved file).
  - If the "save to Photos" setting is on, also `createAssetAsync` (request
    add-permission lazily; failure is non-fatal — keep the in-app copy).
- **Discard / orphans:** dismissing the confirm sheet without Save (swipe down /
  a Discard control) deletes the just-captured file. For the **Edit…** path, the
  file is handed to the shot form; if the form is abandoned for a not-yet-saved
  meter shot, delete that just-captured file on cancel so it isn't orphaned.
- No active roll → the sheet prompts to start a roll (mirror the shot form's
  empty state) instead of Save.
- Extract capture orchestration into `hooks/use-meter-capture.ts` to keep
  `meter-screen.tsx` under the `no-giant-component` budget (the screen is already
  near the limit — adding capture inline would trip React Doctor, as the ISO-lock
  work did).

## Manual shots & photo management — `shot-form-screen.tsx`

- Add a **photo row**: when no photo, a "Choose from library" button
  (`expo-image-picker`); when present, the thumbnail + **Remove**. Picking copies
  the chosen asset into app storage via `savePhoto(..., source: 'library')`;
  Remove deletes the file and clears `photo`.
- On save, persist the `photo` metadata with the shot. If the user replaced an
  existing photo, delete the old file.
- The meter "Edit…" path lands here with the photo already saved and shown.

## Display

- **Roll detail** (`roll-detail-screen.tsx`): show a small leading thumbnail on
  shot rows that have a photo (`expo-image`), falling back to the current
  frame-number badge when absent.
- **Full view:** tapping a photo opens a simple full-screen viewer
  (`components/film-log/photo-viewer.tsx`) — dark backdrop, the image, a close
  control. A modal/route is fine; keep it minimal.

## Settings — `settings-screen.tsx`

- Add a **"Also save meter photos to Photos"** toggle (default **off**),
  persisted in MMKV (reuse the meter store or a small dedicated key). When off, no
  Photos write permission is ever requested.

## Files (summary)

**New**
- `src/lib/film-log-photos.ts` — photo file storage + path helpers (+ `.test.ts`).
- `src/components/meter/shutter-button.tsx`
- `src/components/film-log/capture-confirm-sheet.tsx`
- `src/components/film-log/photo-viewer.tsx`
- `src/hooks/use-meter-capture.ts`

**Modified**
- `src/types/film-log.ts`, `src/schemas/film-log.schema.ts` — `ShotPhoto`.
- `src/lib/film-log-storage.ts` — orphan-file cleanup on shot/roll delete & photo replace.
- `src/screens/meter-screen.tsx` — shutter button + capture flow (logic in the hook).
- `src/screens/film-log/shot-form-screen.tsx` — photo row.
- `src/screens/film-log/roll-detail-screen.tsx` — row thumbnails + open viewer.
- `src/screens/settings-screen.tsx` — save-to-Photos toggle.
- `app.json` — photo-library usage strings / plugins.
- `package.json` — new expo-* deps.
- `apps/mobile/CHANGELOG.md` — entry.

## Testing & verification

- **Unit (vitest, pure modules only):** `film-log-photos` path/filename helpers
  (`photoUri`, filename generation); storage cleanup logic (mock FS) — assert a
  removed shot / deleted roll / replaced photo triggers `deletePhotoFile` for the
  right filenames. Mock `expo-file-system`/`react-native` like the existing
  MMKV-mocked tests.
- **Gate:** `bun run typecheck`, `bun run lint`, `bun run test`; then
  `npx react-doctor@latest` must stay **100/100** across all four projects
  (use `expo-image`, keep `meter-screen` under the giant-component budget via the
  capture hook, no `any`, no internal package imports).
- **On device (dev build):** meter shutter → capture → quick-confirm → Save →
  photo shows in roll detail; Edit… opens the prefilled form; manual shot imports
  a library photo; remove/replace deletes the old file; delete shot/roll removes
  the file; toggle on writes a copy to Photos and asks add-permission; relaunch
  confirms persistence. Verify the built `Info.plist` carries the usage strings.

## Open risks

- vision-camera `takePhoto()` must coexist with the live metering session on the
  same `<Camera>` (`photo={true}` + the existing exposure polling). Validate early
  on device; if capture disrupts metering, fall back to a brief capture pause.
- Document-directory URIs differ across installs — always store the bare filename
  and resolve at read time, including in export.
