# iOS Border Calculator Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder iOS border-calculator screen with a native port that mirrors the web "mobile" layout — a visual print/border preview plus full controls (aspect/paper/border, landscape & flip, H/V offsets, blade overlay, blade readings, warnings).

**Architecture:** Pure layout/format math lives in unit-tested `.ts` modules (the mobile vitest runner is node-only, `.ts`-only — it cannot render components). Thin presentational React Native components consume those pure functions and the existing `useBorderCalculator` hook from `@dorkroom/logic`. Controls follow a summary-row → bottom-sheet pattern (web's drawer), rebuilt on RN `Modal`.

**Tech Stack:** Expo SDK 54, React Native 0.81, React 19, NativeWind 4 (Tailwind classes via `className`), `@dorkroom/logic`, `@react-native-community/slider` (new), `react-native-safe-area-context` (existing), vitest 4 (node env).

## Global Constraints

- **No in-page header** on any mobile screen — content starts at the first card. (Project convention; the native tab bar labels the screen.)
- **Never use `any`** — use specific types or `unknown`.
- **Never import internal package paths** — import from `@dorkroom/logic` (and `@/...` for app-local).
- **Pure modules must not import from `react-native`** — only type-only imports from `@dorkroom/logic`, so they run under the node vitest env. Use `import type`.
- **Theme:** dark surface; accent rose `#e11d48` / `bg-rose-*`, muted text `text-white/60`, warnings amber. Reuse existing primitives (`Screen`, `GlassCard`, `OptionRow`, `ResultRow`).
- **Data hook:** `useBorderCalculator` from `@dorkroom/logic` (the modular composed hook — the public export; the deprecated monolith is `useLegacyBorderCalculator`). Do not switch to sub-hooks.
- Mobile tests live at `apps/mobile/src/**/*.test.ts`. Run a single file with: `cd apps/mobile && npx vitest run <relative-path>`.
- Final gate: `bun run test` (lint+test+build+typecheck) green AND `npx react-doctor@0.2.1 --verbose` = 100/100 on all three projects. Run `bun run format` after.

### Hook surface used by this plan (verbatim names/types)

State: `aspectRatio: string`, `paperSize: string`, `minBorder: number`, `enableOffset: boolean`, `horizontalOffset: number`, `verticalOffset: number`, `showBlades: boolean`, `showBladeReadings: boolean`, `isLandscape: boolean`, `isRatioFlipped: boolean`.
Warnings: `bladeWarning`, `minBorderWarning`, `paperSizeWarning`, `offsetWarning` — each `string | null`.
Setters: `setAspectRatio(v: string)`, `setPaperSize(v: string)`, `setMinBorderSlider(v: string | number)`, `setHorizontalOffsetSlider(v: string | number)`, `setVerticalOffsetSlider(v: string | number)`, `setEnableOffset(v: boolean)`, `setShowBlades(v: boolean)`, `setShowBladeReadings(v: boolean)`, `setIsLandscape(v: boolean)`, `setIsRatioFlipped(v: boolean)`, `resetToDefaults()`.
`calculation: BorderCalculation` — fields used: `paperWidth`, `paperHeight`, `printWidth`, `printHeight`, `leftBorderPercent`, `rightBorderPercent`, `topBorderPercent`, `bottomBorderPercent`, `printWidthPercent`, `printHeightPercent`, `leftBladeReading`, `rightBladeReading`, `topBladeReading`, `bottomBladeReading`, `bladeThickness`.
Constants from `@dorkroom/logic`: `ASPECT_RATIOS`, `PAPER_SIZES` (`{ label, value, ... }[]`), `SLIDER_MIN_BORDER` (0), `SLIDER_MAX_BORDER` (6), `SLIDER_STEP_BORDER` (0.125), `OFFSET_SLIDER_MIN` (-3), `OFFSET_SLIDER_MAX` (3), `OFFSET_SLIDER_STEP` (0.125).

## File Structure

```
apps/mobile/src/components/border/
  geometry.ts                       # T1  pure: paper box + print rect
  geometry.test.ts                  # T1
  blade-readings-layout.ts          # T2  pure: blade-reading label positions
  blade-readings-layout.test.ts     # T2
  format.ts                         # T3  pure: inch/caption/position formatting
  format.test.ts                    # T3
  border-preview.tsx                # T6  paper + print rect + blades
  blade-readings.tsx                # T6  reading labels overlay (consumes T2)
  nav-row.tsx                        # T5  summary row (label/value/chevron)
  slider-row.tsx                     # T5  labeled slider (consumes slider dep)
  warnings-card.tsx                  # T5  warning banners
  sections/
    paper-image-section.tsx         # T7  aspect+paper pills + landscape/flip
    border-size-section.tsx         # T7  min-border slider
    position-section.tsx            # T7  enable-offset + H/V sliders
apps/mobile/src/components/
  bottom-sheet.tsx                   # T5  RN Modal bottom sheet
  toggle-row.tsx                     # T5  reusable switch row
apps/mobile/app/(tabs)/index.tsx     # T8  rewritten screen (compose, no header)
apps/mobile/package.json             # T4  add slider dep
```

---

### Task 1: Preview geometry (pure)

**Files:**
- Create: `apps/mobile/src/components/border/geometry.ts`
- Test: `apps/mobile/src/components/border/geometry.test.ts`

**Interfaces:**
- Consumes: `BorderCalculation` (type only) from `@dorkroom/logic`.
- Produces:
  - `interface PaperBox { width: number; height: number }`
  - `computePaperBox(paperWidth: number, paperHeight: number, containerWidth: number, maxHeight: number): PaperBox`
  - `interface PrintRect { left: number; top: number; width: number; height: number }`
  - `computePrintRect(c: Pick<BorderCalculation, 'leftBorderPercent' | 'topBorderPercent' | 'printWidthPercent' | 'printHeightPercent'>, box: PaperBox): PrintRect`

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/src/components/border/geometry.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { computePaperBox, computePrintRect } from './geometry';

describe('computePaperBox', () => {
  it('fills container width when height fits under the cap', () => {
    // 8x10 portrait paper, aspect 0.8 -> height 375 would exceed cap 320
    expect(computePaperBox(8, 10, 300, 320)).toEqual({ width: 256, height: 320 });
  });

  it('uses full width when the resulting height is under the cap', () => {
    // square paper, aspect 1 -> height 300 <= cap 320
    expect(computePaperBox(8, 8, 300, 320)).toEqual({ width: 300, height: 300 });
  });

  it('returns a zero box for non-positive inputs', () => {
    expect(computePaperBox(8, 10, 0, 320)).toEqual({ width: 0, height: 0 });
    expect(computePaperBox(0, 10, 300, 320)).toEqual({ width: 0, height: 0 });
  });
});

describe('computePrintRect', () => {
  it('positions the print area from border/print percentages', () => {
    const rect = computePrintRect(
      {
        leftBorderPercent: 10,
        topBorderPercent: 20,
        printWidthPercent: 80,
        printHeightPercent: 60,
      },
      { width: 200, height: 100 },
    );
    expect(rect).toEqual({ left: 20, top: 20, width: 160, height: 60 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npx vitest run src/components/border/geometry.test.ts`
Expected: FAIL — cannot find module `./geometry`.

- [ ] **Step 3: Write minimal implementation**

Create `apps/mobile/src/components/border/geometry.ts`:

```ts
import type { BorderCalculation } from '@dorkroom/logic';

export interface PaperBox {
  width: number;
  height: number;
}

/**
 * Size the paper rectangle to its real aspect ratio, fitting the available
 * container width and a maximum height. Returns a zero box for invalid input.
 */
export function computePaperBox(
  paperWidth: number,
  paperHeight: number,
  containerWidth: number,
  maxHeight: number,
): PaperBox {
  if (
    paperWidth <= 0 ||
    paperHeight <= 0 ||
    containerWidth <= 0 ||
    maxHeight <= 0
  ) {
    return { width: 0, height: 0 };
  }
  const aspect = paperWidth / paperHeight;
  let width = containerWidth;
  let height = width / aspect;
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspect;
  }
  return { width, height };
}

export interface PrintRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Position the print area within the paper box using the hook's percentages. */
export function computePrintRect(
  c: Pick<
    BorderCalculation,
    'leftBorderPercent' | 'topBorderPercent' | 'printWidthPercent' | 'printHeightPercent'
  >,
  box: PaperBox,
): PrintRect {
  return {
    left: (c.leftBorderPercent / 100) * box.width,
    top: (c.topBorderPercent / 100) * box.height,
    width: (c.printWidthPercent / 100) * box.width,
    height: (c.printHeightPercent / 100) * box.height,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && npx vitest run src/components/border/geometry.test.ts`
Expected: PASS (5 assertions).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/components/border/geometry.ts apps/mobile/src/components/border/geometry.test.ts
git commit -m "feat(mobile): pure preview geometry for border calculator"
```

---

### Task 2: Blade-readings layout (pure)

Ports the web `BladeReadingsOverlay` positioning logic (inside vs. straddle, on-canvas clamping, arrow direction) to a pure function that returns pixel positions. RN has no `translate(-50%)`, so the function emits pixel `translateX`/`translateY` derived from fixed label-size constants.

**Files:**
- Create: `apps/mobile/src/components/border/blade-readings-layout.ts`
- Test: `apps/mobile/src/components/border/blade-readings-layout.test.ts`

**Interfaces:**
- Consumes: `BorderCalculation` (type only) from `@dorkroom/logic`.
- Produces:
  - `type BladeSide = 'left' | 'right' | 'top' | 'bottom'`
  - `interface BladeReadingLayout { side: BladeSide; reading: number; x: number; y: number; isInside: boolean; arrow: '←' | '→' | '↑' | '↓'; arrowFirst: boolean; translateX: number; translateY: number }`
  - `interface BladeReadingOptions { labelWidth?: number; labelHeight?: number; padding?: number }`
  - `computeBladeReadings(c: Pick<BorderCalculation, 'leftBorderPercent' | 'rightBorderPercent' | 'topBorderPercent' | 'bottomBorderPercent' | 'leftBladeReading' | 'rightBladeReading' | 'topBladeReading' | 'bottomBladeReading'>, boxWidth: number, boxHeight: number, options?: BladeReadingOptions): BladeReadingLayout[]` — always returns 4 entries in order left, right, top, bottom.

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/src/components/border/blade-readings-layout.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { computeBladeReadings } from './blade-readings-layout';

// Border 25% each side -> print is the middle 50% of a 400x400 box (200x200).
const largePrint = {
  leftBorderPercent: 25,
  rightBorderPercent: 25,
  topBorderPercent: 25,
  bottomBorderPercent: 25,
  leftBladeReading: 2,
  rightBladeReading: 2,
  topBladeReading: 2.5,
  bottomBladeReading: 2.5,
};

// Border 45% each side -> print is the middle 10% (40x40): labels go outside.
const smallPrint = {
  leftBorderPercent: 45,
  rightBorderPercent: 45,
  topBorderPercent: 45,
  bottomBorderPercent: 45,
  leftBladeReading: 3.6,
  rightBladeReading: 3.6,
  topBladeReading: 3.6,
  bottomBladeReading: 3.6,
};

const opts = { labelWidth: 64, labelHeight: 36, padding: 8 };

describe('computeBladeReadings', () => {
  it('returns four readings carrying the calculation values', () => {
    const r = computeBladeReadings(largePrint, 400, 400, opts);
    expect(r.map((x) => x.side)).toEqual(['left', 'right', 'top', 'bottom']);
    expect(r[0].reading).toBe(2);
    expect(r[2].reading).toBe(2.5);
  });

  it('places labels inside when the print area is large enough', () => {
    const [left, , top] = computeBladeReadings(largePrint, 400, 400, opts);
    // print spans 100..300 in both axes; centers at 200
    expect(left.isInside).toBe(true);
    expect(left.x).toBe(100); // printLeft
    expect(left.y).toBe(200); // centerY
    expect(left.arrow).toBe('←');
    expect(left.arrowFirst).toBe(true);
    expect(left.translateX).toBe(0);
    expect(left.translateY).toBe(-18); // -labelHeight/2
    expect(top.arrow).toBe('↑');
    expect(top.translateX).toBe(-32); // -labelWidth/2
    expect(top.translateY).toBe(0);
  });

  it('pushes labels outside and flips arrows when the print area is small', () => {
    const [left] = computeBladeReadings(smallPrint, 400, 400, opts);
    // printLeft = 180; clamp to max(labelWidth+padding=72, 180) = 180
    expect(left.isInside).toBe(false);
    expect(left.x).toBe(180);
    expect(left.arrow).toBe('→');
    expect(left.arrowFirst).toBe(false);
    expect(left.translateX).toBe(-64); // -labelWidth
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npx vitest run src/components/border/blade-readings-layout.test.ts`
Expected: FAIL — cannot find module `./blade-readings-layout`.

- [ ] **Step 3: Write minimal implementation**

Create `apps/mobile/src/components/border/blade-readings-layout.ts`:

```ts
import type { BorderCalculation } from '@dorkroom/logic';

export type BladeSide = 'left' | 'right' | 'top' | 'bottom';

export interface BladeReadingLayout {
  side: BladeSide;
  reading: number;
  x: number;
  y: number;
  isInside: boolean;
  arrow: '←' | '→' | '↑' | '↓';
  arrowFirst: boolean;
  translateX: number;
  translateY: number;
}

export interface BladeReadingOptions {
  labelWidth?: number;
  labelHeight?: number;
  padding?: number;
}

const DEFAULT_LABEL_WIDTH = 64;
const DEFAULT_LABEL_HEIGHT = 36;
const DEFAULT_PADDING = 8;

type ReadingInput = Pick<
  BorderCalculation,
  | 'leftBorderPercent'
  | 'rightBorderPercent'
  | 'topBorderPercent'
  | 'bottomBorderPercent'
  | 'leftBladeReading'
  | 'rightBladeReading'
  | 'topBladeReading'
  | 'bottomBladeReading'
>;

export function computeBladeReadings(
  c: ReadingInput,
  boxWidth: number,
  boxHeight: number,
  options: BladeReadingOptions = {},
): BladeReadingLayout[] {
  const labelWidth = options.labelWidth ?? DEFAULT_LABEL_WIDTH;
  const labelHeight = options.labelHeight ?? DEFAULT_LABEL_HEIGHT;
  const padding = options.padding ?? DEFAULT_PADDING;

  const printLeft = (c.leftBorderPercent / 100) * boxWidth;
  const printRight = ((100 - c.rightBorderPercent) / 100) * boxWidth;
  const printTop = (c.topBorderPercent / 100) * boxHeight;
  const printBottom = ((100 - c.bottomBorderPercent) / 100) * boxHeight;

  const printW = printRight - printLeft;
  const printH = printBottom - printTop;

  const hInside = printW > labelWidth * 2 + padding * 2;
  const vInside = printH > labelHeight * 2 + padding * 2;

  const centerX = (printLeft + printRight) / 2;
  const centerY = (printTop + printBottom) / 2;

  const leftX = hInside ? printLeft : Math.max(labelWidth + padding, printLeft);
  const rightX = hInside
    ? printRight
    : Math.min(boxWidth - labelWidth - padding, printRight);
  const topY = vInside ? printTop : Math.max(labelHeight + padding, printTop);
  const bottomY = vInside
    ? printBottom
    : Math.min(boxHeight - labelHeight - padding, printBottom);

  return [
    layoutFor('left', c.leftBladeReading, leftX, centerY, hInside, labelWidth, labelHeight),
    layoutFor('right', c.rightBladeReading, rightX, centerY, hInside, labelWidth, labelHeight),
    layoutFor('top', c.topBladeReading, centerX, topY, vInside, labelWidth, labelHeight),
    layoutFor('bottom', c.bottomBladeReading, centerX, bottomY, vInside, labelWidth, labelHeight),
  ];
}

function layoutFor(
  side: BladeSide,
  reading: number,
  x: number,
  y: number,
  isInside: boolean,
  labelWidth: number,
  labelHeight: number,
): BladeReadingLayout {
  const halfW = labelWidth / 2;
  const halfH = labelHeight / 2;
  const base = { side, reading, x, y, isInside };

  if (isInside) {
    switch (side) {
      case 'left':
        return { ...base, arrow: '←', arrowFirst: true, translateX: 0, translateY: -halfH };
      case 'right':
        return { ...base, arrow: '→', arrowFirst: false, translateX: -labelWidth, translateY: -halfH };
      case 'top':
        return { ...base, arrow: '↑', arrowFirst: true, translateX: -halfW, translateY: 0 };
      case 'bottom':
        return { ...base, arrow: '↓', arrowFirst: false, translateX: -halfW, translateY: -labelHeight };
    }
  }
  switch (side) {
    case 'left':
      return { ...base, arrow: '→', arrowFirst: false, translateX: -labelWidth, translateY: -halfH };
    case 'right':
      return { ...base, arrow: '←', arrowFirst: true, translateX: 0, translateY: -halfH };
    case 'top':
      return { ...base, arrow: '↓', arrowFirst: false, translateX: -halfW, translateY: -labelHeight };
    case 'bottom':
      return { ...base, arrow: '↑', arrowFirst: true, translateX: -halfW, translateY: 0 };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && npx vitest run src/components/border/blade-readings-layout.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/components/border/blade-readings-layout.ts apps/mobile/src/components/border/blade-readings-layout.test.ts
git commit -m "feat(mobile): pure blade-readings layout for border preview"
```

---

### Task 3: Display formatting (pure)

**Files:**
- Create: `apps/mobile/src/components/border/format.ts`
- Test: `apps/mobile/src/components/border/format.test.ts`

**Interfaces:**
- Consumes: `BorderCalculation` (type only) from `@dorkroom/logic`.
- Produces:
  - `formatInches(value: number, precision?: number): string` — trims trailing zeros, suffixes `"`.
  - `formatPreviewCaption(c: Pick<BorderCalculation, 'printWidth' | 'printHeight'>, paperLabel: string): string`
  - `formatPosition(enableOffset: boolean, horizontalOffset: number, verticalOffset: number): string`

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/src/components/border/format.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatInches, formatPosition, formatPreviewCaption } from './format';

describe('formatInches', () => {
  it('formats whole and fractional inches without trailing zeros', () => {
    expect(formatInches(7)).toBe('7"');
    expect(formatInches(0.5)).toBe('0.5"');
    expect(formatInches(6.25)).toBe('6.25"');
  });
});

describe('formatPreviewCaption', () => {
  it('describes the print size on the paper', () => {
    expect(formatPreviewCaption({ printWidth: 7, printHeight: 9 }, '8×10')).toBe(
      '7" × 9" image on 8×10',
    );
  });
});

describe('formatPosition', () => {
  it('reports Centered when offsets are disabled', () => {
    expect(formatPosition(false, 1, 2)).toBe('Centered');
  });

  it('reports H/V values to one decimal when enabled', () => {
    expect(formatPosition(true, 0.2, -0.5)).toBe('H: 0.2  V: -0.5');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npx vitest run src/components/border/format.test.ts`
Expected: FAIL — cannot find module `./format`.

- [ ] **Step 3: Write minimal implementation**

Create `apps/mobile/src/components/border/format.ts`:

```ts
import type { BorderCalculation } from '@dorkroom/logic';

/** Format an inch measurement, trimming trailing zeros: 0.5 -> '0.5"'. */
export function formatInches(value: number, precision = 2): string {
  const rounded = Number(value.toFixed(precision));
  return `${rounded}"`;
}

/** Caption under the preview: '7" × 9" image on 8×10'. */
export function formatPreviewCaption(
  c: Pick<BorderCalculation, 'printWidth' | 'printHeight'>,
  paperLabel: string,
): string {
  return `${formatInches(c.printWidth)} × ${formatInches(c.printHeight)} image on ${paperLabel}`;
}

/** Summary value for the Position & Offsets row. */
export function formatPosition(
  enableOffset: boolean,
  horizontalOffset: number,
  verticalOffset: number,
): string {
  if (!enableOffset) return 'Centered';
  return `H: ${horizontalOffset.toFixed(1)}  V: ${verticalOffset.toFixed(1)}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && npx vitest run src/components/border/format.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/components/border/format.ts apps/mobile/src/components/border/format.test.ts
git commit -m "feat(mobile): pure formatting helpers for border calculator"
```

---

### Task 4: Add slider dependency

`@react-native-community/slider` is the RN-standard slider used by the slider controls (Tasks 5/7). It is a native module — running on a device/simulator needs a dev-client rebuild (`expo run:ios` / EAS), but Metro typecheck and unit tests are unaffected.

**Files:**
- Modify: `apps/mobile/package.json` (dependencies)

- [ ] **Step 1: Install the dependency**

Run (from repo root):

```bash
cd apps/mobile && npx expo install @react-native-community/slider
```

`expo install` pins the version compatible with SDK 54. Expected: `package.json` gains `@react-native-community/slider` under `dependencies` and the lockfile updates.

- [ ] **Step 2: Verify it resolves and typechecks**

Run:

```bash
cd apps/mobile && npx tsc --noEmit
```

Expected: PASS (no errors). If `tsc` reports the workspace is unaffected, the dep is at least installed and resolvable.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/package.json bun.lock
git commit -m "chore(mobile): add @react-native-community/slider"
```

(If the lockfile is named differently, `git add -A apps/mobile` and the root lockfile.)

---

### Task 5: Shared presentational primitives

Five small presentational components reused by the preview, sections, and screen. No unit tests (the runner can't render RN); verified by typecheck + react-doctor.

**Files:**
- Create: `apps/mobile/src/components/bottom-sheet.tsx`
- Create: `apps/mobile/src/components/toggle-row.tsx`
- Create: `apps/mobile/src/components/border/nav-row.tsx`
- Create: `apps/mobile/src/components/border/slider-row.tsx`
- Create: `apps/mobile/src/components/border/warnings-card.tsx`

**Interfaces:**
- Consumes: `@react-native-community/slider` (Task 4), `react-native-safe-area-context` (existing), `@/components/glass-card` (existing).
- Produces:
  - `BottomSheet({ visible: boolean; title: string; onClose: () => void; children: ReactNode })`
  - `ToggleRow({ label: string; value: boolean; onChange: (value: boolean) => void })`
  - `NavRow({ label: string; value: string; onPress: () => void })`
  - `SliderRow({ label: string; value: number; min: number; max: number; step: number; displayValue: string; onChange: (value: number) => void })`
  - `WarningsCard({ warnings: string[] })` — renders nothing when empty.

- [ ] **Step 1: Create `bottom-sheet.tsx`**

```tsx
import type { ReactNode } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BottomSheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** A bottom-anchored sheet built on RN Modal (no native sheet library). */
export function BottomSheet({ visible, title, onClose, children }: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/60" onPress={onClose} accessibilityRole="button" />
      <View
        className="rounded-t-3xl bg-[#161618] px-5 pt-4"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-lg font-semibold text-white">{title}</Text>
          <Pressable onPress={onClose} accessibilityRole="button">
            <Text className="text-base font-semibold text-rose-500">Done</Text>
          </Pressable>
        </View>
        {children}
      </View>
    </Modal>
  );
}
```

- [ ] **Step 2: Create `toggle-row.tsx`**

```tsx
import { Pressable, Text, View } from 'react-native';

interface ToggleRowProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

/** A labelled on/off switch row. */
export function ToggleRow({ label, value, onChange }: ToggleRowProps) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      className="flex-row items-center justify-between rounded-xl bg-white/10 px-4 py-3"
    >
      <Text className="text-base text-white">{label}</Text>
      <View className={`h-6 w-11 justify-center rounded-full ${value ? 'bg-rose-600' : 'bg-white/20'}`}>
        <View className={`mx-0.5 h-5 w-5 rounded-full bg-white ${value ? 'self-end' : 'self-start'}`} />
      </View>
    </Pressable>
  );
}
```

- [ ] **Step 3: Create `border/nav-row.tsx`**

```tsx
import { Pressable, Text, View } from 'react-native';

interface NavRowProps {
  label: string;
  value: string;
  onPress: () => void;
}

/** Summary row that opens a settings sheet. */
export function NavRow({ label, value, onPress }: NavRowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="flex-row items-center justify-between rounded-xl bg-white/10 px-4 py-3"
    >
      <View className="gap-0.5">
        <Text className="text-xs text-white/50">{label}</Text>
        <Text className="text-base font-semibold text-white">{value}</Text>
      </View>
      <Text className="text-lg text-white/40">›</Text>
    </Pressable>
  );
}
```

- [ ] **Step 4: Create `border/slider-row.tsx`**

```tsx
import Slider from '@react-native-community/slider';
import { Text, View } from 'react-native';

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  displayValue: string;
  onChange: (value: number) => void;
}

/** A labelled slider with a live value readout. */
export function SliderRow({ label, value, min, max, step, displayValue, onChange }: SliderRowProps) {
  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm text-white/60">{label}</Text>
        <Text className="text-base font-semibold text-white">{displayValue}</Text>
      </View>
      <Slider
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor="#e11d48"
        maximumTrackTintColor="rgba(255,255,255,0.2)"
        thumbTintColor="#f5f5f4"
        accessibilityLabel={label}
      />
    </View>
  );
}
```

- [ ] **Step 5: Create `border/warnings-card.tsx`**

```tsx
import { Text, View } from 'react-native';
import { GlassCard } from '@/components/glass-card';

interface WarningsCardProps {
  warnings: string[];
}

/** Renders calculator warnings; nothing when there are none. */
export function WarningsCard({ warnings }: WarningsCardProps) {
  if (warnings.length === 0) return null;
  return (
    <GlassCard className="gap-2">
      {warnings.map((warning) => (
        <View key={warning} className="flex-row gap-2">
          <Text className="text-amber-400">⚠</Text>
          <Text className="flex-1 text-sm text-white/80">{warning}</Text>
        </View>
      ))}
    </GlassCard>
  );
}
```

- [ ] **Step 6: Typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/components/bottom-sheet.tsx apps/mobile/src/components/toggle-row.tsx apps/mobile/src/components/border/nav-row.tsx apps/mobile/src/components/border/slider-row.tsx apps/mobile/src/components/border/warnings-card.tsx
git commit -m "feat(mobile): shared primitives for border calculator UI"
```

---

### Task 6: Border preview + blade readings components

**Files:**
- Create: `apps/mobile/src/components/border/blade-readings.tsx`
- Create: `apps/mobile/src/components/border/border-preview.tsx`

**Interfaces:**
- Consumes: `computeBladeReadings` (T2), `computePaperBox`/`computePrintRect` (T1), `formatInches` (T3), `BorderCalculation` from `@dorkroom/logic`.
- Produces:
  - `BladeReadings({ calculation: BorderCalculation; boxWidth: number; boxHeight: number })`
  - `BorderPreview({ calculation: BorderCalculation; showBlades: boolean; showBladeReadings: boolean })`

- [ ] **Step 1: Create `blade-readings.tsx`**

```tsx
import type { BorderCalculation } from '@dorkroom/logic';
import { Text, View } from 'react-native';
import { computeBladeReadings } from './blade-readings-layout';
import { formatInches } from './format';

interface BladeReadingsProps {
  calculation: BorderCalculation;
  boxWidth: number;
  boxHeight: number;
}

/** Absolute-positioned blade-reading labels overlaid on the preview. */
export function BladeReadings({ calculation, boxWidth, boxHeight }: BladeReadingsProps) {
  const readings = computeBladeReadings(calculation, boxWidth, boxHeight);
  return (
    <View pointerEvents="none" className="absolute inset-0">
      {readings.map((r) => (
        <View
          key={r.side}
          className="absolute items-center gap-0.5 rounded-md bg-black/70 px-2 py-1"
          style={{
            left: r.x,
            top: r.y,
            flexDirection: r.side === 'top' || r.side === 'bottom' ? 'column' : 'row',
            transform: [{ translateX: r.translateX }, { translateY: r.translateY }],
          }}
        >
          {r.arrowFirst && <Text className="text-xs text-white">{r.arrow}</Text>}
          <Text className="text-xs font-medium text-white">{formatInches(r.reading)}</Text>
          {!r.arrowFirst && <Text className="text-xs text-white">{r.arrow}</Text>}
        </View>
      ))}
    </View>
  );
}
```

- [ ] **Step 2: Create `border-preview.tsx`**

```tsx
import type { BorderCalculation } from '@dorkroom/logic';
import { useState } from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import { BladeReadings } from './blade-readings';
import { computePaperBox, computePrintRect } from './geometry';

const MAX_PREVIEW_HEIGHT = 320;
const BLADE_MIN_THICKNESS = 2;

interface BorderPreviewProps {
  calculation: BorderCalculation;
  showBlades: boolean;
  showBladeReadings: boolean;
}

/** Native paper/print/blade visualization (replaces the web CSS preview). */
export function BorderPreview({ calculation, showBlades, showBladeReadings }: BorderPreviewProps) {
  const [containerWidth, setContainerWidth] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  const box = computePaperBox(
    calculation.paperWidth,
    calculation.paperHeight,
    containerWidth,
    MAX_PREVIEW_HEIGHT,
  );
  const print = computePrintRect(calculation, box);
  const bladeThickness = Math.max(calculation.bladeThickness, BLADE_MIN_THICKNESS);

  return (
    <View onLayout={onLayout} className="items-center">
      {box.width > 0 && (
        <View
          className="overflow-hidden rounded-lg bg-white/5"
          style={{ width: box.width, height: box.height }}
        >
          <View
            className="absolute bg-white/90"
            style={{ left: print.left, top: print.top, width: print.width, height: print.height }}
          />
          {showBlades && (
            <>
              <View className="absolute bg-rose-500" style={{ left: print.left, top: 0, width: bladeThickness, height: box.height }} />
              <View className="absolute bg-rose-500" style={{ left: print.left + print.width - bladeThickness, top: 0, width: bladeThickness, height: box.height }} />
              <View className="absolute bg-rose-500" style={{ left: 0, top: print.top, width: box.width, height: bladeThickness }} />
              <View className="absolute bg-rose-500" style={{ left: 0, top: print.top + print.height - bladeThickness, width: box.width, height: bladeThickness }} />
            </>
          )}
          {showBladeReadings && (
            <BladeReadings calculation={calculation} boxWidth={box.width} boxHeight={box.height} />
          )}
        </View>
      )}
    </View>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/components/border/blade-readings.tsx apps/mobile/src/components/border/border-preview.tsx
git commit -m "feat(mobile): native border/print preview with blades and readings"
```

---

### Task 7: Section components

The three editable sections shown inside bottom sheets. Custom `'custom'` aspect/paper options are filtered out (no numeric-entry UI this iteration).

**Files:**
- Create: `apps/mobile/src/components/border/sections/paper-image-section.tsx`
- Create: `apps/mobile/src/components/border/sections/border-size-section.tsx`
- Create: `apps/mobile/src/components/border/sections/position-section.tsx`

**Interfaces:**
- Consumes: `OptionRow` (existing), `ToggleRow` (T5), `SliderRow` (T5), `formatInches` (T3), constants from `@dorkroom/logic`.
- Produces:
  - `PaperImageSection({ aspectRatio: string; paperSize: string; isLandscape: boolean; isRatioFlipped: boolean; onAspectChange: (v: string) => void; onPaperChange: (v: string) => void; onToggleLandscape: (v: boolean) => void; onToggleFlip: (v: boolean) => void })`
  - `BorderSizeSection({ minBorder: number; onChange: (value: number) => void })`
  - `PositionSection({ enableOffset: boolean; horizontalOffset: number; verticalOffset: number; onToggleOffset: (v: boolean) => void; onHorizontalChange: (value: number) => void; onVerticalChange: (value: number) => void })`

- [ ] **Step 1: Create `sections/paper-image-section.tsx`**

```tsx
import { ASPECT_RATIOS, PAPER_SIZES } from '@dorkroom/logic';
import { View } from 'react-native';
import { OptionRow } from '@/components/option-row';
import { ToggleRow } from '@/components/toggle-row';

const aspectOptions = ASPECT_RATIOS.filter((r) => r.value !== 'custom').map((r) => ({
  label: r.value,
  value: r.value,
}));
const paperOptions = PAPER_SIZES.filter((p) => p.value !== 'custom').map((p) => ({
  label: p.label,
  value: p.value,
}));

interface PaperImageSectionProps {
  aspectRatio: string;
  paperSize: string;
  isLandscape: boolean;
  isRatioFlipped: boolean;
  onAspectChange: (value: string) => void;
  onPaperChange: (value: string) => void;
  onToggleLandscape: (value: boolean) => void;
  onToggleFlip: (value: boolean) => void;
}

export function PaperImageSection({
  aspectRatio,
  paperSize,
  isLandscape,
  isRatioFlipped,
  onAspectChange,
  onPaperChange,
  onToggleLandscape,
  onToggleFlip,
}: PaperImageSectionProps) {
  return (
    <View className="gap-4">
      <OptionRow label="Aspect ratio" options={aspectOptions} value={aspectRatio} onChange={onAspectChange} />
      <OptionRow label="Paper size" options={paperOptions} value={paperSize} onChange={onPaperChange} />
      <ToggleRow label="Landscape" value={isLandscape} onChange={onToggleLandscape} />
      <ToggleRow label="Flip ratio" value={isRatioFlipped} onChange={onToggleFlip} />
    </View>
  );
}
```

- [ ] **Step 2: Create `sections/border-size-section.tsx`**

```tsx
import { SLIDER_MAX_BORDER, SLIDER_MIN_BORDER, SLIDER_STEP_BORDER } from '@dorkroom/logic';
import { View } from 'react-native';
import { formatInches } from '../format';
import { SliderRow } from '../slider-row';

interface BorderSizeSectionProps {
  minBorder: number;
  onChange: (value: number) => void;
}

export function BorderSizeSection({ minBorder, onChange }: BorderSizeSectionProps) {
  return (
    <View className="gap-2">
      <SliderRow
        label="Minimum border"
        value={minBorder}
        min={SLIDER_MIN_BORDER}
        max={SLIDER_MAX_BORDER}
        step={SLIDER_STEP_BORDER}
        displayValue={formatInches(minBorder)}
        onChange={onChange}
      />
    </View>
  );
}
```

- [ ] **Step 3: Create `sections/position-section.tsx`**

```tsx
import { OFFSET_SLIDER_MAX, OFFSET_SLIDER_MIN, OFFSET_SLIDER_STEP } from '@dorkroom/logic';
import { View } from 'react-native';
import { ToggleRow } from '@/components/toggle-row';
import { SliderRow } from '../slider-row';

interface PositionSectionProps {
  enableOffset: boolean;
  horizontalOffset: number;
  verticalOffset: number;
  onToggleOffset: (value: boolean) => void;
  onHorizontalChange: (value: number) => void;
  onVerticalChange: (value: number) => void;
}

export function PositionSection({
  enableOffset,
  horizontalOffset,
  verticalOffset,
  onToggleOffset,
  onHorizontalChange,
  onVerticalChange,
}: PositionSectionProps) {
  return (
    <View className="gap-4">
      <ToggleRow label="Enable offsets" value={enableOffset} onChange={onToggleOffset} />
      {enableOffset && (
        <>
          <SliderRow
            label="Horizontal"
            value={horizontalOffset}
            min={OFFSET_SLIDER_MIN}
            max={OFFSET_SLIDER_MAX}
            step={OFFSET_SLIDER_STEP}
            displayValue={horizontalOffset.toFixed(2)}
            onChange={onHorizontalChange}
          />
          <SliderRow
            label="Vertical"
            value={verticalOffset}
            min={OFFSET_SLIDER_MIN}
            max={OFFSET_SLIDER_MAX}
            step={OFFSET_SLIDER_STEP}
            displayValue={verticalOffset.toFixed(2)}
            onChange={onVerticalChange}
          />
        </>
      )}
    </View>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: PASS. (If `OptionRow`'s generic balks at `string` options, confirm `aspectOptions`/`paperOptions` are typed `{ label: string; value: string }[]` — they are.)

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/components/border/sections
git commit -m "feat(mobile): border calculator setting sections"
```

---

### Task 8: Assemble the screen

Rewrite the border tab to compose everything, wire the hook, manage which sheet is open, and **omit the page-title header** (per the Global Constraints). This is the integration task — final verification runs the full gate and a manual device check.

**Files:**
- Modify (full rewrite): `apps/mobile/app/(tabs)/index.tsx`

**Interfaces:**
- Consumes: `useBorderCalculator` (`@dorkroom/logic`), all Task 5/6/7 components, `Screen`/`GlassCard` (existing), `formatInches`/`formatPosition`/`formatPreviewCaption` (T3).

- [ ] **Step 1: Replace the screen file**

Overwrite `apps/mobile/app/(tabs)/index.tsx`:

```tsx
import { useBorderCalculator } from '@dorkroom/logic';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { BottomSheet } from '@/components/bottom-sheet';
import { BorderPreview } from '@/components/border/border-preview';
import {
  formatInches,
  formatPosition,
  formatPreviewCaption,
} from '@/components/border/format';
import { NavRow } from '@/components/border/nav-row';
import { BorderSizeSection } from '@/components/border/sections/border-size-section';
import { PaperImageSection } from '@/components/border/sections/paper-image-section';
import { PositionSection } from '@/components/border/sections/position-section';
import { WarningsCard } from '@/components/border/warnings-card';
import { GlassCard } from '@/components/glass-card';
import { Screen } from '@/components/screen';

type SheetId = 'paperImage' | 'borderSize' | 'position' | null;

function ToggleButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={`flex-1 items-center rounded-xl py-3 ${active ? 'bg-rose-600' : 'bg-white/10'}`}
    >
      <Text className={active ? 'font-semibold text-white' : 'text-white/70'}>{label}</Text>
    </Pressable>
  );
}

export default function BorderScreen() {
  const calc = useBorderCalculator();
  const { calculation } = calc;
  const [sheet, setSheet] = useState<SheetId>(null);
  const closeSheet = () => setSheet(null);

  const paperLabel = `${calculation.paperWidth}×${calculation.paperHeight}`;
  const warnings = [
    calc.bladeWarning,
    calc.minBorderWarning,
    calc.paperSizeWarning,
    calc.offsetWarning,
  ].filter((w): w is string => Boolean(w));

  return (
    <Screen>
      <GlassCard className="gap-4">
        <BorderPreview
          calculation={calculation}
          showBlades={calc.showBlades}
          showBladeReadings={calc.showBladeReadings}
        />
        <Text className="text-center text-sm text-white/60">
          {formatPreviewCaption(calculation, paperLabel)}
        </Text>
      </GlassCard>

      <WarningsCard warnings={warnings} />

      <GlassCard className="gap-3">
        <NavRow
          label="Paper & image size"
          value={`${calc.aspectRatio} on ${paperLabel}`}
          onPress={() => setSheet('paperImage')}
        />
        <NavRow
          label="Border size"
          value={formatInches(calc.minBorder)}
          onPress={() => setSheet('borderSize')}
        />
        <NavRow
          label="Position & offsets"
          value={formatPosition(calc.enableOffset, calc.horizontalOffset, calc.verticalOffset)}
          onPress={() => setSheet('position')}
        />
        <View className="flex-row gap-3">
          <ToggleButton
            label={calc.showBlades ? 'Hide blades' : 'Show blades'}
            active={calc.showBlades}
            onPress={() => calc.setShowBlades(!calc.showBlades)}
          />
          <ToggleButton
            label={calc.showBladeReadings ? 'Hide readings' : 'Show readings'}
            active={calc.showBladeReadings}
            onPress={() => calc.setShowBladeReadings(!calc.showBladeReadings)}
          />
        </View>
      </GlassCard>

      <Pressable
        onPress={calc.resetToDefaults}
        accessibilityRole="button"
        className="items-center rounded-full border border-white/15 py-3"
      >
        <Text className="font-semibold text-rose-400">Reset to defaults</Text>
      </Pressable>

      <BottomSheet visible={sheet === 'paperImage'} title="Paper & image size" onClose={closeSheet}>
        <PaperImageSection
          aspectRatio={calc.aspectRatio}
          paperSize={calc.paperSize}
          isLandscape={calc.isLandscape}
          isRatioFlipped={calc.isRatioFlipped}
          onAspectChange={calc.setAspectRatio}
          onPaperChange={calc.setPaperSize}
          onToggleLandscape={calc.setIsLandscape}
          onToggleFlip={calc.setIsRatioFlipped}
        />
      </BottomSheet>

      <BottomSheet visible={sheet === 'borderSize'} title="Border size" onClose={closeSheet}>
        <BorderSizeSection minBorder={calc.minBorder} onChange={calc.setMinBorderSlider} />
      </BottomSheet>

      <BottomSheet visible={sheet === 'position'} title="Position & offsets" onClose={closeSheet}>
        <PositionSection
          enableOffset={calc.enableOffset}
          horizontalOffset={calc.horizontalOffset}
          verticalOffset={calc.verticalOffset}
          onToggleOffset={calc.setEnableOffset}
          onHorizontalChange={calc.setHorizontalOffsetSlider}
          onVerticalChange={calc.setVerticalOffsetSlider}
        />
      </BottomSheet>
    </Screen>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Run the full gate**

Run (repo root): `bun run test`
Expected: lint + unit tests (incl. the three new pure-module suites) + build + typecheck all green.

- [ ] **Step 4: Run React Doctor**

Run: `npx react-doctor@0.2.1 --verbose`
Expected: `@dorkroom/source`, `@dorkroom/logic`, `@dorkroom/ui` each 100/100. Fix any regression introduced by the new files (prefer a real fix; suppress only a justified false positive with a `// eslint-disable-next-line react-doctor/<rule> -- why` comment).

- [ ] **Step 5: Format**

Run: `bun run format`

- [ ] **Step 6: Manual device verification**

Rebuild the dev client (the slider is a native module) and run on a simulator/device:

```bash
cd apps/mobile && npx expo run:ios
```

Confirm on the Border tab:
1. No page-title header; preview card is first.
2. Changing aspect ratio / paper size / min border re-lays the print rect instantly and correctly; caption updates.
3. Landscape and Flip-ratio toggles re-orient the preview.
4. Enabling offsets + dragging H/V sliders shifts the print rect; "Centered" → "H/V" summary updates.
5. Blades toggle shows/hides the four blade lines; Readings toggle shows/hides labels that reposition inside vs. outside as the print area shrinks/grows.
6. A small min border (< 0.25") and an offset that pushes the image off-paper each surface a warning banner.
7. Reset returns every control to defaults.

- [ ] **Step 7: Commit**

```bash
git add "apps/mobile/app/(tabs)/index.tsx"
git commit -m "feat(mobile): port border calculator screen with native preview and full controls"
```

---

## Self-Review notes

- **Spec coverage:** preview (T1/T6), blade readings (T2/T6), formatting/caption (T3), warnings (T5/T8), aspect+paper+landscape+flip (T7 paper-image), min border slider (T7 border-size), H/V offsets (T7 position), summary-row+sheet pattern (T5/T8), no-header convention (T8), slider dep (T4). Presets/sharing/custom-entry remain out of scope per spec.
- **Range note:** the spec illustrated min-border 0.25–1.5" and offsets −2…+2; the plan uses the canonical `@dorkroom/logic` slider constants (border 0–6, offset −3…+3) to stay DRY and match web behavior.
- **Type consistency:** pure functions take `Pick<BorderCalculation, …>`; components pass full `calculation` (assignable). Slider setters `(v: string | number) => void` are assignable to the `(value: number) => void` props (number ⊆ string|number). Boolean setters match `ToggleRow`/`ToggleButton` `(v: boolean)` callbacks.
- **Warnings styling:** single amber treatment for all four warnings (web distinguishes error vs. warning); acceptable for v1, can be refined later.
```
