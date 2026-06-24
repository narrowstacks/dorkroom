# Film Log Photo Capture & Attach — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the light meter capture a reference photo (and manual shots import one) and attach it to a film-log shot, stored app-side, desaturated for B&W rolls.

**Architecture:** A new `film-log-photos` module owns photo files under `documentDirectory/film-log/` and the Skia grayscale pass; only filename + metadata live in MMKV/JSON. The meter gets a bottom-center shutter button whose capture flow is orchestrated by a `use-meter-capture` hook (keeps the screen under the size budget) and confirmed via a bottom sheet. Manual shots import from the library; roll detail shows thumbnails and a full-screen viewer.

**Tech Stack:** Expo SDK 56 / React Native 0.85 / NativeWind v4 (Tailwind v3) / MMKV / Zod / vitest. New native deps: `expo-file-system`, `expo-image-picker`, `expo-media-library`, `expo-image`, `@shopify/react-native-skia` (vision-camera already installed).

## Global Constraints

- iOS-only, dark-only, New Architecture, Expo SDK 56. Pin new deps to SDK-56-compatible versions.
- No `any`; never import internal package paths — only `@dorkroom/logic` / `@dorkroom/api`. Path alias `@/* → src/*`.
- Styling is NativeWind v4 with **Tailwind v3** syntax (no v4-only utilities). Palette: bg `#0b0b0c`, `text-white`/`text-white/60..80`, accent `bg-rose-600`, cards `rounded-2xl`/`rounded-xl`, pills `rounded-full`.
- Use `expo-image` for images (React Doctor `rn-prefer-expo-image`).
- Only **pure** modules are unit-tested (vitest, `environment: node`, native modules mocked). Camera / picker / Skia / permissions are verified **on device**. Do not write fake tests that mock native behavior to manufacture coverage.
- Vitest resolves `@/` via `vitest.config.ts` alias; mock native modules with `vi.mock(...)` (see `src/lib/tab-bar-settings.test.ts` and `src/lib/film-log-storage.test.ts` for the pattern).
- Persisted IDs are **bare filenames**, never absolute document-directory paths (paths change across installs).
- Gate after each code change set: from `apps/mobile` run `bun run typecheck`, `bun run lint`, `bun run test`; then repo-root `npx react-doctor@latest --yes --json` must stay **100/100** on all four projects. Run `bunx biome check --write --linter-enabled=false --css-linter-enabled=false .` before linting to auto-format.
- Native/config changes require a **development build** (`apps/mobile/CLAUDE.md` workflow #2), not Metro reload. Commit frequently; do not push unless asked.

---

### Task 1: Add dependencies + iOS permissions

**Files:**
- Modify: `apps/mobile/package.json` (dependencies)
- Modify: `apps/mobile/app.json` (plugins + `infoPlist`)

**Interfaces:**
- Produces: installed packages `expo-file-system`, `expo-image`, `expo-image-picker`, `expo-media-library`, `@shopify/react-native-skia`; `Info.plist` keys `NSPhotoLibraryUsageDescription`, `NSPhotoLibraryAddUsageDescription`.

- [ ] **Step 1: Install the SDK-pinned native deps**

Run (from `apps/mobile`):
```bash
bunx expo install expo-file-system expo-image expo-image-picker expo-media-library @shopify/react-native-skia
```
Expected: `package.json` gains the five deps at SDK-56-compatible versions; `bun.lock` updated. If the `minimumReleaseAge` gate blocks a fresh publish, re-run with `bun install --minimum-release-age 0` for that package only.

- [ ] **Step 2: Add iOS usage strings + picker plugin to `app.json`**

In `apps/mobile/app.json`, under `expo.ios.infoPlist` add (keep the existing `NSCameraUsageDescription`):
```json
"NSPhotoLibraryUsageDescription": "Attach a photo from your library to a shot in your film log.",
"NSPhotoLibraryAddUsageDescription": "Save photos captured with the light meter to your Photos library."
```
In `expo.plugins`, add the image-picker plugin (mirrors its photo-permission string):
```json
["expo-image-picker", { "photosPermission": "Attach a photo from your library to a shot in your film log." }]
```

- [ ] **Step 3: Produce a development build and verify the plist**

Run (from `apps/mobile`, per CLAUDE.md):
```bash
./scripts/ios.sh dev-build --no-install
unzip -o -q /tmp/dorkroom-dev.ipa "Payload/Dorkroom.app/Info.plist" -d /tmp/dr-plist
plutil -p /tmp/dr-plist/Payload/Dorkroom.app/Info.plist | grep -i "PhotoLibrary"
```
Expected: both `NSPhotoLibraryUsageDescription` and `NSPhotoLibraryAddUsageDescription` print. (If the build environment is unavailable, hand this verification to the user and note it.)

- [ ] **Step 4: Commit**
```bash
git add apps/mobile/package.json apps/mobile/app.json bun.lock
git commit -m "build(mobile): add photo deps + photo-library permissions"
```

---

### Task 2: `ShotPhoto` type + schema

**Files:**
- Modify: `apps/mobile/src/types/film-log.ts`
- Modify: `apps/mobile/src/schemas/film-log.schema.ts`
- Test: `apps/mobile/src/schemas/film-log.schema.test.ts` (create)

**Interfaces:**
- Produces: `ShotPhoto` interface; `Shot.photo?: ShotPhoto`; `shotPhotoSchema`; `shotSchema` accepts an optional `photo`.

- [ ] **Step 1: Write the failing schema test**

Create `apps/mobile/src/schemas/film-log.schema.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { shotSchema } from './film-log.schema';

const baseShot = { id: 's1', frameNumber: 1, source: 'meter' as const };

describe('shotSchema photo', () => {
  it('accepts a shot with no photo', () => {
    expect(shotSchema.safeParse(baseShot).success).toBe(true);
  });

  it('accepts a valid photo', () => {
    const shot = {
      ...baseShot,
      photo: {
        fileName: 'abc.jpg',
        width: 4032,
        height: 3024,
        capturedAt: '2026-06-24T00:00:00.000Z',
        source: 'meter',
        grayscale: true,
      },
    };
    expect(shotSchema.safeParse(shot).success).toBe(true);
  });

  it('rejects a photo missing fileName', () => {
    const shot = { ...baseShot, photo: { width: 1, height: 1, capturedAt: 'x', source: 'meter' } };
    expect(shotSchema.safeParse(shot).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test:unit film-log.schema` (or `cd apps/mobile && bunx vitest run src/schemas/film-log.schema.test.ts`)
Expected: FAIL — `photo` is currently stripped/ignored, so the "rejects … missing fileName" case fails (a bad photo is accepted).

- [ ] **Step 3: Add the type**

In `apps/mobile/src/types/film-log.ts`, above `interface Shot`, add:
```ts
export interface ShotPhoto {
  /** Bare filename under documentDirectory/film-log/ — never an absolute path. */
  fileName: string;
  width: number;
  height: number;
  capturedAt: string;
  source: 'meter' | 'library';
  /** True when the stored file was desaturated for a B&W roll. */
  grayscale?: boolean;
}
```
Then inside `interface Shot`, add the field (after `shutterSpeed`):
```ts
  photo?: ShotPhoto;
```

- [ ] **Step 4: Add the schema**

In `apps/mobile/src/schemas/film-log.schema.ts`, before `shotSchema`, add:
```ts
export const shotPhotoSchema = z.object({
  fileName: z.string(),
  width: z.number(),
  height: z.number(),
  capturedAt: z.string(),
  source: z.enum(['meter', 'library']),
  grayscale: z.boolean().optional(),
});
```
Inside `shotSchema`'s object, add (after `shutterSpeed`):
```ts
  photo: shotPhotoSchema.optional(),
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd apps/mobile && bunx vitest run src/schemas/film-log.schema.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**
```bash
git add apps/mobile/src/types/film-log.ts apps/mobile/src/schemas/film-log.schema.ts apps/mobile/src/schemas/film-log.schema.test.ts
git commit -m "feat(mobile): ShotPhoto type + schema"
```

---

### Task 3: `film-log-photos` storage module

**Files:**
- Create: `apps/mobile/src/lib/film-log-photos.ts`
- Test: `apps/mobile/src/lib/film-log-photos.test.ts`

**Interfaces:**
- Consumes: `generateId` from `@/lib/film-log-storage`; `ShotPhoto`, `FilmProcess` from `@/types/film-log`.
- Produces:
  - `PHOTO_DIR: string`
  - `photoUri(fileName: string): string`
  - `shouldGrayscale(process: FilmProcess): boolean`
  - `ensurePhotoDir(): Promise<void>`
  - `toGrayscale(sourceUri: string): Promise<string>` (returns a new file uri)
  - `savePhoto(sourceUri: string, opts: { source: 'meter' | 'library'; width: number; height: number; grayscale: boolean }): Promise<ShotPhoto>`
  - `deletePhotoFile(fileName: string): Promise<void>`

- [ ] **Step 1: Write the failing test for the pure helpers**

Create `apps/mobile/src/lib/film-log-photos.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-file-system', () => ({
  documentDirectory: 'file:///docs/',
  makeDirectoryAsync: vi.fn(async () => {}),
  copyAsync: vi.fn(async () => {}),
  deleteAsync: vi.fn(async () => {}),
  getInfoAsync: vi.fn(async () => ({ exists: false })),
}));
vi.mock('@shopify/react-native-skia', () => ({ Skia: {} }));

