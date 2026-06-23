# Mobile Navigation Skeleton + Easy Ports — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Expo/React Native mobile app a customizable 4-tool tab bar + a categorized "More" hub that scales to full web parity, and port the Mat, Lens, and Camera Exposure calculators plus a Settings screen.

**Architecture:** A single tool registry (`src/lib/tools.ts`) is the source of truth for every destination. An MMKV-persisted ordered list of pinned tool ids drives `NativeTabs` (up to 4 pinned tools + a fixed "More" trigger). Each tool's UI lives once as a shared component in `src/screens/`, mounted from a header-less `(tabs)` route when pinned and from a header'd `(tabs)/more` stack route when reached through the hub. An Edit screen rewrites the pinned list and the tab bar re-renders live.

**Tech Stack:** Expo Router 6 (`unstable-native-tabs`), React Native 0.81, `react-native-mmkv` 3, `@dorkroom/logic` pure calc utilities, NativeWind (`className`), Vitest 4 (pure-module tests only).

## Global Constraints

- Never use `any` — use specific types or `unknown`.
- Never import internal package paths — always `@dorkroom/logic` / `@dorkroom/api` / `@dorkroom/ui`.
- Do not modify the web app (`apps/dorkroom/`) or any `packages/` source — mobile ports wrap existing shared utils.
- Avoid the words "warning" / "error" in any new file name (false-flags the build log).
- Conventional commits, short messages. Do not push.
- `bun run test` must pass and React Doctor must stay **100/100** for all three projects before the feature is considered done: `npx react-doctor@0.2.1 --verbose`.
- Mobile tests are Vitest over **pure modules only** (no React Native component rendering harness exists). Native navigation and screen UI are verified by running the app.
- Theme is force-dark on mobile (`Appearance.setColorScheme('dark')` in `app/_layout.tsx`) — do not add a theme toggle.
- Versioning: on push to main, bump `apps/mobile/package.json` to CalVer `YYYY.MM.DD` and add a `apps/mobile/CHANGELOG.md` entry (mobile has its own changelog, separate from root).

---

## File Structure

**Created:**
- `apps/mobile/src/lib/tools.ts` — tool registry + category metadata + lookup helpers.
- `apps/mobile/src/lib/tab-bar-settings.ts` — MMKV persistence for the pinned tool ids.
- `apps/mobile/src/hooks/use-pinned-tabs.ts` — reactive read/write of the pinned set.
- `apps/mobile/src/screens/border-screen.tsx`, `exposure-screen.tsx`, `reciprocity-screen.tsx`, `resize-screen.tsx`, `meter-screen.tsx` — existing screen bodies, extracted.
- `apps/mobile/src/screens/mat-screen.tsx`, `lens-screen.tsx`, `camera-exposure-screen.tsx` — **"Coming soon" stub screens** (real ports deferred — see note below).
- `apps/mobile/src/screens/settings-screen.tsx` — new (real) screen.
- `apps/mobile/src/components/coming-soon.tsx` — shared stub body.
- `apps/mobile/app/(tabs)/mat.tsx`, `lenses.tsx`, `camera-exposure.tsx`, `settings.tsx` — header-less tab routes.
- `apps/mobile/app/(tabs)/more/_layout.tsx` — Stack for the hub.
- `apps/mobile/app/(tabs)/more/index.tsx` — categorized + searchable hub list.
- `apps/mobile/app/(tabs)/more/[tool].tsx` — header'd detail route rendering a shared screen by id.
- `apps/mobile/app/(tabs)/more/edit.tsx` — Edit Tabs screen.
- `apps/mobile/src/components/tool-list-row.tsx` — shared list row for hub + edit screens.
- Test files: `src/lib/tools.test.ts`, `src/lib/tab-bar-settings.test.ts`.

> **Deferred — Mat / Lens / Camera Exposure are stubbed in this plan.** `@dorkroom/logic` exposes only pure calc *utilities* for these three, not ready-made hooks (the web pages assemble local hooks from the utils). Rather than build throwaway mobile-local wrappers, this plan ships them as "Coming soon" stubs that are fully wired into the nav (registry entry, More hub, pinnable). Their real implementation is a **follow-up spec: "Extract `useMatCalculator` / `useLensCalculator` / `useCameraExposureCalculator` into `@dorkroom/logic`"** so web and mobile share one hook. Once those hooks exist, each stub screen is swapped for the real UI in a small follow-up.

