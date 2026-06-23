# Mobile App Beautification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the iOS app the web app's dark-theme gradient background and bring the Exposure, Resize, and Reciprocity calculators to web feature parity with native extras (haptics, share, steppers, an SVG reciprocity chart, an aspect-ratio preview).

**Architecture:** Foundation-first. Add `react-native-svg`, build one shared visual system + reusable input primitives, then rebuild each calculator screen on top of them. The gradient lands first (instant visible win everywhere); calculation math stays in the already-tested `@dorkroom/logic` hooks — this is UI work, not logic.

**Tech Stack:** Expo SDK 54 / React Native 0.81, expo-router v6, NativeWind v4 (Tailwind v3 syntax), `react-native-svg` (new), `expo-haptics` (already installed), RN built-in `Share`, vitest.

## Global Constraints

- **iOS-only, dark-only, iOS 26, New Architecture.** Do not add light-mode branches. (`apps/mobile/CLAUDE.md`)
- **No `any`** — specific types or `unknown`. (root `CLAUDE.md`)
- **Never import internal package paths** — only `@dorkroom/logic` / `@dorkroom/api`. (root `CLAUDE.md`)
- **Path alias:** `@/*` → `apps/mobile/src/*`.
- **Components:** PascalCase exports, kebab-case files; props interface named `ComponentNameProps`; accept optional `className`; co-locate pure helpers + `*.test.ts` beside the component.
- **Styling:** NativeWind `className` with **Tailwind v3** syntax only (no v4-only utilities). Palette: bg dark, `text-white`/`text-white/60..80`, accent `bg-rose-600`/`text-rose-400`, cards `rounded-2xl`/`rounded-xl`, pills `rounded-full`.
- **No in-page title headers** — the tab bar labels the screen. Drop the legacy `text-2xl` titles from `exposure.tsx`, `resize.tsx`, `reciprocity.tsx` when rebuilding them.
- **Testing reality:** unit-test **pure** modules only (vitest). Do **not** write fake tests that mock native behavior. Components are verified on device.
- **Native dependency note:** `react-native-svg` ships native code. After Task 1 you must produce a **development build** (`apps/mobile/CLAUDE.md` workflow #2) to load it — Metro Fast Refresh alone will not pick up a new native module.
- **Gate (run from `apps/mobile/`):** `bun run test` · `bun run typecheck` · `bun run lint`.
- **Versioning:** iOS app changes go in `apps/mobile/CHANGELOG.md` with a CalVer bump in `apps/mobile/package.json` — never the root web changelog.

---

## File Structure

**New shared components** (`apps/mobile/src/components/`):
- `gradient-background.tsx` — absolute-fill radial gradient + grain (the background).
- `section-label.tsx` — small uppercase group label.
- `result-card.tsx` — accent-bordered result container (wraps `GlassCard`).
- `result-stat.tsx` — large headline result value.
- `formula-row.tsx` — monospace formula box.
- `preset-chip-row.tsx` — horizontal scroll of selectable chips.
- `segmented-control.tsx` — segmented option control (replaces `Switch`).
- `stepper.tsx` — −/+ value control with hold-repeat + haptics.
- `share-button.tsx` — RN `Share` button.

**New shared modules:**
- `apps/mobile/src/theme/accents.ts` — per-calculator accent colors.
- `apps/mobile/src/lib/share-text.ts` (+ `.test.ts`) — pure share-string builders.

**New feature folders:**
- `apps/mobile/src/components/resize/aspect-preview-geometry.ts` (+ `.test.ts`), `aspect-preview.tsx`.
- `apps/mobile/src/components/reciprocity/chart-geometry.ts` (+ `.test.ts`), `reciprocity-chart.tsx`, `film-picker.tsx`.

**New asset + generator:**
- `apps/mobile/scripts/generate-grain.mjs` — one-off PNG generator.
- `apps/mobile/src/assets/grain.png` — committed output.

**Modified:**
- `apps/mobile/src/components/screen.tsx` — host `GradientBackground`.
- `apps/mobile/src/components/glass-card.tsx` — add hairline border.
- `apps/mobile/app/(tabs)/exposure.tsx`, `resize.tsx`, `reciprocity.tsx` — full rebuilds.
- `apps/mobile/package.json`, `apps/mobile/CHANGELOG.md`.

---

## Task 1: Gradient background + grain asset, wired into every screen

**Files:**
- Add dep: `apps/mobile/package.json` (`react-native-svg` via `expo install`)
- Create: `apps/mobile/scripts/generate-grain.mjs`
- Create: `apps/mobile/src/assets/grain.png` (generated)
- Create: `apps/mobile/src/components/gradient-background.tsx`
- Modify: `apps/mobile/src/components/screen.tsx`

**Interfaces:**
- Produces: `GradientBackground()` (no props); `Screen` renders it behind a transparent `ScrollView`.

- [ ] **Step 1: Install react-native-svg (Expo-pinned, native)**

Run from `apps/mobile/`:
```bash
bunx expo install react-native-svg
```
Expected: `react-native-svg` added to `dependencies` at the SDK-54-compatible version.

- [ ] **Step 2: Write the grain-tile generator**

Create `apps/mobile/scripts/generate-grain.mjs`:
```js
// Generates a 160x160 RGBA white-speckle PNG used as a film-grain overlay.
// Deterministic (seeded) so re-runs are reproducible. Run once; commit the PNG.
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const SIZE = 160;

function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(1337);

const channels = 4;
const stride = SIZE * channels;
const raw = Buffer.alloc((stride + 1) * SIZE);
for (let y = 0; y < SIZE; y++) {
  raw[y * (stride + 1)] = 0; // filter type: none
  for (let x = 0; x < SIZE; x++) {
    const o = y * (stride + 1) + 1 + x * channels;
    const v = rand();
    const alpha = v > 0.6 ? Math.floor(((v - 0.6) / 0.4) * 80) : 0;
    raw[o] = 255;
    raw[o + 1] = 255;
    raw[o + 2] = 255;
    raw[o + 3] = alpha;
  }
}

const CRC_TABLE = (() => {
  const t = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type RGBA
const png = Buffer.concat([
  sig,
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw)),
  chunk('IEND', Buffer.alloc(0)),
]);
writeFileSync(new URL('../src/assets/grain.png', import.meta.url), png);
console.log('wrote src/assets/grain.png');
```

- [ ] **Step 3: Generate the asset**

Run from `apps/mobile/`:
```bash
mkdir -p src/assets && node scripts/generate-grain.mjs
```
Expected: `wrote src/assets/grain.png` and the file exists (`ls -l src/assets/grain.png` shows a non-zero PNG).

- [ ] **Step 4: Write `GradientBackground`**

Create `apps/mobile/src/components/gradient-background.tsx`:
```tsx
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import grainTile from '@/assets/grain.png';

/**
 * The web dark-theme backdrop ported to native: three radial glows over
 * near-black, plus a tiling grain overlay. Absolute-fill and non-interactive,
 * so it sits behind scroll content and stays fixed.
 */
export function GradientBackground() {
  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: '#070708' }]}
    >
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id="peach" cx="50%" cy="-10%" r="75%">
            <Stop offset="0" stopColor="#f99f96" stopOpacity={0.1} />
            <Stop offset="0.55" stopColor="#f99f96" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="red" cx="12%" cy="90%" r="60%">
            <Stop offset="0" stopColor="#f34646" stopOpacity={0.14} />
            <Stop offset="0.5" stopColor="#f34646" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="orange" cx="88%" cy="95%" r="55%">
            <Stop offset="0" stopColor="#e57a3c" stopOpacity={0.1} />
            <Stop offset="0.45" stopColor="#e57a3c" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#peach)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#red)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#orange)" />
      </Svg>
      <Image
        source={grainTile}
        resizeMode="repeat"
        style={[StyleSheet.absoluteFill, { opacity: 0.07 }]}
      />
    </View>
  );
}
```

- [ ] **Step 5: Wire it into `Screen`**

Replace `apps/mobile/src/components/screen.tsx` entirely:
```tsx
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { GradientBackground } from '@/components/gradient-background';

export function Screen({ children }: { children: ReactNode }) {
  return (
    <View className="flex-1">
      <GradientBackground />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 16, gap: 16 }}
      >
        {children}
      </ScrollView>
    </View>
  );
}
```

- [ ] **Step 6: Typecheck + lint**

Run from `apps/mobile/`:
```bash
bun run typecheck && bun run lint
```
Expected: both pass. (If `tsc` errors on the `grain.png` import, Expo's asset type declarations are not resolving — confirm `expo-env.d.ts` exists at the app root and is included by `tsconfig.json`; do not add a duplicate `declare module '*.png'`.)

- [ ] **Step 7: Build a dev client and verify on device**

`react-native-svg` is native, so produce a development build per `apps/mobile/CLAUDE.md` workflow #2, install, and launch. Visually confirm: every screen shows the warm-peach top glow, red bottom-left glow, orange bottom-right glow over near-black, with a subtle grain. Background does not scroll with content.

- [ ] **Step 8: Commit**

```bash
git add apps/mobile/package.json apps/mobile/scripts/generate-grain.mjs apps/mobile/src/assets/grain.png apps/mobile/src/components/gradient-background.tsx apps/mobile/src/components/screen.tsx
git commit -m "feat(mobile): gradient backdrop with grain ported from web dark theme"
```

---

## Task 2: Presentational primitives (accents, section label, result card/stat, formula row)

**Files:**
- Create: `apps/mobile/src/theme/accents.ts`
- Create: `apps/mobile/src/components/section-label.tsx`
- Create: `apps/mobile/src/components/result-card.tsx`
- Create: `apps/mobile/src/components/result-stat.tsx`
- Create: `apps/mobile/src/components/formula-row.tsx`
- Modify: `apps/mobile/src/components/glass-card.tsx`

**Interfaces:**
- Produces:
  - `ACCENT: Record<'blue'|'teal'|'amber', string>`, `type AccentColor = 'blue'|'teal'|'amber'`
  - `SectionLabel({ children: string })`
  - `ResultCard({ accent: AccentColor, children: ReactNode, className?: string })`
  - `ResultStat({ label: string, value: string, helper?: string, accent?: AccentColor })`
  - `FormulaRow({ formula: string })`

- [ ] **Step 1: Accent palette**

Create `apps/mobile/src/theme/accents.ts`:
```ts
/** Per-calculator accent colors, mirroring the web result-card accents. */
export const ACCENT = {
  blue: '#60a5fa',
  teal: '#2dd4bf',
  amber: '#fbbf24',
} as const;

export type AccentColor = keyof typeof ACCENT;
```

- [ ] **Step 2: SectionLabel**

Create `apps/mobile/src/components/section-label.tsx`:
```tsx
import { Text } from 'react-native';

export function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="text-xs font-semibold uppercase tracking-wide text-white/40">
      {children}
    </Text>
  );
}
```

- [ ] **Step 3: Add a hairline border to GlassCard**

In `apps/mobile/src/components/glass-card.tsx`, update the fallback branch's className to add a hairline border (the Liquid Glass branch keeps its own styling):
```tsx
  return (
    <View
      className={`rounded-2xl border border-white/10 bg-white/10 p-5 ${className ?? ''}`}
    >
      {children}
    </View>
  );
```

- [ ] **Step 4: ResultStat**

Create `apps/mobile/src/components/result-stat.tsx`:
```tsx
import { Text, View } from 'react-native';
import { ACCENT, type AccentColor } from '@/theme/accents';

interface ResultStatProps {
  label: string;
  value: string;
  helper?: string;
  accent?: AccentColor;
}

export function ResultStat({ label, value, helper, accent }: ResultStatProps) {
  return (
    <View className="gap-0.5">
      <Text className="text-sm text-white/60">{label}</Text>
      <Text
        className="text-4xl font-bold"
        style={{ color: accent ? ACCENT[accent] : '#ffffff' }}
      >
        {value}
      </Text>
      {helper ? <Text className="text-sm text-white/50">{helper}</Text> : null}
    </View>
  );
}
```

- [ ] **Step 5: ResultCard**

Create `apps/mobile/src/components/result-card.tsx`:
```tsx
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { GlassCard } from '@/components/glass-card';
import { ACCENT, type AccentColor } from '@/theme/accents';

interface ResultCardProps {
  accent: AccentColor;
  children: ReactNode;
  className?: string;
}

export function ResultCard({ accent, children, className }: ResultCardProps) {
  return (
    <View style={{ borderRadius: 20, borderWidth: 1, borderColor: `${ACCENT[accent]}40` }}>
      <GlassCard className={className}>{children}</GlassCard>
    </View>
  );
}
```

- [ ] **Step 6: FormulaRow**

Create `apps/mobile/src/components/formula-row.tsx`:
```tsx
import { Text, View } from 'react-native';

export function FormulaRow({ formula }: { formula: string }) {
  return (
    <View className="rounded-xl bg-black/30 px-4 py-3">
      <Text className="font-mono text-sm text-white/80">{formula}</Text>
    </View>
  );
}
```

- [ ] **Step 7: Typecheck + lint + commit**

Run from `apps/mobile/`:
```bash
bun run typecheck && bun run lint
```
Expected: pass. Then:
```bash
git add apps/mobile/src/theme/accents.ts apps/mobile/src/components/section-label.tsx apps/mobile/src/components/result-stat.tsx apps/mobile/src/components/result-card.tsx apps/mobile/src/components/formula-row.tsx apps/mobile/src/components/glass-card.tsx
git commit -m "feat(mobile): result card/stat, formula row, section label primitives"
```

---

## Task 3: Interactive primitives (chips, segmented control, stepper) with haptics

**Files:**
- Create: `apps/mobile/src/components/preset-chip-row.tsx`
- Create: `apps/mobile/src/components/segmented-control.tsx`
- Create: `apps/mobile/src/components/stepper.tsx`

**Interfaces:**
- Produces:
  - `PresetChipRow<T extends string|number>({ options: {label:string;value:T}[], value?: T, onSelect: (v:T)=>void })`
  - `SegmentedControl<T extends string|number|boolean>({ options: {label:string;value:T}[], value: T, onChange: (v:T)=>void })`
  - `Stepper({ value: string, onDecrement: ()=>void, onIncrement: ()=>void })`

- [ ] **Step 1: PresetChipRow**

Create `apps/mobile/src/components/preset-chip-row.tsx`:
```tsx
import * as Haptics from 'expo-haptics';
import { Pressable, ScrollView, Text, View } from 'react-native';

interface PresetChipRowProps<T extends string | number> {
  options: { label: string; value: T }[];
  value?: T;
  onSelect: (value: T) => void;
}

export function PresetChipRow<T extends string | number>({
  options,
  value,
  onSelect,
}: PresetChipRowProps<T>) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View className="flex-row gap-2">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={String(option.value)}
              onPress={() => {
                Haptics.selectionAsync();
                onSelect(option.value);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              className={`rounded-full px-4 py-2 ${selected ? 'bg-rose-600' : 'bg-white/10'}`}
            >
              <Text className={selected ? 'text-white' : 'text-white/70'}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
```

- [ ] **Step 2: SegmentedControl**

Create `apps/mobile/src/components/segmented-control.tsx`:
```tsx
import * as Haptics from 'expo-haptics';
import { Pressable, Text, View } from 'react-native';

interface SegmentedControlProps<T extends string | number | boolean> {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string | number | boolean>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <View className="flex-row rounded-xl bg-white/10 p-1">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => {
              if (option.value !== value) {
                Haptics.selectionAsync();
                onChange(option.value);
              }
            }}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            className={`flex-1 items-center rounded-lg py-2 ${selected ? 'bg-rose-600' : ''}`}
          >
            <Text className={selected ? 'font-semibold text-white' : 'text-white/70'}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
```

- [ ] **Step 3: Stepper (hold-to-repeat + haptics)**

Create `apps/mobile/src/components/stepper.tsx`:
```tsx
import * as Haptics from 'expo-haptics';
import { useRef } from 'react';
import { Pressable, Text, View } from 'react-native';

interface StepperProps {
  value: string;
  onDecrement: () => void;
  onIncrement: () => void;
}

export function Stepper({ value, onDecrement, onIncrement }: StepperProps) {
  const delay = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeat = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = () => {
    if (delay.current) {
      clearTimeout(delay.current);
      delay.current = null;
    }
    if (repeat.current) {
      clearInterval(repeat.current);
      repeat.current = null;
    }
  };

  const start = (fn: () => void) => () => {
    Haptics.selectionAsync();
    fn();
    delay.current = setTimeout(() => {
      repeat.current = setInterval(() => {
        Haptics.selectionAsync();
        fn();
      }, 120);
    }, 350);
  };

  return (
    <View className="flex-row items-center justify-between rounded-xl bg-white/10 px-2 py-2">
      <Pressable
        onPressIn={start(onDecrement)}
        onPressOut={stop}
        accessibilityRole="button"
        accessibilityLabel="Decrease"
        className="h-10 w-12 items-center justify-center rounded-lg bg-white/10"
      >
        <Text className="text-xl text-white">−</Text>
      </Pressable>
      <Text className="text-base font-semibold text-white">{value}</Text>
      <Pressable
        onPressIn={start(onIncrement)}
        onPressOut={stop}
        accessibilityRole="button"
        accessibilityLabel="Increase"
        className="h-10 w-12 items-center justify-center rounded-lg bg-white/10"
      >
        <Text className="text-xl text-white">+</Text>
      </Pressable>
    </View>
  );
}
```

- [ ] **Step 4: Typecheck + lint + commit**

Run from `apps/mobile/`:
```bash
bun run typecheck && bun run lint
```
Expected: pass. Then:
```bash
git add apps/mobile/src/components/preset-chip-row.tsx apps/mobile/src/components/segmented-control.tsx apps/mobile/src/components/stepper.tsx
git commit -m "feat(mobile): chip row, segmented control, and haptic stepper primitives"
```

---

## Task 4: Share text builders (TDD) + ShareButton

**Files:**
- Create: `apps/mobile/src/lib/share-text.ts`
- Test: `apps/mobile/src/lib/share-text.test.ts`
- Create: `apps/mobile/src/components/share-button.tsx`

**Interfaces:**
- Produces:
  - `buildExposureShare({ originalTime: string, newTime: string, stops: number, percentageIncrease: number }): string`
  - `buildResizeShare({ newTime: string, stopsDifference: string }): string`
  - `buildReciprocityShare({ filmName: string, meteredTime: string, adjustedTime: string, factor: number }): string`
  - `ShareButton({ message: string })`

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/src/lib/share-text.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import {
  buildExposureShare,
  buildReciprocityShare,
  buildResizeShare,
} from './share-text';

describe('share-text', () => {
  it('formats an exposure result with signed stops', () => {
    const out = buildExposureShare({
      originalTime: '10',
      newTime: '20s',
      stops: 1,
      percentageIncrease: 100,
    });
    expect(out).toContain('Dorkroom Exposure');
    expect(out).toContain('Stops: +1');
    expect(out).toContain('New time: 20s');
    expect(out).toContain('100%');
  });

  it('formats a resize result', () => {
    const out = buildResizeShare({ newTime: '22.5', stopsDifference: '+1.17' });
    expect(out).toContain('Dorkroom Resize');
    expect(out).toContain('New time: 22.5s');
    expect(out).toContain('+1.17');
  });

  it('formats a reciprocity result', () => {
    const out = buildReciprocityShare({
      filmName: 'Kodak Tri-X 400',
      meteredTime: '30s',
      adjustedTime: '4m 12s',
      factor: 1.54,
    });
    expect(out).toContain('Dorkroom Reciprocity');
    expect(out).toContain('Kodak Tri-X 400');
    expect(out).toContain('Metered: 30s');
    expect(out).toContain('Adjusted: 4m 12s');
    expect(out).toContain('1.54');
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run from `apps/mobile/`:
```bash
bun run test src/lib/share-text.test.ts
```
Expected: FAIL — module `./share-text` not found.

- [ ] **Step 3: Implement the builders**

Create `apps/mobile/src/lib/share-text.ts`:
```ts
export function buildExposureShare(p: {
  originalTime: string;
  newTime: string;
  stops: number;
  percentageIncrease: number;
}): string {
  const sign = p.stops >= 0 ? '+' : '';
  return [
    'Dorkroom Exposure',
    `Original: ${p.originalTime}s`,
    `Stops: ${sign}${p.stops}`,
    `New time: ${p.newTime}`,
    `Change: ${p.percentageIncrease.toFixed(0)}%`,
  ].join('\n');
}

export function buildResizeShare(p: {
  newTime: string;
  stopsDifference: string;
}): string {
  return [
    'Dorkroom Resize',
    `New time: ${p.newTime}s`,
    `Stops difference: ${p.stopsDifference}`,
  ].join('\n');
}

export function buildReciprocityShare(p: {
  filmName: string;
  meteredTime: string;
  adjustedTime: string;
  factor: number;
}): string {
  return [
    'Dorkroom Reciprocity',
    `Film: ${p.filmName}`,
    `Metered: ${p.meteredTime}`,
    `Adjusted: ${p.adjustedTime}`,
    `Factor: ${p.factor.toFixed(2)}`,
  ].join('\n');
}
```

- [ ] **Step 4: Run it to confirm it passes**

Run from `apps/mobile/`:
```bash
bun run test src/lib/share-text.test.ts
```
Expected: PASS (3 tests).

- [ ] **Step 5: ShareButton**

Create `apps/mobile/src/components/share-button.tsx`:
```tsx
import * as Haptics from 'expo-haptics';
import { Pressable, Share, Text } from 'react-native';

export function ShareButton({ message }: { message: string }) {
  const onPress = async () => {
    Haptics.selectionAsync();
    // Share.share rejects when the user dismisses the sheet — that is a normal
    // cancel, not an error, so it is intentionally ignored.
    await Share.share({ message }).catch(() => undefined);
  };
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="mt-1 flex-row items-center justify-center rounded-xl bg-white/10 py-3"
    >
      <Text className="font-semibold text-white">Share result</Text>
    </Pressable>
  );
}
```

- [ ] **Step 6: Typecheck + lint + commit**

Run from `apps/mobile/`:
```bash
bun run typecheck && bun run lint
```
Expected: pass. Then:
```bash
git add apps/mobile/src/lib/share-text.ts apps/mobile/src/lib/share-text.test.ts apps/mobile/src/components/share-button.tsx
git commit -m "feat(mobile): share-text builders and ShareButton"
```

---

## Task 5: Rebuild the Exposure screen

**Files:**
- Modify (full rewrite): `apps/mobile/app/(tabs)/exposure.tsx`

**Interfaces:**
- Consumes: `useExposureCalculator()` from `@dorkroom/logic` — `{ originalTime, setOriginalTime, stops, setStops, adjustStops, calculation, formatTime, presets }`. `calculation` (when non-null) has `originalTimeValue`, `stopsValue`, `newTimeValue`, `addedTime`, `percentageIncrease`. `presets` is `{ label: string; stops: number }[]`. Plus Task 2/3/4 primitives.

- [ ] **Step 1: Rewrite the screen**

Replace `apps/mobile/app/(tabs)/exposure.tsx` entirely:
```tsx
import { useExposureCalculator } from '@dorkroom/logic';
import { Text, View } from 'react-native';
import { FormulaRow } from '@/components/formula-row';
import { GlassCard } from '@/components/glass-card';
import { LabeledTextField } from '@/components/labeled-text-field';
import { PresetChipRow } from '@/components/preset-chip-row';
import { ResultCard } from '@/components/result-card';
import { ResultRow } from '@/components/result-row';
import { ResultStat } from '@/components/result-stat';
import { Screen } from '@/components/screen';
import { SectionLabel } from '@/components/section-label';
import { ShareButton } from '@/components/share-button';
import { Stepper } from '@/components/stepper';
import { buildExposureShare } from '@/lib/share-text';

export default function ExposureScreen() {
  const {
    originalTime,
    setOriginalTime,
    stops,
    setStops,
    adjustStops,
    calculation,
    formatTime,
    presets,
  } = useExposureCalculator();

  const stopsValue = calculation?.stopsValue ?? Number.parseFloat(stops) || 0;
  const signed = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}`;

  return (
    <Screen>
      <GlassCard className="gap-4">
        <LabeledTextField
          label="Original time (s)"
          value={originalTime}
          onChangeText={setOriginalTime}
          keyboardType="decimal-pad"
        />
        <View className="gap-2">
          <SectionLabel>Stop adjustment</SectionLabel>
          <PresetChipRow
            options={presets.map((p) => ({ label: p.label, value: p.stops }))}
            value={stopsValue}
            onSelect={(v) => setStops(String(v))}
          />
        </View>
        <LabeledTextField
          label="Custom stops"
          value={stops}
          onChangeText={setStops}
          keyboardType="default"
        />
        <Stepper
          value={`${signed(stopsValue)} stops`}
          onDecrement={() => adjustStops(-1 / 3)}
          onIncrement={() => adjustStops(1 / 3)}
        />
      </GlassCard>

      {calculation ? (
        <ResultCard accent="blue" className="gap-3">
          <ResultStat
            accent="blue"
            label="New time"
            value={formatTime(calculation.newTimeValue)}
            helper={`${signed(calculation.stopsValue)} stops`}
          />
          <FormulaRow
            formula={`${originalTime} × 2^${calculation.stopsValue.toFixed(2)} = ${formatTime(
              calculation.newTimeValue,
            )}`}
          />
          <View>
            <ResultRow
              label={calculation.addedTime >= 0 ? 'Added exposure' : 'Removed exposure'}
              value={formatTime(Math.abs(calculation.addedTime))}
            />
            <ResultRow
              label="Change"
              value={`${calculation.percentageIncrease.toFixed(0)}%`}
            />
            <ResultRow
              label="Multiplier"
              value={`×${(2 ** calculation.stopsValue).toFixed(3)}`}
            />
            <ResultRow
              label="Original time"
              value={formatTime(calculation.originalTimeValue)}
            />
          </View>
          <ShareButton
            message={buildExposureShare({
              originalTime,
              newTime: formatTime(calculation.newTimeValue),
              stops: calculation.stopsValue,
              percentageIncrease: calculation.percentageIncrease,
            })}
          />
        </ResultCard>
      ) : (
        <GlassCard>
          <Text className="text-white/60">Enter a valid time and stops.</Text>
        </GlassCard>
      )}
    </Screen>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

Run from `apps/mobile/`:
```bash
bun run typecheck && bun run lint
```
Expected: pass (no `text-2xl` title remains; multiplier expression parenthesized).

- [ ] **Step 3: Verify on device**

Reload Metro (JS-only change). Confirm: chips set stops, the stepper nudges ±⅓ with haptics and hold-repeat, the custom field accepts arbitrary stops, the blue result card shows new time / formula / multiplier / change, and Share opens the sheet.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/\(tabs\)/exposure.tsx
git commit -m "feat(mobile): rebuild exposure screen to web parity with native extras"
```

---

## Task 6: Rebuild the Resize screen (segmented controls + aspect preview)

**Files:**
- Create: `apps/mobile/src/components/resize/aspect-preview-geometry.ts`
- Test: `apps/mobile/src/components/resize/aspect-preview-geometry.test.ts`
- Create: `apps/mobile/src/components/resize/aspect-preview.tsx`
- Modify (full rewrite): `apps/mobile/app/(tabs)/resize.tsx`

**Interfaces:**
- Consumes: `useResizeCalculator()` from `@dorkroom/logic` — `{ isEnlargerHeightMode, setIsEnlargerHeightMode, originalWidth, setOriginalWidth, originalLength, setOriginalLength, newWidth, setNewWidth, newLength, setNewLength, originalHeight, setOriginalHeight, newHeight, setNewHeight, originalTime, setOriginalTime, newTime (string), stopsDifference (string), isAspectRatioMatched }`. Plus Task 2/3/4 primitives.
- Produces: `computePreviewRects(origW, origL, newW, newL, box): { orig: Rect; target: Rect }` where `Rect = { x; y; w; h }`; `AspectPreview({ origW, origL, newW, newL })`.

- [ ] **Step 1: Write the failing geometry test**

Create `apps/mobile/src/components/resize/aspect-preview-geometry.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { computePreviewRects } from './aspect-preview-geometry';

describe('computePreviewRects', () => {
  it('scales both rects by a shared factor and centers them in the box', () => {
    const { orig, target } = computePreviewRects(4, 6, 6, 9, 120);
    // shared scale = 120 / max(4,6,6,9) = 120/9
    expect(target.w).toBeCloseTo(80, 5);
    expect(target.h).toBeCloseTo(120, 5);
    expect(target.x).toBeCloseTo(20, 5);
    expect(target.y).toBeCloseTo(0, 5);
    expect(orig.w).toBeCloseTo(53.3333, 3);
    expect(orig.h).toBeCloseTo(80, 5);
    expect(orig.x).toBeCloseTo(33.3333, 3);
    expect(orig.y).toBeCloseTo(20, 5);
  });

  it('returns zero rects for non-positive input', () => {
    const { orig, target } = computePreviewRects(0, 0, 0, 0, 120);
    expect(orig).toEqual({ x: 0, y: 0, w: 0, h: 0 });
    expect(target).toEqual({ x: 0, y: 0, w: 0, h: 0 });
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run from `apps/mobile/`:
```bash
bun run test src/components/resize/aspect-preview-geometry.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the geometry**

Create `apps/mobile/src/components/resize/aspect-preview-geometry.ts`:
```ts
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Scale the original and target print rectangles by a single shared factor so
 * they fit within a `box`×`box` area and stay visually comparable, each
 * centered. Returns zero rects when any dimension is non-positive.
 */
export function computePreviewRects(
  origW: number,
  origL: number,
  newW: number,
  newL: number,
  box: number,
): { orig: Rect; target: Rect } {
  const zero: Rect = { x: 0, y: 0, w: 0, h: 0 };
  const maxDim = Math.max(origW, origL, newW, newL);
  if (!Number.isFinite(maxDim) || maxDim <= 0) return { orig: zero, target: zero };

  const scale = box / maxDim;
  const place = (w: number, l: number): Rect => {
    const rw = w * scale;
    const rh = l * scale;
    return { x: (box - rw) / 2, y: (box - rh) / 2, w: rw, h: rh };
  };
  return { orig: place(origW, origL), target: place(newW, newL) };
}
```

- [ ] **Step 4: Run it to confirm it passes**

Run from `apps/mobile/`:
```bash
bun run test src/components/resize/aspect-preview-geometry.test.ts
```
Expected: PASS (2 tests).

- [ ] **Step 5: AspectPreview component**

Create `apps/mobile/src/components/resize/aspect-preview.tsx`:
```tsx
import { View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { ACCENT } from '@/theme/accents';
import { computePreviewRects } from './aspect-preview-geometry';

const BOX = 120;

interface AspectPreviewProps {
  origW: number;
  origL: number;
  newW: number;
  newL: number;
}

export function AspectPreview({ origW, origL, newW, newL }: AspectPreviewProps) {
  const { orig, target } = computePreviewRects(origW, origL, newW, newL, BOX);
  if (target.w <= 0) return null;
  return (
    <View className="items-center py-2">
      <Svg width={BOX} height={BOX}>
        <Rect
          x={target.x}
          y={target.y}
          width={target.w}
          height={target.h}
          fill={`${ACCENT.teal}22`}
          stroke={ACCENT.teal}
          strokeWidth={1.5}
          rx={2}
        />
        <Rect
          x={orig.x}
          y={orig.y}
          width={orig.w}
          height={orig.h}
          fill="transparent"
          stroke="#ffffff"
          strokeOpacity={0.5}
          strokeDasharray="4 3"
          strokeWidth={1.5}
          rx={2}
        />
      </Svg>
    </View>
  );
}
```

- [ ] **Step 6: Rewrite the screen**

Replace `apps/mobile/app/(tabs)/resize.tsx` entirely:
```tsx
import { useResizeCalculator } from '@dorkroom/logic';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { GlassCard } from '@/components/glass-card';
import { LabeledTextField } from '@/components/labeled-text-field';
import { AspectPreview } from '@/components/resize/aspect-preview';
import { ResultCard } from '@/components/result-card';
import { ResultRow } from '@/components/result-row';
import { ResultStat } from '@/components/result-stat';
import { Screen } from '@/components/screen';
import { SectionLabel } from '@/components/section-label';
import { SegmentedControl } from '@/components/segmented-control';
import { ShareButton } from '@/components/share-button';
import { buildResizeShare } from '@/lib/share-text';

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
    originalHeight,
    setOriginalHeight,
    newHeight,
    setNewHeight,
    originalTime,
    setOriginalTime,
    newTime,
    stopsDifference,
    isAspectRatioMatched,
  } = useResizeCalculator();

  const [unit, setUnit] = useState<'in' | 'cm'>('in');
  const num = (s: string) => Number.parseFloat(s) || 0;

  const stopsHelper = (() => {
    const diff = Number.parseFloat(stopsDifference);
    if (!Number.isFinite(diff) || diff === 0) return 'same size';
    return diff > 0 ? 'larger — add exposure' : 'smaller — remove exposure';
  })();

  return (
    <Screen>
      <GlassCard className="gap-4">
        <SegmentedControl
          options={[
            { label: 'Print size', value: false },
            { label: 'Enlarger height', value: true },
          ]}
          value={isEnlargerHeightMode}
          onChange={setIsEnlargerHeightMode}
        />

        {isEnlargerHeightMode ? (
          <View className="flex-row gap-3">
            <View className="flex-1">
              <LabeledTextField
                label="Orig. height"
                value={originalHeight}
                onChangeText={setOriginalHeight}
                keyboardType="decimal-pad"
              />
            </View>
            <View className="flex-1">
              <LabeledTextField
                label="New height"
                value={newHeight}
                onChangeText={setNewHeight}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        ) : (
          <>
            <View className="gap-2">
              <SectionLabel>Units</SectionLabel>
              <SegmentedControl
                options={[
                  { label: 'Inches', value: 'in' },
                  { label: 'Centimeters', value: 'cm' },
                ]}
                value={unit}
                onChange={setUnit}
              />
            </View>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <LabeledTextField
                  label={`Orig. width (${unit})`}
                  value={originalWidth}
                  onChangeText={setOriginalWidth}
                  keyboardType="decimal-pad"
                />
              </View>
              <View className="flex-1">
                <LabeledTextField
                  label={`Orig. length (${unit})`}
                  value={originalLength}
                  onChangeText={setOriginalLength}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <LabeledTextField
                  label={`New width (${unit})`}
                  value={newWidth}
                  onChangeText={setNewWidth}
                  keyboardType="decimal-pad"
                />
              </View>
              <View className="flex-1">
                <LabeledTextField
                  label={`New length (${unit})`}
                  value={newLength}
                  onChangeText={setNewLength}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <AspectPreview
              origW={num(originalWidth)}
              origL={num(originalLength)}
              newW={num(newWidth)}
              newL={num(newLength)}
            />
          </>
        )}

        <LabeledTextField
          label="Original time (s)"
          value={originalTime}
          onChangeText={setOriginalTime}
          keyboardType="decimal-pad"
        />
      </GlassCard>

      {newTime ? (
        <ResultCard accent="teal" className="gap-3">
          <ResultStat accent="teal" label="New time" value={`${newTime}s`} />
          <ResultRow label="Stops difference" value={stopsDifference} />
          <Text className="text-sm text-white/50">{stopsHelper}</Text>
          {!isAspectRatioMatched && !isEnlargerHeightMode ? (
            <Text className="text-amber-500">Aspect ratios do not match.</Text>
          ) : null}
          <ShareButton message={buildResizeShare({ newTime, stopsDifference })} />
        </ResultCard>
      ) : (
        <GlassCard>
          <Text className="text-white/60">Enter dimensions and a time.</Text>
        </GlassCard>
      )}
    </Screen>
  );
}
```

- [ ] **Step 7: Typecheck + lint**

Run from `apps/mobile/`:
```bash
bun run typecheck && bun run lint
```
Expected: pass.

- [ ] **Step 8: Verify on device**

Reload Metro. Confirm: the segmented mode toggle switches between print-size and enlarger-height inputs, the in/cm segmented control relabels fields, the teal result card shows new time + contextual helper, the aspect mismatch warning appears for non-matching ratios, and the nested-rectangle preview reflects the entered dimensions.

- [ ] **Step 9: Commit**

```bash
git add apps/mobile/src/components/resize/ apps/mobile/app/\(tabs\)/resize.tsx
git commit -m "feat(mobile): rebuild resize screen with mode/unit segments and aspect preview"
```

---

## Task 7: Rebuild the Reciprocity screen (film picker, presets, results)

**Files:**
- Create: `apps/mobile/src/components/reciprocity/film-picker.tsx`
- Modify (full rewrite): `apps/mobile/app/(tabs)/reciprocity.tsx`

**Interfaces:**
- Consumes: `useReciprocityCalculator()` from `@dorkroom/logic` — `{ filmType, setFilmType, meteredTime, setMeteredTime, customFactor, setCustomFactor, timeFormatError, calculation, formatTime, exposurePresets (number[]), filmTypes ({ label: string; value: string; factor?: number }[]) }`. `calculation` (when non-null) has `originalTime`, `adjustedTime`, `factor`, `filmName`, `percentageIncrease`. Plus Task 2/3/4 primitives + `BottomSheet`.
- Produces: `FilmPicker({ films: { label: string; value: string }[], value: string, onChange: (v: string) => void })`.

- [ ] **Step 1: FilmPicker**

Create `apps/mobile/src/components/reciprocity/film-picker.tsx`:
```tsx
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { BottomSheet } from '@/components/bottom-sheet';

interface FilmPickerProps {
  films: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
}

export function FilmPicker({ films, value, onChange }: FilmPickerProps) {
  const [open, setOpen] = useState(false);
  const selected = films.find((f) => f.value === value);
  return (
    <View className="gap-1">
      <Text className="text-sm text-white/60">Film</Text>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        className="flex-row items-center justify-between rounded-xl bg-white/10 px-4 py-3"
      >
        <Text className="text-base text-white">{selected?.label ?? 'Select film'}</Text>
        <Text className="text-white/50">▾</Text>
      </Pressable>
      <BottomSheet visible={open} title="Select film" onClose={() => setOpen(false)}>
        <ScrollView style={{ maxHeight: 360 }}>
          {films.map((film) => {
            const isSelected = film.value === value;
            return (
              <Pressable
                key={film.value}
                onPress={() => {
                  onChange(film.value);
                  setOpen(false);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                className="flex-row items-center justify-between py-3"
              >
                <Text className={isSelected ? 'font-semibold text-rose-400' : 'text-white'}>
                  {film.label}
                </Text>
                {isSelected ? <Text className="text-rose-400">✓</Text> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}
```

- [ ] **Step 2: Rewrite the screen**

Replace `apps/mobile/app/(tabs)/reciprocity.tsx` entirely:
```tsx
import { useReciprocityCalculator } from '@dorkroom/logic';
import { Text, View } from 'react-native';
import { FormulaRow } from '@/components/formula-row';
import { GlassCard } from '@/components/glass-card';
import { LabeledTextField } from '@/components/labeled-text-field';
import { PresetChipRow } from '@/components/preset-chip-row';
import { FilmPicker } from '@/components/reciprocity/film-picker';
import { ResultCard } from '@/components/result-card';
import { ResultRow } from '@/components/result-row';
import { ResultStat } from '@/components/result-stat';
import { Screen } from '@/components/screen';
import { SectionLabel } from '@/components/section-label';
import { ShareButton } from '@/components/share-button';
import { buildReciprocityShare } from '@/lib/share-text';

export default function ReciprocityScreen() {
  const {
    filmType,
    setFilmType,
    meteredTime,
    setMeteredTime,
    customFactor,
    setCustomFactor,
    timeFormatError,
    calculation,
    formatTime,
    exposurePresets,
    filmTypes,
  } = useReciprocityCalculator();

  const films = filmTypes.map((f) => ({ label: f.label, value: f.value }));

  return (
    <Screen>
      <GlassCard className="gap-4">
        <FilmPicker films={films} value={filmType} onChange={setFilmType} />

        {filmType === 'custom' ? (
          <LabeledTextField
            label="Reciprocity factor"
            value={customFactor}
            onChangeText={setCustomFactor}
            keyboardType="decimal-pad"
            placeholder="1.3"
          />
        ) : null}

        <LabeledTextField
          label="Metered time"
          value={meteredTime}
          onChangeText={setMeteredTime}
          placeholder="Try 30s, 1m30s, or 2h"
        />
        {timeFormatError ? (
          <Text className="text-amber-500">{timeFormatError}</Text>
        ) : null}

        <View className="gap-2">
          <SectionLabel>Common times</SectionLabel>
          <PresetChipRow
            options={exposurePresets.map((n) => ({ label: `${n}s`, value: n }))}
            onSelect={(n) => setMeteredTime(`${n}s`)}
          />
        </View>
      </GlassCard>

      {calculation ? (
        <ResultCard accent="amber" className="gap-3">
          <ResultStat
            accent="amber"
            label="Adjusted exposure"
            value={formatTime(calculation.adjustedTime)}
            helper={calculation.filmName}
          />
          <FormulaRow
            formula={`${formatTime(calculation.originalTime)} ^ ${calculation.factor.toFixed(
              2,
            )} = ${formatTime(calculation.adjustedTime)}`}
          />
          <View>
            <ResultRow
              label="Added exposure"
              value={`${formatTime(
                calculation.adjustedTime - calculation.originalTime,
              )} (${calculation.percentageIncrease.toFixed(0)}%)`}
            />
            <ResultRow label="Metered time" value={formatTime(calculation.originalTime)} />
            <ResultRow label="Factor" value={calculation.factor.toFixed(2)} />
          </View>
          <ShareButton
            message={buildReciprocityShare({
              filmName: calculation.filmName,
              meteredTime: formatTime(calculation.originalTime),
              adjustedTime: formatTime(calculation.adjustedTime),
              factor: calculation.factor,
            })}
          />
        </ResultCard>
      ) : (
        <GlassCard>
          <Text className="text-white/60">Enter a valid metered time.</Text>
        </GlassCard>
      )}
    </Screen>
  );
}
```

- [ ] **Step 3: Typecheck + lint**

Run from `apps/mobile/`:
```bash
bun run typecheck && bun run lint
```
Expected: pass.

- [ ] **Step 4: Verify on device**

Reload Metro. Confirm: the film bottom sheet lists all films + Custom and selecting one updates the field, the custom-factor field appears only for Custom, the time presets fill the metered-time field, format errors show inline, and the amber result card shows adjusted exposure / formula / added exposure / factor + Share.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/components/reciprocity/film-picker.tsx apps/mobile/app/\(tabs\)/reciprocity.tsx
git commit -m "feat(mobile): rebuild reciprocity screen with film picker and time presets"
```

---

## Task 8: Reciprocity SVG chart (TDD geometry + component)

**Files:**
- Create: `apps/mobile/src/components/reciprocity/chart-geometry.ts`
- Test: `apps/mobile/src/components/reciprocity/chart-geometry.test.ts`
- Create: `apps/mobile/src/components/reciprocity/reciprocity-chart.tsx`
- Modify: `apps/mobile/app/(tabs)/reciprocity.tsx` (insert the chart card)

**Interfaces:**
- Produces:
  - `logScale(value, domainMin, domainMax, rangeMin, rangeMax): number`
  - `buildReciprocityCurve({ factor, minTime, maxTime, width, height, padding, samples? }): { x: number; y: number }[]`
  - `pointFor(time, { factor, minTime, maxTime, width, height, padding }): { x: number; y: number }`
  - `ReciprocityChart({ originalTime, adjustedTime, factor, filmName })`

- [ ] **Step 1: Write the failing geometry test**

Create `apps/mobile/src/components/reciprocity/chart-geometry.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { buildReciprocityCurve, logScale, pointFor } from './chart-geometry';

describe('chart-geometry', () => {
  it('maps the geometric midpoint to the range midpoint on a log scale', () => {
    expect(logScale(10, 1, 100, 0, 100)).toBeCloseTo(50, 5);
  });

  it('clamps non-positive values to the range minimum', () => {
    expect(logScale(0, 1, 100, 0, 100)).toBe(0);
  });

  it('builds a curve spanning the padded plot width', () => {
    const pts = buildReciprocityCurve({
      factor: 1.5,
      minTime: 1,
      maxTime: 100,
      width: 300,
      height: 200,
      padding: 20,
      samples: 10,
    });
    expect(pts).toHaveLength(11);
    expect(pts[0].x).toBeCloseTo(20, 5);
    expect(pts[pts.length - 1].x).toBeCloseTo(280, 5);
  });

  it('places a marker for a metered time inside the plot area', () => {
    const p = pointFor(30, {
      factor: 1.5,
      minTime: 1,
      maxTime: 100,
      width: 300,
      height: 200,
      padding: 20,
    });
    expect(p.x).toBeGreaterThan(20);
    expect(p.x).toBeLessThan(280);
    expect(p.y).toBeGreaterThan(20);
    expect(p.y).toBeLessThan(180);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run from `apps/mobile/`:
```bash
bun run test src/components/reciprocity/chart-geometry.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the geometry**

Create `apps/mobile/src/components/reciprocity/chart-geometry.ts`:
```ts
export interface ChartPoint {
  x: number;
  y: number;
}

/** Map `value` from a logarithmic domain onto a linear range. */
export function logScale(
  value: number,
  domainMin: number,
  domainMax: number,
  rangeMin: number,
  rangeMax: number,
): number {
  if (value <= 0 || domainMin <= 0 || domainMax <= 0) return rangeMin;
  const lo = Math.log(domainMin);
  const hi = Math.log(domainMax);
  if (hi === lo) return rangeMin;
  const t = (Math.log(value) - lo) / (hi - lo);
  return rangeMin + t * (rangeMax - rangeMin);
}

interface CurveParams {
  factor: number;
  minTime: number;
  maxTime: number;
  width: number;
  height: number;
  padding: number;
  samples?: number;
}

/** Sample the reciprocity curve adjusted = metered^factor across a log-log plot. */
export function buildReciprocityCurve(params: CurveParams): ChartPoint[] {
  const { factor, minTime, maxTime, width, height, padding, samples = 40 } = params;
  if (minTime <= 0 || maxTime <= minTime || factor <= 0) return [];
  const adjMin = minTime ** factor;
  const adjMax = maxTime ** factor;
  const lo = Math.log(minTime);
  const hi = Math.log(maxTime);
  const pts: ChartPoint[] = [];
  for (let i = 0; i <= samples; i++) {
    const time = Math.exp(lo + (i / samples) * (hi - lo));
    const adj = time ** factor;
    pts.push({
      x: logScale(time, minTime, maxTime, padding, width - padding),
      // invert y so larger adjusted times sit higher
      y: logScale(adj, adjMin, adjMax, height - padding, padding),
    });
  }
  return pts;
}

/** Plot coordinate for a single metered time on the same axes. */
export function pointFor(
  time: number,
  params: Omit<CurveParams, 'samples'>,
): ChartPoint {
  const { factor, minTime, maxTime, width, height, padding } = params;
  const adjMin = minTime ** factor;
  const adjMax = maxTime ** factor;
  return {
    x: logScale(time, minTime, maxTime, padding, width - padding),
    y: logScale(time ** factor, adjMin, adjMax, height - padding, padding),
  };
}
```

- [ ] **Step 4: Run it to confirm it passes**

Run from `apps/mobile/`:
```bash
bun run test src/components/reciprocity/chart-geometry.test.ts
```
Expected: PASS (4 tests).

- [ ] **Step 5: ReciprocityChart component**

Create `apps/mobile/src/components/reciprocity/reciprocity-chart.tsx`:
```tsx
import { Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { ACCENT } from '@/theme/accents';
import { buildReciprocityCurve, pointFor } from './chart-geometry';

const WIDTH = 300;
const HEIGHT = 200;
const PADDING = 24;

interface ReciprocityChartProps {
  originalTime: number;
  adjustedTime: number;
  factor: number;
  filmName: string;
}

export function ReciprocityChart({
  originalTime,
  adjustedTime,
  factor,
  filmName,
}: ReciprocityChartProps) {
  const minTime = 1;
  const maxTime = Math.max(240, originalTime * 1.5);
  const params = { factor, minTime, maxTime, width: WIDTH, height: HEIGHT, padding: PADDING };
  const curve = buildReciprocityCurve(params);
  if (curve.length === 0) return null;

  const marker = pointFor(originalTime, params);
  const points = curve.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View className="gap-2">
      <Text className="text-sm text-white/60">Reciprocity curve · {filmName}</Text>
      <Svg width="100%" height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <Line
          x1={PADDING}
          y1={HEIGHT - PADDING}
          x2={WIDTH - PADDING}
          y2={HEIGHT - PADDING}
          stroke="#ffffff"
          strokeOpacity={0.2}
        />
        <Line
          x1={PADDING}
          y1={PADDING}
          x2={PADDING}
          y2={HEIGHT - PADDING}
          stroke="#ffffff"
          strokeOpacity={0.2}
        />
        <Polyline points={points} fill="none" stroke={ACCENT.amber} strokeWidth={2} />
        <Line
          x1={marker.x}
          y1={HEIGHT - PADDING}
          x2={marker.x}
          y2={marker.y}
          stroke="#ffffff"
          strokeOpacity={0.3}
          strokeDasharray="3 3"
        />
        <Circle cx={marker.x} cy={marker.y} r={5} fill={ACCENT.amber} />
      </Svg>
      <Text className="text-xs text-white/40">
        Metered {Math.round(originalTime)}s → adjusted {Math.round(adjustedTime)}s
      </Text>
    </View>
  );
}
```

- [ ] **Step 6: Insert the chart into the reciprocity screen**

In `apps/mobile/app/(tabs)/reciprocity.tsx`, add the import alongside the others:
```tsx
import { ReciprocityChart } from '@/components/reciprocity/reciprocity-chart';
```
Then, inside the `{calculation ? (...) : (...)}` branch, add a chart card immediately after the closing `</ResultCard>` and before the closing `) : (`:
```tsx
          </ResultCard>
          <GlassCard>
            <ReciprocityChart
              originalTime={calculation.originalTime}
              adjustedTime={calculation.adjustedTime}
              factor={calculation.factor}
              filmName={calculation.filmName}
            />
          </GlassCard>
```
Because the truthy branch now returns two sibling elements, wrap that branch in a fragment. The branch becomes:
```tsx
      {calculation ? (
        <>
          <ResultCard accent="amber" className="gap-3">
            {/* ...existing ResultCard contents unchanged... */}
          </ResultCard>
          <GlassCard>
            <ReciprocityChart
              originalTime={calculation.originalTime}
              adjustedTime={calculation.adjustedTime}
              factor={calculation.factor}
              filmName={calculation.filmName}
            />
          </GlassCard>
        </>
      ) : (
        <GlassCard>
          <Text className="text-white/60">Enter a valid metered time.</Text>
        </GlassCard>
      )}
```

- [ ] **Step 7: Typecheck + lint + run the suite**

Run from `apps/mobile/`:
```bash
bun run typecheck && bun run lint && bun run test
```
Expected: all pass (share-text, aspect-preview-geometry, chart-geometry suites green).

- [ ] **Step 8: Verify on device**

Reload Metro. Confirm: the amber curve renders with axes, the metered-time marker sits on the curve with a dashed drop line, and the caption reflects the metered/adjusted values. Try several films and times.

- [ ] **Step 9: Commit**

```bash
git add apps/mobile/src/components/reciprocity/chart-geometry.ts apps/mobile/src/components/reciprocity/chart-geometry.test.ts apps/mobile/src/components/reciprocity/reciprocity-chart.tsx apps/mobile/app/\(tabs\)/reciprocity.tsx
git commit -m "feat(mobile): native SVG reciprocity curve chart"
```

---

## Task 9: Changelog, version bump, full verification

**Files:**
- Modify: `apps/mobile/CHANGELOG.md`
- Modify: `apps/mobile/package.json` (CalVer)

**Interfaces:** none.

- [ ] **Step 1: Bump the mobile CalVer**

In `apps/mobile/package.json`, set `"version"` to the current push date in `YYYY.MM.DD` form (e.g. `"2026.06.22"`). Do not touch the root web `package.json`.

- [ ] **Step 2: Add a changelog entry**

Prepend a new entry to `apps/mobile/CHANGELOG.md` in Keep a Changelog format, e.g.:
```markdown
## [2026.06.22]

### Added
- Gradient backdrop with film-grain overlay, ported from the web dark theme.
- Native share, haptic steppers, and preset chips across calculators.
- Reciprocity: full film picker (14 stocks + custom), time presets, and an SVG reciprocity curve.
- Resize: print-size/enlarger-height and inch/cm segmented controls, plus an aspect-ratio preview.

### Changed
- Rebuilt the Exposure, Resize, and Reciprocity screens to web feature parity; removed the redundant in-page titles.
```

- [ ] **Step 3: Full gate**

Run from `apps/mobile/`:
```bash
bun run test && bun run typecheck && bun run lint
```
Expected: all pass.

- [ ] **Step 4: Format**

Run from the repo root:
```bash
bun run format
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/CHANGELOG.md apps/mobile/package.json
git commit -m "chore(mobile): changelog and version bump for beautification"
```

- [ ] **Step 6: Final on-device pass**

Launch the dev build once more and walk all three calculators end-to-end plus the gradient on every screen (including Border and Meter, which inherit the new background). Confirm nothing regressed.

---

## Self-Review notes

- **Spec coverage:** Section 1 → Tasks 1–3; per-calculator accents → Task 2 (`accents.ts`) used in 5/6/7/8; native extras (haptics/share/stepper) → Tasks 3–8; Exposure → Task 5; Resize (incl. aspect preview, in/cm) → Task 6; Reciprocity (film picker, presets, chart) → Tasks 7–8; verification/changelog/version → Task 9. All spec sections map to a task.
- **react-native-svg** is introduced in Task 1 (needed for the gradient) and reused in Tasks 6 and 8 — single dependency, three uses.
- **Type consistency:** `AccentColor`/`ACCENT` defined once (Task 2) and consumed unchanged; hook return shapes quoted in each screen task's Interfaces block match the audited `@dorkroom/logic` signatures.
- **Testing** honors the project rule: pure helpers (share-text, aspect geometry, chart geometry) are TDD'd; components are device-verified, no native mocks.