import { photoUri, PHOTO_DIR, shouldGrayscale } from './film-log-photos';

describe('film-log-photos helpers', () => {
  it('PHOTO_DIR is under the document directory', () => {
    expect(PHOTO_DIR).toBe('file:///docs/film-log/');
  });

  it('photoUri joins the dir and filename', () => {
    expect(photoUri('abc.jpg')).toBe('file:///docs/film-log/abc.jpg');
  });

  it('shouldGrayscale only for bw', () => {
    expect(shouldGrayscale('bw')).toBe(true);
    expect(shouldGrayscale('color')).toBe(false);
    expect(shouldGrayscale('slide')).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/mobile && bunx vitest run src/lib/film-log-photos.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the module**

Create `apps/mobile/src/lib/film-log-photos.ts`:
```ts
// Owns the on-disk photo files for film-log shots. Files live under
// documentDirectory/film-log/; callers store only the bare filename. The Skia
// grayscale pass is isolated in toGrayscale so the rest stays Skia-free and the
// later databack imprint can reuse the same plumbing.
import { ImageFormat, Skia } from '@shopify/react-native-skia';
import * as FileSystem from 'expo-file-system';
import { generateId } from '@/lib/film-log-storage';
import type { FilmProcess, ShotPhoto } from '@/types/film-log';

export const PHOTO_DIR = `${FileSystem.documentDirectory}film-log/`;

export function photoUri(fileName: string): string {
  return `${PHOTO_DIR}${fileName}`;
}

export function shouldGrayscale(process: FilmProcess): boolean {
  return process === 'bw';
}

export async function ensurePhotoDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(PHOTO_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PHOTO_DIR, { intermediates: true });
  }
}

// Luminance grayscale (Rec. 601) color matrix.
const GRAYSCALE_MATRIX = [
  0.299, 0.587, 0.114, 0, 0, 0.299, 0.587, 0.114, 0, 0, 0.299, 0.587, 0.114, 0,
  0, 0, 0, 0, 1, 0,
];

/** Desaturate the image at sourceUri and write a new temp JPEG; returns its uri. */
export async function toGrayscale(sourceUri: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(sourceUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const data = Skia.Data.fromBase64(base64);
  const image = Skia.Image.MakeImageFromEncoded(data);
  if (!image) throw new Error('Could not decode image for grayscale');
  const width = image.width();
  const height = image.height();
  const surface = Skia.Surface.MakeOffscreen(width, height);
  if (!surface) throw new Error('Could not create Skia surface');
  const paint = Skia.Paint();
  paint.setColorFilter(Skia.ColorFilter.MakeMatrix(GRAYSCALE_MATRIX));
  surface.getCanvas().drawImage(image, 0, 0, paint);
  surface.flush();
  const snapshot = surface.makeImageSnapshot();
  const outBase64 = snapshot.encodeToBase64(ImageFormat.JPEG, 90);
  const outUri = `${FileSystem.cacheDirectory}grayscale-${generateId()}.jpg`;
  await FileSystem.writeAsStringAsync(outUri, outBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return outUri;
}

export async function savePhoto(
  sourceUri: string,
  opts: {
    source: 'meter' | 'library';
    width: number;
    height: number;
    grayscale: boolean;
  }
): Promise<ShotPhoto> {
  await ensurePhotoDir();
  const fileName = `${generateId()}.jpg`;
  const dest = photoUri(fileName);
  const from = opts.grayscale ? await toGrayscale(sourceUri) : sourceUri;
  await FileSystem.copyAsync({ from, to: dest });
  return {
    fileName,
    width: opts.width,
    height: opts.height,
    capturedAt: new Date().toISOString(),
    source: opts.source,
    grayscale: opts.grayscale,
  };
}

export async function deletePhotoFile(fileName: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(photoUri(fileName), { idempotent: true });
  } catch {
    // Best-effort; a missing file must never block a data mutation.
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/mobile && bunx vitest run src/lib/film-log-photos.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Typecheck**

Run: `cd apps/mobile && bun run typecheck`
Expected: no errors. (If `EncodingType`/`Skia` API names differ in the installed Skia/file-system version, consult Context7 for `@shopify/react-native-skia` and `expo-file-system` and adjust — the test mocks insulate the unit test, so device verification in Task 8/10 is the real check.)

- [ ] **Step 6: Commit**
```bash
git add apps/mobile/src/lib/film-log-photos.ts apps/mobile/src/lib/film-log-photos.test.ts
git commit -m "feat(mobile): film-log photo storage + grayscale module"
```

---

### Task 4: Delete orphan photo files on shot/roll delete & replace

**Files:**
- Modify: `apps/mobile/src/lib/film-log-storage.ts`
- Test: `apps/mobile/src/lib/film-log-storage.test.ts` (extend)

**Interfaces:**
- Consumes: `deletePhotoFile` from `@/lib/film-log-photos`.
- Produces: `removeShot`, `deleteRoll`, and a new `setShotPhoto(rollId, shotId, photo)` all delete the orphaned file(s).

- [ ] **Step 1: Write the failing test**

In `apps/mobile/src/lib/film-log-storage.test.ts`, add the mock near the top (with the existing `react-native-mmkv` mock) and new tests. Add this mock above the imports:
```ts
const deleted: string[] = [];
vi.mock('@/lib/film-log-photos', () => ({
  deletePhotoFile: vi.fn(async (f: string) => void deleted.push(f)),
}));
```
Add `setShotPhoto` to the import from `./film-log-storage`, and add tests inside the main `describe` (reset `deleted` in `beforeEach` via `deleted.length = 0`):
```ts
it('deletes the photo file when a shot with a photo is removed', () => {
  const roll = newRoll();
  const shot = addShot(roll.id, { frameNumber: 1, source: 'manual' });
  if (shot) setShotPhoto(roll.id, shot.id, {
    fileName: 'p1.jpg', width: 1, height: 1, capturedAt: 'x', source: 'library',
  });
  if (shot) removeShot(roll.id, shot.id);
  expect(deleted).toContain('p1.jpg');
});

it('deletes all shot photos when a roll is deleted', () => {
  const roll = newRoll();
  const shot = addShot(roll.id, { frameNumber: 1, source: 'manual' });
  if (shot) setShotPhoto(roll.id, shot.id, {
    fileName: 'p2.jpg', width: 1, height: 1, capturedAt: 'x', source: 'library',
  });
  deleteRoll(roll.id);
  expect(deleted).toContain('p2.jpg');
});

it('deletes the old file when a shot photo is replaced', () => {
  const roll = newRoll();
  const shot = addShot(roll.id, { frameNumber: 1, source: 'manual' });
  if (shot) setShotPhoto(roll.id, shot.id, {
    fileName: 'old.jpg', width: 1, height: 1, capturedAt: 'x', source: 'library',
  });
  if (shot) setShotPhoto(roll.id, shot.id, {
    fileName: 'new.jpg', width: 1, height: 1, capturedAt: 'x', source: 'library',
  });
  expect(deleted).toContain('old.jpg');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/mobile && bunx vitest run src/lib/film-log-storage.test.ts`
Expected: FAIL — `setShotPhoto` is not exported; deletions don't happen.

- [ ] **Step 3: Implement cleanup**

In `apps/mobile/src/lib/film-log-storage.ts`, add the import near the top:
```ts
import { deletePhotoFile } from '@/lib/film-log-photos';
```
Add `ShotPhoto` to the existing `@/types/film-log` import. Add a helper and `setShotPhoto`, and call `deletePhotoFile` in `removeShot`/`deleteRoll`:
```ts
export function setShotPhoto(
  rollId: string,
  shotId: string,
  photo: ShotPhoto
): void {
  const prev = getRolls()
    .find((r) => r.id === rollId)
    ?.shots.find((s) => s.id === shotId)?.photo;
  if (prev && prev.fileName !== photo.fileName) {
    void deletePhotoFile(prev.fileName);
  }
  updateShot(rollId, shotId, { photo });
}
```
In `removeShot`, before filtering, capture the photo and delete it:
```ts
export function removeShot(rollId: string, shotId: string): void {
  const photo = getRolls()
    .find((r) => r.id === rollId)
    ?.shots.find((s) => s.id === shotId)?.photo;
  if (photo) void deletePhotoFile(photo.fileName);
  setRolls(
    getRolls().map((roll) => /* …existing body… */)
  );
}
```
In `deleteRoll`, delete every shot's photo first:
```ts
export function deleteRoll(id: string): void {
  const roll = getRolls().find((r) => r.id === id);
  roll?.shots.forEach((s) => {
    if (s.photo) void deletePhotoFile(s.photo.fileName);
  });
  setRolls(getRolls().filter((roll) => roll.id !== id));
}
```
(Confirm `updateShot` already accepts a `photo` patch — it takes `Partial<Omit<Shot, 'id'>>`, so it does.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/mobile && bunx vitest run src/lib/film-log-storage.test.ts`
Expected: PASS (existing + 3 new).

- [ ] **Step 5: Commit**
```bash
git add apps/mobile/src/lib/film-log-storage.ts apps/mobile/src/lib/film-log-storage.test.ts
git commit -m "feat(mobile): delete orphaned photo files on shot/roll delete & replace"
```

---

### Task 5: Shutter button component

**Files:**
- Create: `apps/mobile/src/components/meter/shutter-button.tsx`

**Interfaces:**
- Produces: `ShutterButton({ onPress }: { onPress: () => void })` — a 64px shutter (white core, thin ring, `+`).

- [ ] **Step 1: Implement the component**

Create `apps/mobile/src/components/meter/shutter-button.tsx`:
```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface ShutterButtonProps {
  onPress: () => void;
}

/** Camera-style shutter: filled white core, thin white ring, a + inside. */
export function ShutterButton({ onPress }: ShutterButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Capture a photo and log a shot"
      style={({ pressed }) => [styles.ring, pressed && styles.pressed]}
    >
      <View style={styles.core}>
        <Text style={styles.plus}>+</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ring: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  pressed: { opacity: 0.7 },
  core: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plus: { color: '#0b0b0c', fontSize: 28, fontWeight: '300', lineHeight: 30 },
});
```

- [ ] **Step 2: Gate (typecheck + lint)**

Run: `cd apps/mobile && bun run typecheck && bunx biome check --write --linter-enabled=false --css-linter-enabled=false . && bun run lint`
Expected: clean.

- [ ] **Step 3: Commit**
```bash
git add apps/mobile/src/components/meter/shutter-button.tsx
git commit -m "feat(mobile): meter shutter button component"
```

---

### Task 6: Capture-confirm bottom sheet

**Files:**
- Create: `apps/mobile/src/components/film-log/capture-confirm-sheet.tsx`

**Interfaces:**
- Consumes: `BottomSheet` from `@/components/bottom-sheet`; `photoUri` from `@/lib/film-log-photos`; `formatAperture`, `formatShutterSpeed` from `@dorkroom/logic`; `expo-image`.
- Produces: `CaptureConfirmSheet({ visible, photo, aperture, shutterSpeed, iso, rollName, onSave, onEdit, onDiscard })` where `photo: ShotPhoto`.

- [ ] **Step 1: Implement the component**

Create `apps/mobile/src/components/film-log/capture-confirm-sheet.tsx`:
```tsx
import { formatAperture, formatShutterSpeed } from '@dorkroom/logic';
import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';
import { BottomSheet } from '@/components/bottom-sheet';
import { photoUri } from '@/lib/film-log-photos';
import type { ShotPhoto } from '@/types/film-log';

interface CaptureConfirmSheetProps {
  visible: boolean;
  photo: ShotPhoto;
  aperture: number;
  shutterSpeed: number;
  iso: number;
  rollName: string;
  onSave: () => void;
  onEdit: () => void;
  onDiscard: () => void;
}

export function CaptureConfirmSheet({
  visible,
  photo,
  aperture,
  shutterSpeed,
  iso,
  rollName,
  onSave,
  onEdit,
  onDiscard,
}: CaptureConfirmSheetProps) {
  return (
    <BottomSheet visible={visible} title="Log this shot" onClose={onDiscard}>
      <View className="gap-4">
        <View className="flex-row gap-3">
          <Image
            source={{ uri: photoUri(photo.fileName) }}
            style={{ width: 72, height: 96, borderRadius: 10 }}
            contentFit="cover"
          />
          <View className="flex-1 justify-center gap-1">
            <Text className="text-base text-white">
              {formatAperture(aperture)} · {formatShutterSpeed(shutterSpeed)} · EI {iso}
            </Text>
            <Text className="text-sm text-white/60">Roll: {rollName}</Text>
            {photo.grayscale ? (
              <Text className="text-xs text-white/40">Saved in B&amp;W</Text>
            ) : null}
          </View>
        </View>
        <View className="flex-row gap-3">
          <Pressable
            onPress={onEdit}
            accessibilityRole="button"
            className="flex-1 items-center rounded-xl bg-white/10 px-4 py-3"
          >
            <Text className="text-base text-white">Edit…</Text>
          </Pressable>
          <Pressable
            onPress={onSave}
            accessibilityRole="button"
            className="flex-1 items-center rounded-xl bg-rose-600 px-4 py-3"
          >
            <Text className="text-base font-semibold text-white">Save</Text>
          </Pressable>
        </View>
      </View>
    </BottomSheet>
  );
}
```

- [ ] **Step 2: Gate (typecheck + lint)**

Run: `cd apps/mobile && bun run typecheck && bunx biome check --write --linter-enabled=false --css-linter-enabled=false . && bun run lint`
Expected: clean.

- [ ] **Step 3: Commit**
```bash
git add apps/mobile/src/components/film-log/capture-confirm-sheet.tsx
git commit -m "feat(mobile): capture-confirm bottom sheet"
```

---

### Task 7: `use-meter-capture` hook

**Files:**
- Create: `apps/mobile/src/hooks/use-meter-capture.ts`

**Interfaces:**
- Consumes: `CameraRef` (from `react-native-vision-camera`) via a passed ref; `useRolls` from `@/hooks/use-film-log`; `savePhoto`, `shouldGrayscale`, `deletePhotoFile` from `@/lib/film-log-photos`; `addShot` from `@/lib/film-log-storage`; `getSaveMeterPhotosToLibrary` from `@/lib/photo-settings` (Task 12); `expo-media-library`.
- Produces:
  ```ts
  interface MeterCapture {
    pending: { photo: ShotPhoto; aperture: number; shutterSpeed: number; iso: number } | null;
    activeRollId: string | undefined;
    activeRollName: string;
    capture(settings: { aperture: number; shutterSpeed: number; iso: number }): Promise<void>;
    save(): void;
    discard(): void;
    consumeForEdit(): string | null; // returns the fileName, clears pending without deleting
  }
  function useMeterCapture(cameraRef: RefObject<CameraRef | null>): MeterCapture
  ```

- [ ] **Step 1: Implement the hook**

Create `apps/mobile/src/hooks/use-meter-capture.ts`:
```ts
import { type RefObject, useCallback, useMemo, useState } from 'react';
import * as MediaLibrary from 'expo-media-library';
import type { CameraRef } from 'react-native-vision-camera';
import { useRolls } from '@/hooks/use-film-log';
import {
  deletePhotoFile,
  photoUri,
  savePhoto,
  shouldGrayscale,
} from '@/lib/film-log-photos';
import { addShot } from '@/lib/film-log-storage';
import { getSaveMeterPhotosToLibrary } from '@/lib/photo-settings';
import type { ShotPhoto } from '@/types/film-log';

interface Pending {
  photo: ShotPhoto;
  aperture: number;
  shutterSpeed: number;
  iso: number;
}

export function useMeterCapture(cameraRef: RefObject<CameraRef | null>) {
  const rolls = useRolls();
  const activeRoll = useMemo(
    () => rolls.find((r) => r.status === 'active'),
    [rolls]
  );
  const [pending, setPending] = useState<Pending | null>(null);

  const capture = useCallback(
    async (settings: { aperture: number; shutterSpeed: number; iso: number }) => {
      const camera = cameraRef.current;
      if (!camera || !activeRoll) return;
      const file = await camera.takePhoto();
      // vision-camera returns a path without the file:// scheme.
      const sourceUri = file.path.startsWith('file://')
        ? file.path
        : `file://${file.path}`;
      const photo = await savePhoto(sourceUri, {
        source: 'meter',
        width: file.width,
        height: file.height,
        grayscale: shouldGrayscale(activeRoll.process),
      });
      if (getSaveMeterPhotosToLibrary()) {
        try {
          const perm = await MediaLibrary.requestPermissionsAsync(true);
          if (perm.granted) await MediaLibrary.createAssetAsync(photoUri(photo.fileName));
        } catch {
          // non-fatal: keep the in-app copy
        }
      }
      setPending({ photo, ...settings });
    },
    [activeRoll, cameraRef]
  );

  const save = useCallback(() => {
    if (!pending || !activeRoll) return;
    addShot(activeRoll.id, {
      frameNumber:
        activeRoll.shots.reduce((m, s) => Math.max(m, s.frameNumber), 0) + 1,
      aperture: pending.aperture,
      shutterSpeed: pending.shutterSpeed,
      source: 'meter',
      photo: pending.photo,
      takenAt: new Date().toISOString(),
    });
    setPending(null);
  }, [pending, activeRoll]);

  const discard = useCallback(() => {
    if (pending) void deletePhotoFile(pending.photo.fileName);
    setPending(null);
  }, [pending]);

  const consumeForEdit = useCallback((): string | null => {
    const f = pending?.photo.fileName ?? null;
    setPending(null); // keep the file; the shot form owns it now
    return f;
  }, [pending]);

  return {
    pending,
    activeRollId: activeRoll?.id,
    activeRollName: activeRoll?.name?.trim()
      ? activeRoll.name
      : (activeRoll?.filmStockName ?? 'roll'),
    capture,
    save,
    discard,
    consumeForEdit,
  };
}
```

- [ ] **Step 2: Gate (typecheck only — depends on Task 12's `photo-settings`)**

If implementing in order, create `photo-settings.ts` now as a stub or do Task 12 before this step's typecheck. Minimal stub to unblock (final version in Task 12) — create `apps/mobile/src/lib/photo-settings.ts`:
```ts
import { meterStorage } from '@/lib/meter-settings';
const KEY = 'saveMeterPhotosToLibrary';
export function getSaveMeterPhotosToLibrary(): boolean {
  return meterStorage.getBoolean(KEY) ?? false;
}
export function setSaveMeterPhotosToLibrary(value: boolean): void {
  meterStorage.set(KEY, value);
}
export const SAVE_METER_PHOTOS_KEY = KEY;
```
Run: `cd apps/mobile && bun run typecheck`
Expected: clean.

- [ ] **Step 3: Commit**
```bash
git add apps/mobile/src/hooks/use-meter-capture.ts apps/mobile/src/lib/photo-settings.ts
git commit -m "feat(mobile): meter capture orchestration hook"
```

---

### Task 8: Wire shutter + capture into the meter screen

**Files:**
- Modify: `apps/mobile/src/screens/meter-screen.tsx`

**Interfaces:**
- Consumes: `ShutterButton`, `CaptureConfirmSheet`, `useMeterCapture`.

- [ ] **Step 1: Replace the "+ Log" pill with the shutter + capture wiring**

In `apps/mobile/src/screens/meter-screen.tsx`:
1. Add imports:
```ts
import { ShutterButton } from '@/components/meter/shutter-button';
import { CaptureConfirmSheet } from '@/components/film-log/capture-confirm-sheet';
import { useMeterCapture } from '@/hooks/use-meter-capture';
```
2. Add `photo={true}` to the `<Camera>` element so stills can be taken.
3. After the `useMeterCapture` call: `const capture = useMeterCapture(meter.cameraRef);`
4. Remove the top-left "+ Log" `<Pressable>` from the `topStrip` (keep the ISO-lock pill and the calibration stepper). The `topLeftGroup` now holds only the ISO-lock pill.
5. Add a bottom-center shutter, above the existing bottom stack. Place it absolutely; on press call `capture.capture({ aperture: fields.aperture.value, shutterSpeed: fields.shutter.value, iso: solver.iso })`:
```tsx
<View pointerEvents="box-none" style={[styles.shutterWrap, { bottom: insets.bottom + TAB_BAR_CLEARANCE + 96 }]}>
  <ShutterButton onPress={() => void capture.capture({
    aperture: fields.aperture.value,
    shutterSpeed: fields.shutter.value,
    iso: solver.iso,
  })} />
</View>
```
6. Move the Matrix/Spot `SegmentedPill` so it no longer collides with the bottom-center shutter (per design option A, the toggle moves into/just above the readout — adjust the existing `bottomStack` layout so the shutter sits clear of it).
7. Render the confirm sheet near the end of the returned tree:
```tsx
{capture.pending ? (
  <CaptureConfirmSheet
    visible
    photo={capture.pending.photo}
    aperture={capture.pending.aperture}
    shutterSpeed={capture.pending.shutterSpeed}
    iso={capture.pending.iso}
    rollName={capture.activeRollName}
    onSave={capture.save}
    onDiscard={capture.discard}
    onEdit={() => {
      const fileName = capture.consumeForEdit();
      if (fileName) router.push(`/film-log/shot?source=meter&photo=${fileName}&aperture=${capture.pending?.aperture}&shutter=${capture.pending?.shutterSpeed}&meteredIso=${solver.iso}`);
    }}
  />
) : null}
```
(Capture the `pending` values into locals before `consumeForEdit` clears them, to avoid the null-after-clear race — read `capture.pending` into a const at the top of `onEdit`.)
8. Add styles: `shutterWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' }`.

- [ ] **Step 2: Gate**

Run: `cd apps/mobile && bun run typecheck && bunx biome check --write --linter-enabled=false --css-linter-enabled=false . && bun run lint`
Expected: clean. Then repo root: `npx react-doctor@latest --yes --json` → confirm `meter-screen.tsx` is **not** flagged `no-giant-component` (the capture logic lives in the hook). If flagged, move more of the JSX (e.g., the confirm-sheet block) into a small subcomponent.

- [ ] **Step 3: Device verification**

Dev build + run (`./scripts/ios.sh dev-build` then launch). With one active roll: tap the shutter → confirm a still is captured and the sheet shows the thumbnail + settings → **Save** adds a shot to the roll and returns to the meter → the shot appears in roll detail. Confirm metering still works after a capture (EV keeps updating). Capture on a **B&W** roll → the saved/displayed photo is grayscale.

- [ ] **Step 4: Commit**
```bash
git add apps/mobile/src/screens/meter-screen.tsx
git commit -m "feat(mobile): meter shutter capture + confirm sheet"
```

---

### Task 9: Full-screen photo viewer

**Files:**
- Create: `apps/mobile/src/components/film-log/photo-viewer.tsx`

**Interfaces:**
- Produces: `PhotoViewer({ visible, fileName, onClose })`.

- [ ] **Step 1: Implement**

Create `apps/mobile/src/components/film-log/photo-viewer.tsx`:
```tsx
import { Image } from 'expo-image';
import { Modal, Pressable, Text, View } from 'react-native';
import { photoUri } from '@/lib/film-log-photos';

interface PhotoViewerProps {
  visible: boolean;
  fileName: string | null;
  onClose: () => void;
}

export function PhotoViewer({ visible, fileName, onClose }: PhotoViewerProps) {
  return (
    <Modal visible={visible && !!fileName} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} accessibilityRole="button" className="flex-1 items-center justify-center bg-black/95">
        {fileName ? (
          <Image
            source={{ uri: photoUri(fileName) }}
            style={{ width: '100%', height: '80%' }}
            contentFit="contain"
          />
        ) : null}
        <Text className="absolute right-5 top-14 text-base font-semibold text-white">Close</Text>
      </Pressable>
    </Modal>
  );
}
```

- [ ] **Step 2: Gate (typecheck + lint)** — `cd apps/mobile && bun run typecheck && bunx biome check --write --linter-enabled=false --css-linter-enabled=false . && bun run lint`. Expected: clean.

- [ ] **Step 3: Commit**
```bash
git add apps/mobile/src/components/film-log/photo-viewer.tsx
git commit -m "feat(mobile): full-screen photo viewer"
```

---

### Task 10: Photo row on the shot form (import / replace / remove / meter-edit)

**Files:**
- Modify: `apps/mobile/src/screens/film-log/shot-form-screen.tsx`

**Interfaces:**
- Consumes: `expo-image-picker`; `savePhoto`, `shouldGrayscale`, `deletePhotoFile`, `photoUri` from `@/lib/film-log-photos`; `setShotPhoto` from `@/lib/film-log-storage`; `expo-image`; `PhotoViewer`.

- [ ] **Step 1: Add photo state + the picker + persistence**

In `apps/mobile/src/screens/film-log/shot-form-screen.tsx`:
1. Read `photo` param: add `photo?: string;` to the `useLocalSearchParams` generic (the meter Edit… passes a saved `fileName`).
2. Add to the `useFormState` initial object: `photo: existing?.photo ?? (params.photo ? { fileName: params.photo, width: 0, height: 0, capturedAt: new Date().toISOString(), source: 'meter' as const } : undefined),` (typed `as ShotPhoto | undefined`).
3. Add an image-picker handler:
```ts
const onChoosePhoto = async () => {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 1 });
  if (res.canceled || !res.assets[0]) return;
  const a = res.assets[0];
  const saved = await savePhoto(a.uri, {
    source: 'library',
    width: a.width ?? 0,
    height: a.height ?? 0,
    grayscale: shouldGrayscale(roll?.process ?? 'color'),
  });
  set('photo', saved);
};
const onRemovePhoto = () => {
  if (form.photo) void deletePhotoFile(form.photo.fileName);
  set('photo', undefined);
};
```
4. In `onSave`, persist via `setShotPhoto` when a photo exists, else keep `updateShot/addShot` as-is. Simplest: include `photo: form.photo` in the `fields` object (it's part of `Shot`), and on edit, if the photo changed, call `setShotPhoto` so the old file is cleaned up. Since `addShot`/`updateShot` already write the whole shot, set `photo: form.photo` in `fields`; for **replace cleanup on an existing shot**, after building `fields`, if `existing?.photo && existing.photo.fileName !== form.photo?.fileName` then `void deletePhotoFile(existing.photo.fileName)`.
5. Render a photo row inside the form card (after Notes):
```tsx
<View className="gap-2">
  <Text className="text-sm text-white/60">Photo</Text>
  {form.photo ? (
    <View className="flex-row items-center gap-3">
      <Image source={{ uri: photoUri(form.photo.fileName) }} style={{ width: 64, height: 84, borderRadius: 8 }} contentFit="cover" />
      <Pressable onPress={onRemovePhoto} accessibilityRole="button" className="rounded-xl bg-white/10 px-4 py-3">
        <Text className="text-base text-rose-400">Remove</Text>
      </Pressable>
    </View>
  ) : (
    <Pressable onPress={() => void onChoosePhoto()} accessibilityRole="button" className="items-center rounded-xl bg-white/10 px-4 py-3">
      <Text className="text-base text-white">Choose from library</Text>
    </Pressable>
  )}
</View>
```
6. Imports: `import * as ImagePicker from 'expo-image-picker';`, `import { Image } from 'expo-image';`, the photo helpers, `setShotPhoto`, and `ShotPhoto` type.
7. **Orphan cleanup for an abandoned meter capture:** when the form was opened from the meter Edit… path (`params.photo` set) for a brand-new shot and the user leaves without saving, the just-captured file would be orphaned. Add a saved-flag ref set true in `onSave`, and delete the meter-captured file on unmount if it was never saved:
```ts
import { useEffect, useRef } from 'react';
// …
const savedRef = useRef(false);
// in onSave(): savedRef.current = true;  (set before router.back())
useEffect(() => {
  const meterFile = params.photo;
  return () => {
    // Only clean up a fresh meter capture that was never saved and never replaced.
    if (meterFile && !savedRef.current && !existing) {
      void deletePhotoFile(meterFile);
    }
  };
}, [params.photo, existing]);
```
(If the user picked a different library photo before leaving, that replacement is still cleaned via the replace logic in step 4; the `meterFile` guard only targets the original meter capture.)

- [ ] **Step 2: Gate**

Run: `cd apps/mobile && bun run typecheck && bunx biome check --write --linter-enabled=false --css-linter-enabled=false . && bun run lint`. Expected: clean. React Doctor: confirm `shot-form-screen.tsx` not flagged `no-giant-component`; if it is, extract the photo row into `components/film-log/shot-photo-row.tsx`.

- [ ] **Step 3: Device verification**

Manual shot → Choose from library → photo attaches (grayscale on a B&W roll) → Save → shows in roll detail. Replace then Save → old file gone. Remove → cleared. Meter **Edit…** → form opens with the captured photo already shown.

- [ ] **Step 4: Commit**
```bash
git add apps/mobile/src/screens/film-log/shot-form-screen.tsx
git commit -m "feat(mobile): attach/import/remove shot photo on the shot form"
```

---

### Task 11: Thumbnails + viewer in roll detail

**Files:**
- Modify: `apps/mobile/src/screens/film-log/roll-detail-screen.tsx`

- [ ] **Step 1: Add a thumbnail to shot rows and open the viewer on tap**

In `apps/mobile/src/screens/film-log/roll-detail-screen.tsx`:
1. Imports: `import { Image } from 'expo-image';`, `import { useState } from 'react';`, `import { PhotoViewer } from '@/components/film-log/photo-viewer';`, `import { photoUri } from '@/lib/film-log-photos';`.
2. Add `const [viewerFile, setViewerFile] = useState<string | null>(null);`.
3. In `renderShot`, before the frame-number badge, render the thumbnail when present (tap opens the viewer, stopping row navigation):
```tsx
{item.photo ? (
  <Pressable onPress={() => setViewerFile(item.photo!.fileName)} accessibilityRole="imagebutton" accessibilityLabel="View photo">
    <Image source={{ uri: photoUri(item.photo.fileName) }} style={{ width: 40, height: 54, borderRadius: 6 }} contentFit="cover" />
  </Pressable>
) : (
  <Text className="w-10 text-lg font-semibold text-rose-400">#{item.frameNumber}</Text>
)}
```
(Keep the frame number visible elsewhere in the row when the thumbnail replaces the badge — e.g. prefix the exposure line with `#{item.frameNumber} · `.) Add `item.photo` to the `renderShot` `useCallback` deps if referenced via closure (it's from `item`, so no dep change needed).
4. Render `<PhotoViewer visible={!!viewerFile} fileName={viewerFile} onClose={() => setViewerFile(null)} />` before the closing `</View>`.

- [ ] **Step 2: Gate** — `cd apps/mobile && bun run typecheck && bunx biome check --write --linter-enabled=false --css-linter-enabled=false . && bun run lint`. Expected: clean; React Doctor 100.

- [ ] **Step 3: Device verification** — roll detail shows thumbnails for shots with photos; tap opens the full-screen viewer; close returns.

- [ ] **Step 4: Commit**
```bash
git add apps/mobile/src/screens/film-log/roll-detail-screen.tsx
git commit -m "feat(mobile): shot photo thumbnails + viewer in roll detail"
```

---

### Task 12: "Save to Photos" setting

**Files:**
- Modify: `apps/mobile/src/lib/photo-settings.ts` (finalize from Task 7 stub)
- Modify: `apps/mobile/src/screens/settings-screen.tsx`
- Test: `apps/mobile/src/lib/photo-settings.test.ts` (create)

**Interfaces:**
- Produces: `getSaveMeterPhotosToLibrary()`, `setSaveMeterPhotosToLibrary(boolean)`, `SAVE_METER_PHOTOS_KEY`.

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/src/lib/photo-settings.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, boolean>();
vi.mock('@/lib/meter-settings', () => ({
  meterStorage: {
    getBoolean: (k: string) => store.get(k),
    set: (k: string, v: boolean) => void store.set(k, v),
  },
}));

import {
  getSaveMeterPhotosToLibrary,
  setSaveMeterPhotosToLibrary,
} from './photo-settings';

describe('photo-settings', () => {
  beforeEach(() => store.clear());
  it('defaults to false', () => {
    expect(getSaveMeterPhotosToLibrary()).toBe(false);
  });
  it('round-trips true', () => {
    setSaveMeterPhotosToLibrary(true);
    expect(getSaveMeterPhotosToLibrary()).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `cd apps/mobile && bunx vitest run src/lib/photo-settings.test.ts`. Expected: FAIL if the Task 7 stub doesn't exist yet; otherwise PASS (then this step just confirms coverage). Ensure `photo-settings.ts` matches the Task 7 stub exactly.

- [ ] **Step 3: Add a reactive hook + the settings toggle**

Append to `apps/mobile/src/lib/photo-settings.ts`:
```ts
import { useMMKVBoolean } from 'react-native-mmkv';
import { meterStorage } from '@/lib/meter-settings';

export function useSaveMeterPhotosToLibrary() {
  const [raw, setRaw] = useMMKVBoolean(SAVE_METER_PHOTOS_KEY, meterStorage);
  return [raw ?? false, (v: boolean) => setRaw(v)] as const;
}
```
In `apps/mobile/src/screens/settings-screen.tsx`, add a card with a `ToggleRow` (import `ToggleRow` from `@/components/toggle-row` and the hook):
```tsx
const [savePhotos, setSavePhotos] = useSaveMeterPhotosToLibrary();
// …inside <Screen>, add:
<GlassCard>
  <ToggleRow
    label="Also save meter photos to Photos"
    value={savePhotos}
    onChange={setSavePhotos}
  />
</GlassCard>
```

- [ ] **Step 4: Run tests + gate** — `cd apps/mobile && bunx vitest run src/lib/photo-settings.test.ts && bun run typecheck && bunx biome check --write --linter-enabled=false --css-linter-enabled=false . && bun run lint`. Expected: PASS / clean.

- [ ] **Step 5: Device verification** — toggle on → capture a meter photo → it appears in the iOS Photos app (add-permission prompt shown once); toggle off → captures stay app-only.

- [ ] **Step 6: Commit**
```bash
git add apps/mobile/src/lib/photo-settings.ts apps/mobile/src/lib/photo-settings.test.ts apps/mobile/src/screens/settings-screen.tsx
git commit -m "feat(mobile): save-to-Photos setting for meter captures"
```

---

### Task 13: Changelog + full verification

**Files:**
- Modify: `apps/mobile/CHANGELOG.md`

- [ ] **Step 1: Add a changelog entry**

Under the current `## [2026.06.24]` heading in `apps/mobile/CHANGELOG.md` (create the dated section if absent, matching the existing format), under `### Added`:
```markdown
- **Film Log photos** — the light meter's shutter button captures a reference photo and attaches it to the logged shot via a quick-confirm sheet; manual shots can import a photo from the library. Photos are stored in-app (deleted with the shot/roll), shown as thumbnails with a full-screen viewer, and **saved in black & white when the roll is B&W**. Optional setting to also save meter photos to the iOS Photos library (default off).
```

- [ ] **Step 2: Full gate**

Run (from `apps/mobile`): `bun run typecheck && bun run lint && bun run test`. Then repo root: `npx react-doctor@latest --yes --json` and confirm **100/100** on all four projects with zero new feature diagnostics.

- [ ] **Step 3: Full on-device pass (dev build)**

Capture from meter (color + B&W rolls) → confirm sheet Save and Edit… paths → manual import → replace/remove → delete shot and roll remove the files → relaunch confirms persistence → save-to-Photos toggle behavior. Confirm the built `Info.plist` carries both photo-library usage strings.

- [ ] **Step 4: Commit**
```bash
git add apps/mobile/CHANGELOG.md
git commit -m "docs(mobile): changelog for Film Log photo capture"
```

---

## Notes for the implementer

- **Skia / file-system API drift:** the exact `@shopify/react-native-skia` and `expo-file-system` call names (`Skia.Surface.MakeOffscreen`, `encodeToBase64`, `EncodingType`, the new `File`/`Directory` API in newer expo-file-system) can vary by version. Use **Context7** for the installed versions before implementing Task 3, and adjust the wrappers; the unit tests mock these, so the device pass (Tasks 8/10) is the real validation.
- **vision-camera `takePhoto()`** requires `photo={true}` on `<Camera>` (Task 8 step 1.2). Validate capture doesn't disrupt the live metering loop early (Task 8 step 3); if it does, briefly pause the EV poll during capture.
- **Keep screens under the `no-giant-component` budget** — `meter-screen.tsx` and `shot-form-screen.tsx` are already near the limit. Capture logic lives in `use-meter-capture`; extract subcomponents if React Doctor flags either screen.
- **Order dependency:** Task 7 references `photo-settings` (Task 12). Create the stub in Task 7 Step 2 as written, then finalize in Task 12.
```