**Modified:**
- `apps/mobile/app/(tabs)/_layout.tsx` — render `NativeTabs` from the pinned set + a fixed More trigger.
- `apps/mobile/app/(tabs)/index.tsx`, `exposure.tsx`, `reciprocity.tsx`, `resize.tsx`, `meter.tsx` — become thin routes that render the extracted screens.
- `apps/mobile/app.json` — keep quick actions aligned with default pins (no structural change expected).
- `apps/mobile/CHANGELOG.md`, `apps/mobile/package.json` — changelog + CalVer bump (final task).

---

## Task 1: Spike — native-tabs dynamic & triggerless-route behavior

This gates only `(tabs)/_layout.tsx` and how the hub navigates. Everything else is independent. Resolve it first with a throwaway proof, then record the decision.

**Files:**
- Modify (temporarily): `apps/mobile/app/(tabs)/_layout.tsx`
- Create: `apps/mobile/app/(tabs)/_spike.md` (decision record; deleted at end of task)

**Interfaces:**
- Produces: a recorded decision — **Outcome A** (triggerless `(tabs)` routes are hidden, not phantom tabs → primary design works as written) or **Outcome B** (triggerless routes misbehave → fallback noted below).

- [ ] **Step 1: Add a temporary triggerless route + dynamic trigger list**

In `app/(tabs)/_layout.tsx`, temporarily render the triggers from an array and add one extra route file `app/(tabs)/_spike-extra.tsx` (default-export a `<View>`), but give it **no** `NativeTabs.Trigger`:

```tsx
const PINNED = ['index', 'exposure', 'reciprocity', 'resize'] as const;
// render: PINNED.map(name => <NativeTabs.Trigger name={name}>…</NativeTabs.Trigger>)
//         + a fixed <NativeTabs.Trigger name="meter">…</NativeTabs.Trigger>
// (meter stands in for the future "more" tab here)
```

- [ ] **Step 2: Run the app and observe the tab bar**

Run: `cd apps/mobile && bun run ios` (or the project's run skill).
Observe: Does the tab bar show exactly 5 triggers with NO phantom tab for `_spike-extra`? Can you `router.navigate('/_spike-extra')` to it programmatically?

- [ ] **Step 3: Record the decision**

Write the outcome to `app/(tabs)/_spike.md`:
- **Outcome A (expected):** triggerless routes are hidden; programmatic navigation works → the rest of the plan proceeds unchanged. Non-pinned tools are reached via the More stack (`more/[tool]`), so triggerless `(tabs)` tool routes simply sit inert until pinned.
- **Outcome B (fallback):** triggerless routes render as phantom tabs OR break rendering → render a `NativeTabs.Trigger` for **every** tool and let iOS auto-overflow into its native "More"; the Edit screen then only reorders (no hide/show), and `more/` is dropped. Note this in the file; later tasks for `more/` become "configure iOS overflow order" instead.

- [ ] **Step 4: Revert the spike scaffolding**

Delete `app/(tabs)/_spike-extra.tsx` and restore `_layout.tsx` to its original committed state. Keep `_spike.md`.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/\(tabs\)/_spike.md
git commit -m "chore(mobile): record native-tabs routing spike decision"
```

> The remaining tasks assume **Outcome A**. If Outcome B, apply the fallback noted in Step 3 to Tasks 5–7 (single trigger set + iOS overflow); all other tasks are unaffected.

---

## Task 2: Tool registry

**Files:**
- Create: `apps/mobile/src/lib/tools.ts`
- Test: `apps/mobile/src/lib/tools.test.ts`

**Interfaces:**
- Produces:
  - `type ToolCategory = 'printing' | 'film' | 'camera' | 'reference' | 'system'`
  - `interface Tool { id: string; label: string; sfSymbol: string; route: string; category: ToolCategory }`
  - `const TOOLS: readonly Tool[]`
  - `const DEFAULT_PINNED_IDS: readonly string[]` = `['meter', 'border', 'reciprocity', 'exposure']`
  - `function getTool(id: string): Tool | undefined`
  - `const CATEGORY_ORDER: readonly ToolCategory[]` and `const CATEGORY_LABELS: Record<ToolCategory, string>`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/tools.test.ts
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PINNED_IDS,
  getTool,
  TOOLS,
  type Tool,
} from './tools';

describe('tool registry', () => {
  it('exposes a unique id for every tool', () => {
    const ids = TOOLS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('default pins all resolve to real tools', () => {
    for (const id of DEFAULT_PINNED_IDS) {
      expect(getTool(id)).toBeDefined();
    }
  });

  it('includes the new ports and settings', () => {
    const ids = TOOLS.map((t: Tool) => t.id);
    expect(ids).toEqual(
      expect.arrayContaining(['mat', 'lens', 'camera-exposure', 'settings'])
    );
  });

  it('getTool returns undefined for unknown ids', () => {
    expect(getTool('nope')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && bun run test -- tools`
Expected: FAIL — cannot resolve `./tools`.

- [ ] **Step 3: Write the registry**

```ts
// src/lib/tools.ts
export type ToolCategory =
  | 'printing'
  | 'film'
  | 'camera'
  | 'reference'
  | 'system';

export interface Tool {
  id: string;
  label: string;
  sfSymbol: string;
  route: string; // expo-router pathname for the More-stack detail route
  category: ToolCategory;
}

export const TOOLS: readonly Tool[] = [
  { id: 'border', label: 'Border', sfSymbol: 'square.dashed', route: '/more/border', category: 'printing' },
  { id: 'resize', label: 'Resize', sfSymbol: 'aspectratio', route: '/more/resize', category: 'printing' },
  { id: 'exposure', label: 'Exposure', sfSymbol: 'plusminus', route: '/more/exposure', category: 'printing' },
  { id: 'mat', label: 'Mat Cut', sfSymbol: 'rectangle.inset.filled', route: '/more/mat', category: 'printing' },
  { id: 'reciprocity', label: 'Reciprocity', sfSymbol: 'timer', route: '/more/reciprocity', category: 'film' },
  { id: 'lens', label: 'Lenses', sfSymbol: 'camera.metering.matrix', route: '/more/lens', category: 'camera' },
  { id: 'camera-exposure', label: 'Camera Exposure', sfSymbol: 'sun.max', route: '/more/camera-exposure', category: 'camera' },
  { id: 'meter', label: 'Meter', sfSymbol: 'camera.aperture', route: '/more/meter', category: 'camera' },
  { id: 'settings', label: 'Settings', sfSymbol: 'gearshape', route: '/more/settings', category: 'system' },
];

export const DEFAULT_PINNED_IDS: readonly string[] = [
  'meter',
  'border',
  'reciprocity',
  'exposure',
];

export const CATEGORY_ORDER: readonly ToolCategory[] = [
  'printing',
  'film',
  'camera',
  'reference',
  'system',
];

export const CATEGORY_LABELS: Record<ToolCategory, string> = {
  printing: 'Printing',
  film: 'Film',
  camera: 'Camera',
  reference: 'Reference',
  system: 'System',
};

const TOOL_BY_ID = new Map(TOOLS.map((t) => [t.id, t]));

export function getTool(id: string): Tool | undefined {
  return TOOL_BY_ID.get(id);
}
```

(Verify each `sfSymbol` renders on device during a later screen task; swap any that show blank for a valid SF Symbol name.)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && bun run test -- tools`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/tools.ts apps/mobile/src/lib/tools.test.ts
git commit -m "feat(mobile): add tool registry for nav"
```

---

## Task 3: Pinned-tabs persistence + hook

**Files:**
- Create: `apps/mobile/src/lib/tab-bar-settings.ts`
- Create: `apps/mobile/src/hooks/use-pinned-tabs.ts`
- Test: `apps/mobile/src/lib/tab-bar-settings.test.ts`

**Interfaces:**
- Consumes: `DEFAULT_PINNED_IDS`, `getTool` from `src/lib/tools.ts`.
- Produces:
  - `function getPinnedIds(): string[]` — persisted ordered ids, filtered to existing tools, capped at 4; falls back to `DEFAULT_PINNED_IDS` when unset/empty.
  - `function setPinnedIds(ids: string[]): void`
  - `const MAX_PINNED = 4`
  - `function usePinnedTabs(): { pinned: string[]; setPinned: (ids: string[]) => void }`

- [ ] **Step 1: Write the failing test**

The test mocks `react-native-mmkv` with an in-memory map (mirrors `src/polyfills/local-storage-shim.test.ts` style):

```ts
// src/lib/tab-bar-settings.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();
vi.mock('react-native-mmkv', () => ({
  MMKV: class {
    getString(k: string) { return store.get(k); }
    set(k: string, v: string) { store.set(k, v); }
    delete(k: string) { store.delete(k); }
  },
}));

import { getPinnedIds, MAX_PINNED, setPinnedIds } from './tab-bar-settings';
import { DEFAULT_PINNED_IDS } from './tools';

describe('tab-bar-settings', () => {
  beforeEach(() => store.clear());

  it('returns the defaults when unset', () => {
    expect(getPinnedIds()).toEqual([...DEFAULT_PINNED_IDS]);
  });

  it('round-trips a saved set', () => {
    setPinnedIds(['border', 'resize']);
    expect(getPinnedIds()).toEqual(['border', 'resize']);
  });

  it('drops unknown ids and caps at MAX_PINNED', () => {
    setPinnedIds(['border', 'nope', 'resize', 'meter', 'exposure', 'mat']);
    const result = getPinnedIds();
    expect(result).not.toContain('nope');
    expect(result.length).toBeLessThanOrEqual(MAX_PINNED);
  });

  it('falls back to defaults when the saved set is empty', () => {
    setPinnedIds([]);
    expect(getPinnedIds()).toEqual([...DEFAULT_PINNED_IDS]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && bun run test -- tab-bar-settings`
Expected: FAIL — cannot resolve `./tab-bar-settings`.

- [ ] **Step 3: Write persistence + hook**

```ts
// src/lib/tab-bar-settings.ts
import { MMKV } from 'react-native-mmkv';
import { DEFAULT_PINNED_IDS, getTool } from './tools';

const storage = new MMKV({ id: 'dorkroom-tab-bar' });
const KEY = 'pinnedToolIds';

export const MAX_PINNED = 4;

export function getPinnedIds(): string[] {
  const raw = storage.getString(KEY);
  if (!raw) return [...DEFAULT_PINNED_IDS];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [...DEFAULT_PINNED_IDS];
  }
  if (!Array.isArray(parsed)) return [...DEFAULT_PINNED_IDS];
  const valid = parsed
    .filter((id): id is string => typeof id === 'string' && getTool(id) !== undefined)
    .slice(0, MAX_PINNED);
  return valid.length > 0 ? valid : [...DEFAULT_PINNED_IDS];
}

export function setPinnedIds(ids: string[]): void {
  storage.set(KEY, JSON.stringify(ids.slice(0, MAX_PINNED)));
}
```

```ts
// src/hooks/use-pinned-tabs.ts
import { useCallback, useState } from 'react';
import { getPinnedIds, setPinnedIds } from '@/lib/tab-bar-settings';

export function usePinnedTabs() {
  const [pinned, setPinnedState] = useState(getPinnedIds);
  const setPinned = useCallback((ids: string[]) => {
    setPinnedIds(ids);
    setPinnedState(getPinnedIds());
  }, []);
  return { pinned, setPinned };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && bun run test -- tab-bar-settings`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/lib/tab-bar-settings.ts apps/mobile/src/lib/tab-bar-settings.test.ts apps/mobile/src/hooks/use-pinned-tabs.ts
git commit -m "feat(mobile): persist pinned tab set"
```

---

## Task 4: Extract existing screens into `src/screens/`

Pure refactor — move each current `(tabs)/*.tsx` screen body into `src/screens/<id>-screen.tsx`, then re-export it from the route file. No behavior change; existing geometry/format tests stay green.

**Files:**
- Create: `src/screens/border-screen.tsx`, `exposure-screen.tsx`, `reciprocity-screen.tsx`, `resize-screen.tsx`, `meter-screen.tsx`
- Modify: `app/(tabs)/index.tsx`, `exposure.tsx`, `reciprocity.tsx`, `resize.tsx`, `meter.tsx`

**Interfaces:**
- Produces: named exports `BorderScreen`, `ExposureScreen`, `ReciprocityScreen`, `ResizeScreen`, `MeterScreen` from `src/screens/`.

- [ ] **Step 1: Move the body (example: exposure)**

Create `src/screens/exposure-screen.tsx` containing the exact current contents of `app/(tabs)/exposure.tsx`, but rename the export:

```tsx
// src/screens/exposure-screen.tsx
// ...identical imports and JSX as the current (tabs)/exposure.tsx...
export function ExposureScreen() {
  // ...unchanged body...
}
```

- [ ] **Step 2: Make the route a thin re-export**

```tsx
// app/(tabs)/exposure.tsx
import { ExposureScreen } from '@/screens/exposure-screen';
export default ExposureScreen;
```

- [ ] **Step 3: Repeat for index (Border), reciprocity, resize, meter**

Apply Steps 1–2 to each. `index.tsx` → `BorderScreen` in `src/screens/border-screen.tsx`. Keep meter's full-screen (non-`Screen`-wrapped) layout exactly as-is.

- [ ] **Step 4: Verify build + existing tests + app render**

Run: `cd apps/mobile && bun run test && bunx tsc --noEmit -p tsconfig.json`
Then run the app and confirm all 5 tabs render identically to before.
Expected: tests PASS, typecheck clean, app unchanged.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/src/screens apps/mobile/app/\(tabs\)
git commit -m "refactor(mobile): extract tab screens into src/screens"
```

---

## Task 5: Render the tab bar from the pinned set

**Files:**
- Modify: `app/(tabs)/_layout.tsx`

**Interfaces:**
- Consumes: `usePinnedTabs`, `getTool`, the More route.

- [ ] **Step 1: Render triggers from the pinned ids + a fixed More trigger**

```tsx
// app/(tabs)/_layout.tsx
import { useQuickActionRouting } from 'expo-quick-actions/router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { usePinnedTabs } from '@/hooks/use-pinned-tabs';
import { getTool } from '@/lib/tools';

// Maps a tool id to its (tabs) route name. 'border' is the index route.
const ROUTE_NAME: Record<string, string> = {
  border: 'index',
  exposure: 'exposure',
  reciprocity: 'reciprocity',
  resize: 'resize',
  meter: 'meter',
  mat: 'mat',
  lens: 'lenses',
  'camera-exposure': 'camera-exposure',
  settings: 'settings',
};

export default function TabsLayout() {
  useQuickActionRouting();
  const { pinned } = usePinnedTabs();

  return (
    <NativeTabs>
      {pinned.map((id) => {
        const tool = getTool(id);
        if (!tool) return null;
        return (
          <NativeTabs.Trigger key={id} name={ROUTE_NAME[id]}>
            <Icon sf={tool.sfSymbol} />
            <Label>{tool.label}</Label>
          </NativeTabs.Trigger>
        );
      })}
      <NativeTabs.Trigger name="more">
        <Icon sf="ellipsis" />
        <Label>More</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
```

- [ ] **Step 2: Create the shared "Coming soon" stub body**

The three calculators (Mat, Lens, Camera Exposure) are stubbed in this plan — their real UI awaits the hook-extraction follow-up. Build one reusable stub body now so Task 6's screen imports resolve:

```tsx
// src/components/coming-soon.tsx
import { Text, View } from 'react-native';
import { GradientBackground } from '@/components/gradient-background';

export function ComingSoon({ title }: { title: string }) {
  return (
    <View className="flex-1 items-center justify-center">
      <GradientBackground />
      <Text className="text-lg font-semibold text-white">{title}</Text>
      <Text className="mt-2 px-8 text-center text-white/50">
        Coming soon to mobile.
      </Text>
    </View>
  );
}
```

- [ ] **Step 3: Create the four new screen components + their routes**

Stub screens for the three calculators (settings gets its real screen in Task 8):

```tsx
// src/screens/mat-screen.tsx
import { ComingSoon } from '@/components/coming-soon';
export function MatScreen() { return <ComingSoon title="Mat Cut" />; }
```

```tsx
// src/screens/lens-screen.tsx
import { ComingSoon } from '@/components/coming-soon';
export function LensScreen() { return <ComingSoon title="Lens Equivalency" />; }
```

```tsx
// src/screens/camera-exposure-screen.tsx
import { ComingSoon } from '@/components/coming-soon';
export function CameraExposureScreen() { return <ComingSoon title="Camera Exposure" />; }
```

Temporary Settings stub (replaced in Task 8):

```tsx
// src/screens/settings-screen.tsx
import { ComingSoon } from '@/components/coming-soon';
export function SettingsScreen() { return <ComingSoon title="Settings" />; }
```

Thin tab routes for each (so every `ROUTE_NAME` target resolves):

```tsx
// app/(tabs)/mat.tsx
export { MatScreen as default } from '@/screens/mat-screen';
// app/(tabs)/lenses.tsx
export { LensScreen as default } from '@/screens/lens-screen';
// app/(tabs)/camera-exposure.tsx
export { CameraExposureScreen as default } from '@/screens/camera-exposure-screen';
// app/(tabs)/settings.tsx
export { SettingsScreen as default } from '@/screens/settings-screen';
```

- [ ] **Step 4: Verify the tab bar reflects defaults**

Run the app. Expected: tabs show Meter, Border, Reciprocity, Exposure, More (per `DEFAULT_PINNED_IDS`). Per Task 1 Outcome A, the unpinned `mat/lenses/camera-exposure/settings/resize` routes are hidden, not phantom tabs.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/\(tabs\) apps/mobile/src/screens apps/mobile/src/components/coming-soon.tsx
git commit -m "feat(mobile): render tab bar from pinned set + stub new screens"
```

---

## Task 6: The "More" hub (stack + categorized list + detail mount)

**Files:**
- Create: `app/(tabs)/more/_layout.tsx`, `app/(tabs)/more/index.tsx`, `app/(tabs)/more/[tool].tsx`
- Create: `src/components/tool-list-row.tsx`

**Interfaces:**
- Consumes: `TOOLS`, `CATEGORY_ORDER`, `CATEGORY_LABELS`, `getTool`; all `src/screens/*` exports.
- Produces: a `more` tab whose index lists every tool by category with search, and a `[tool]` detail route that mounts the matching screen with a native header.

- [ ] **Step 1: Stack layout (detail routes get headers; index does not)**

```tsx
// app/(tabs)/more/_layout.tsx
import { Stack } from 'expo-router';

export default function MoreLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, headerLargeTitle: true }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="edit" options={{ title: 'Edit Tabs', presentation: 'modal' }} />
    </Stack>
  );
}
```

- [ ] **Step 2: Shared list row**

```tsx
// src/components/tool-list-row.tsx
import { Pressable, Text } from 'react-native';

export function ToolListRow({
  label,
  onPress,
  accessory,
}: {
  label: string;
  onPress: () => void;
  accessory?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between px-4 py-3 active:opacity-60"
    >
      <Text className="text-base text-white">{label}</Text>
      {accessory ? <Text className="text-white/40">{accessory}</Text> : null}
    </Pressable>
  );
}
```

- [ ] **Step 3: Hub index — search + categorized list + Edit entry**

```tsx
// app/(tabs)/more/index.tsx
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { SectionList, Text, TextInput, View } from 'react-native';
import { GradientBackground } from '@/components/gradient-background';
import { ToolListRow } from '@/components/tool-list-row';
import { CATEGORY_LABELS, CATEGORY_ORDER, TOOLS } from '@/lib/tools';

export default function MoreIndex() {
  const [query, setQuery] = useState('');
  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CATEGORY_ORDER.map((category) => ({
      title: CATEGORY_LABELS[category],
      data: TOOLS.filter(
        (t) => t.category === category && t.label.toLowerCase().includes(q)
      ),
    })).filter((s) => s.data.length > 0);
  }, [query]);

  return (
    <View className="flex-1">
      <GradientBackground />
      <SectionList
        contentInsetAdjustmentBehavior="automatic"
        sections={sections}
        keyExtractor={(t) => t.id}
        ListHeaderComponent={
          <View className="gap-3 p-4">
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search tools"
              placeholderTextColor="rgba(255,255,255,0.4)"
              className="rounded-xl bg-white/10 px-4 py-3 text-white"
            />
            <ToolListRow label="Edit Tabs" onPress={() => router.push('/more/edit')} accessory="›" />
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text className="px-4 pb-1 pt-4 text-xs uppercase tracking-wide text-white/40">
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => (
          <ToolListRow label={item.label} accessory="›" onPress={() => router.push(item.route)} />
        )}
      />
    </View>
  );
}
```

- [ ] **Step 4: Detail route mounts the screen by id**

```tsx
// app/(tabs)/more/[tool].tsx
import { Stack, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { getTool } from '@/lib/tools';
import { BorderScreen } from '@/screens/border-screen';
import { CameraExposureScreen } from '@/screens/camera-exposure-screen';
import { ExposureScreen } from '@/screens/exposure-screen';
import { LensScreen } from '@/screens/lens-screen';
import { MatScreen } from '@/screens/mat-screen';
import { MeterScreen } from '@/screens/meter-screen';
import { ReciprocityScreen } from '@/screens/reciprocity-screen';
import { ResizeScreen } from '@/screens/resize-screen';
import { ResizeScreen as _Resize } from '@/screens/resize-screen';
import { SettingsScreen } from '@/screens/settings-screen';

const SCREENS: Record<string, React.ComponentType> = {
  border: BorderScreen,
  exposure: ExposureScreen,
  reciprocity: ReciprocityScreen,
  resize: ResizeScreen,
  meter: MeterScreen,
  mat: MatScreen,
  lens: LensScreen,
  'camera-exposure': CameraExposureScreen,
  settings: SettingsScreen,
};

export default function MoreToolDetail() {
  const { tool } = useLocalSearchParams<{ tool: string }>();
  const meta = getTool(tool);
  const ScreenComponent = tool ? SCREENS[tool] : undefined;
  if (!meta || !ScreenComponent) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-white/60">Unknown tool.</Text>
      </View>
    );
  }
  return (
    <>
      <Stack.Screen options={{ title: meta.label }} />
      <ScreenComponent />
    </>
  );
}
```

> Remove the duplicate `_Resize` import — it is shown here only to flag that each screen is imported exactly once; the implementer must not double-import.

- [ ] **Step 5: Verify hub navigation**

Run the app. Tap More → search filters the list; tap any tool (e.g. Resize) → it pushes with a large-title header + back button. Tap a pinned tool's tab → it still opens header-less. Confirm meter opens correctly from the hub (camera permission intact).

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/app/\(tabs\)/more apps/mobile/src/components/tool-list-row.tsx
git commit -m "feat(mobile): add categorized More hub"
```

---

## Task 7: Edit Tabs screen

**Files:**
- Create: `app/(tabs)/more/edit.tsx`

**Interfaces:**
- Consumes: `usePinnedTabs`, `MAX_PINNED`, `TOOLS`, `getTool`.

- [ ] **Step 1: Build the editor (pinned list with reorder + a "more tools" list to add/remove)**

Use `MAX_PINNED` to cap pins. Reorder via `react-native-draggable-flatlist` if already a dependency; otherwise use up/down controls (check `apps/mobile/package.json` first — do not add a dependency without confirming it passes the `minimumReleaseAge` gate).

```tsx
// app/(tabs)/more/edit.tsx
import { ScrollView, Text, View } from 'react-native';
import { GradientBackground } from '@/components/gradient-background';
import { ToolListRow } from '@/components/tool-list-row';
import { usePinnedTabs } from '@/hooks/use-pinned-tabs';
import { MAX_PINNED } from '@/lib/tab-bar-settings';
import { getTool, TOOLS } from '@/lib/tools';

export default function EditTabs() {
  const { pinned, setPinned } = usePinnedTabs();

  const removePin = (id: string) => setPinned(pinned.filter((p) => p !== id));
  const addPin = (id: string) => {
    if (pinned.includes(id) || pinned.length >= MAX_PINNED) return;
    setPinned([...pinned, id]);
  };
  const move = (id: string, dir: -1 | 1) => {
    const i = pinned.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= pinned.length) return;
    const next = [...pinned];
    [next[i], next[j]] = [next[j], next[i]];
    setPinned(next);
  };

  const available = TOOLS.filter((t) => !pinned.includes(t.id));

  return (
    <View className="flex-1">
      <GradientBackground />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 16 }}>
        <Text className="px-1 pb-1 text-xs uppercase tracking-wide text-white/40">
          In tab bar ({pinned.length}/{MAX_PINNED})
        </Text>
        {pinned.map((id, idx) => {
          const tool = getTool(id);
          if (!tool) return null;
          return (
            <View key={id} className="flex-row items-center justify-between">
              <ToolListRow label={tool.label} onPress={() => removePin(id)} accessory="Remove" />
              <View className="flex-row gap-2 pr-4">
                <Text onPress={() => move(id, -1)} className={idx === 0 ? 'text-white/20' : 'text-white'}>↑</Text>
                <Text onPress={() => move(id, 1)} className={idx === pinned.length - 1 ? 'text-white/20' : 'text-white'}>↓</Text>
              </View>
            </View>
          );
        })}

        <Text className="px-1 pb-1 pt-6 text-xs uppercase tracking-wide text-white/40">More tools</Text>
        {available.map((tool) => (
          <ToolListRow
            key={tool.id}
            label={tool.label}
            onPress={() => addPin(tool.id)}
            accessory={pinned.length >= MAX_PINNED ? '' : 'Add'}
          />
        ))}
      </ScrollView>
    </View>
  );
}
```

- [ ] **Step 2: Verify live re-render + persistence**

Run the app. Add/remove/reorder pins; confirm the tab bar updates immediately and survives an app restart (MMKV-backed). Confirm you cannot exceed 4 pins and cannot remove the last one into an empty state (empty falls back to defaults on next read — acceptable; optionally block removing the final pin).

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/\(tabs\)/more/edit.tsx
git commit -m "feat(mobile): add Edit Tabs screen"
```

---

## Task 8: Settings screen

Replaces the `SettingsScreen` stub created in Task 5 with the real screen. The route file (`app/(tabs)/settings.tsx`) already re-exports `SettingsScreen` and needs no change.

**Files:**
- Modify: `src/screens/settings-screen.tsx` (replace the stub body)

**Interfaces:**
- Consumes: `router` (to push `/more/edit`), app version via `expo-constants` (`Constants.expoConfig?.version`).

- [ ] **Step 1: Build the real screen (replace the stub)**

Replace the `ComingSoon` body in `src/screens/settings-screen.tsx` with a `<Screen>` of `GlassCard` sections: an "Edit Tabs" `ToolListRow` (pushes `/more/edit`), external links (GitHub, newsletter) opened via `Linking.openURL` matching the web app's URLs, and an app-version footer from `expo-constants`. Keep the `export function SettingsScreen()` name so the existing route re-export still resolves. No theme toggle (force-dark). No units control in this spec — `@dorkroom/logic` has no global units store; per-calculator unit toggles already exist, so adding a global one is out of scope (YAGNI).

- [ ] **Step 2: Verify**

Run the app. Open Settings (pin it or via More). Confirm Edit Tabs opens, links open in the browser, version shows.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/screens/settings-screen.tsx
git commit -m "feat(mobile): add Settings screen"
```

---

## Task 9: Final wiring, changelog, version, full verification

**Files:**
- Modify: `apps/mobile/CHANGELOG.md`, `apps/mobile/package.json`
- Verify: whole repo

- [ ] **Step 1: Confirm quick actions still resolve**

Check `apps/mobile/app.json` `iosActions` hrefs still point at valid routes (`/`, `/exposure`, `/reciprocity`, `/meter`). No change expected — confirm only.

- [ ] **Step 2: Add a mobile changelog entry**

Add to `apps/mobile/CHANGELOG.md` (Keep a Changelog format) under a new dated entry: customizable tab bar + categorized More hub; new Settings screen; Mat / Lens / Camera Exposure added to the hub as "coming soon" placeholders.

- [ ] **Step 3: Bump the mobile CalVer version**

Set `apps/mobile/package.json` `version` to the push date (`YYYY.MM.DD`).

- [ ] **Step 4: Full verification gate**

Run: `cd /Users/aaron/workspace/dorkroom && bun run test`
Expected: lint + unit + build + typecheck PASS.

Run: `npx react-doctor@0.2.1 --verbose`
Expected: **100/100** for `@dorkroom/source`, `@dorkroom/logic`, `@dorkroom/ui`. Fix any regression (prefer real fixes over inline disables).

Run the app once more: default tabs render; every tool reachable + searchable in More; Edit Tabs persists across restart; pushed tools show headers/back; the three stubbed calculators show their "Coming soon" placeholder; Settings works.

- [ ] **Step 5: Format + commit**

```bash
cd /Users/aaron/workspace/dorkroom && bun run format
git add apps/mobile/CHANGELOG.md apps/mobile/package.json
git commit -m "chore(mobile): changelog + version bump for nav skeleton"
```

---

## Self-Review notes (for the implementer)

- **Spec coverage:** registry (Task 2), customizable persisted tab bar (Tasks 3, 5, 7), categorized More hub with search + headers (Task 6), screen reuse via `src/screens/` (Task 4 + Task 6 detail mount), Mat/Lens/Camera-Exposure wired as stubs (Task 5), Settings (Task 8), default pins Meter/Border/Reciprocity/Exposure with Resize in More (Task 2 `DEFAULT_PINNED_IDS`), risk spike first (Task 1). Deferred Recipes/Films/Docs are intentionally absent.
- **Naming consistency:** tool ids (`border/exposure/reciprocity/resize/meter/mat/lens/camera-exposure/settings`) are used identically across the registry, `ROUTE_NAME`, the `SCREENS` map, and the persistence filter. The `lens` id maps to the `lenses` route name (matching the web `/lenses` path) — keep that one indirection consistent.
- **Deferred ports:** Mat / Lens / Camera Exposure ship as `ComingSoon` stubs. Their real implementation is the follow-up spec **"Extract `useMatCalculator` / `useLensCalculator` / `useCameraExposureCalculator` into `@dorkroom/logic`"** (shared by web + mobile); each stub is then swapped for the real screen. The pure utilities already exist (`calculateEquivalentFocalLength`, `mat-calculator` constants, `camera-exposure-calculations`) — the follow-up wraps them in proper hooks rather than duplicating math per platform.
