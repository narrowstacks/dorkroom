# Mobile More-polish + Lucide icons + drag reorder + score-to-100 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the mobile nav real Lucide icons (rows via `lucide-react-native`, native tab bar via Lucide-generated PNGs) shared with web, redesign the More page as inset glass cards, replace Edit Tabs up/down buttons with hold-to-drag, and bring `@dorkroom/mobile` to React Doctor 100/100.

**Architecture:** The tool registry switches from SF Symbol names to Lucide icon names. A `ToolIcon` component renders `lucide-react-native` icons in normal views (More/Edit rows). The native tab bar — which cannot render SVG components — gets PNG assets rasterized from the same Lucide icons by a generator script. Hold-to-drag uses `react-native-reorderable-list` + `react-native-gesture-handler` (native; one rebuild).

**Tech Stack:** Expo Router 6 (`unstable-native-tabs`), React Native 0.81, `lucide-react-native`, `react-native-reorderable-list`, `react-native-gesture-handler`, `react-native-reanimated` 4 (installed), `lucide-static` + `sharp` (dev, icon generation), Vitest 4.

## Global Constraints

- Never use `any` — specific types or `unknown`.
- Never import internal package paths — use `@dorkroom/*` and the `@/` mobile alias.
- Do not modify the web app (`apps/dorkroom/`) or `packages/` source. Web's React Doctor score is OUT OF SCOPE.
- No "warning"/"error" in new file names.
- Conventional commits; do NOT push.
- Dependency installs must respect the `bunfig.toml` `minimumReleaseAge` (7-day) gate; if a needed version is newer than 7 days, install with `--minimum-release-age 0` and note it in the report.
- Mobile tests are Vitest over **pure modules**. Native UI + native-tab icons + drag are verified by the user on a rebuilt dev client (gesture-handler is native). Subagents run `bun run test` + `bunx tsc --noEmit` only; they do NOT run `bun run ios`.
- `bun run test` must pass; React Doctor: **`@dorkroom/mobile` = 100**, `@dorkroom/logic` = 100, `@dorkroom/ui` = 100 (`@dorkroom/source` is out of scope).
- Tool→Lucide mapping (kebab-case, mirrors web `packages/ui/src/lib/navigation.ts`): border→`crop`, resize→`ruler`, exposure→`gauge`, mat→`frame`, reciprocity→`timer`, lens→`focus`, camera-exposure→`aperture`, meter→`sun-medium` (mobile-only), settings→`settings`; More tab→`menu`.

---

## File Structure

**Created:**
- `apps/mobile/src/components/tool-icon.tsx` — resolves a `lucide-react-native` component from a kebab icon name; renders it.
- `apps/mobile/scripts/generate-tab-icons.mjs` — rasterizes Lucide SVGs → template PNGs for the native tab bar.
- `apps/mobile/assets/tab-icons/*.png` — generated tab-bar icons (committed).

**Modified:**
- `apps/mobile/package.json` — new deps (+ generated changelog/version in the final task).
- `apps/mobile/app/_layout.tsx` — wrap root in `GestureHandlerRootView`.
- `apps/mobile/src/lib/tools.ts` — `sfSymbol` → `icon` (Lucide kebab name).
- `apps/mobile/src/lib/tools.test.ts` — assert the `icon` field.
- `apps/mobile/app/(tabs)/_layout.tsx` — tab icons via PNG `src` map (drops the `as SFSymbol` cast).
- `apps/mobile/app/(tabs)/more/index.tsx` — inset glass cards with Lucide row icons.
- `apps/mobile/app/(tabs)/more/edit.tsx` — hold-to-drag `ReorderableList`; up/down + inline-disable removed.
- `apps/mobile/src/components/tool-list-row.tsx` — optional leading-icon slot.
- Mobile React-Doctor-flagged files (Task 6): `apps/mobile/src/components/**` (e.g. `stepper.tsx`, `reciprocity/film-picker.tsx`, `gradient-background.tsx`, `reciprocity/reciprocity-chart-modal.tsx`).

---

## Task 1: Dependencies + gesture-handler root

**Files:**
- Modify: `apps/mobile/package.json`, `apps/mobile/app/_layout.tsx`

**Interfaces:**
- Produces: `lucide-react-native`, `react-native-gesture-handler`, `react-native-reorderable-list` available to app code; `lucide-static` + `sharp` available to Node scripts; the app rendered inside `GestureHandlerRootView`.

- [ ] **Step 1: Install runtime + dev deps**

From `apps/mobile`:
```bash
cd apps/mobile
bun add lucide-react-native react-native-gesture-handler react-native-reorderable-list
bun add -d lucide-static sharp
```
If any errors on the `minimumReleaseAge` gate, re-run that package with `--minimum-release-age 0` and note it in the report. Confirm each landed in `apps/mobile/package.json`.

- [ ] **Step 2: Wrap the app root in GestureHandlerRootView**

Edit `apps/mobile/app/_layout.tsx` — wrap the existing tree (outermost, around `SafeAreaProvider`). Keep `installLocalStorage()` and the `Appearance.setColorScheme('dark')` call exactly as-is.

```tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';
// ...existing imports...

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {/* ...existing QueryClientProvider / ThemeProvider / Stack / StatusBar unchanged... */}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 3: Verify**

Run: `cd apps/mobile && bun run test && bunx tsc --noEmit -p tsconfig.json` (find the right tsconfig via `ls apps/mobile/tsconfig*.json` if that path errors).
Expected: tests pass (no regression), typecheck clean.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/package.json apps/mobile/app/_layout.tsx ../../bun.lock
git commit -m "chore(mobile): add lucide-react-native + gesture-handler + reorderable-list"
```
> Note in the report: a **native dev-client rebuild** is required before drag and native-tab icons render (gesture-handler is native). The user performs it.

---

## Task 2: Registry Lucide icon field + native tab-bar PNG pipeline

**Files:**
- Modify: `apps/mobile/src/lib/tools.ts`, `apps/mobile/src/lib/tools.test.ts`, `apps/mobile/app/(tabs)/_layout.tsx`
- Create: `apps/mobile/scripts/generate-tab-icons.mjs`, `apps/mobile/assets/tab-icons/*.png`

**Interfaces:**
- Consumes: `lucide-static` SVGs, `sharp`.
- Produces: `Tool.icon: string` (Lucide kebab name); committed tab-icon PNGs; the tab bar rendering `<Icon src={...}>`.

- [ ] **Step 1: Swap the registry field `sfSymbol` → `icon`**

In `apps/mobile/src/lib/tools.ts`, rename the field on the `Tool` interface (`sfSymbol: string` → `icon: string`) and set each tool's value to its Lucide kebab name per the Global Constraints mapping:
`border:'crop'`, `resize:'ruler'`, `exposure:'gauge'`, `mat:'frame'`, `reciprocity:'timer'`, `lens:'focus'`, `camera-exposure:'aperture'`, `meter:'sun-medium'`, `settings:'settings'`. Leave `id`, `label`, `route`, `category` unchanged.

- [ ] **Step 2: Update the registry test**

In `apps/mobile/src/lib/tools.test.ts`, add:
```ts
it('every tool has a non-empty Lucide icon name', () => {
  for (const tool of TOOLS) {
    expect(typeof tool.icon).toBe('string');
    expect(tool.icon.length).toBeGreaterThan(0);
  }
});
```

- [ ] **Step 3: Run the test to confirm registry shape**

Run: `cd apps/mobile && bun run test -- tools`
Expected: PASS (existing tests + the new icon assertion).

- [ ] **Step 4: Write the tab-icon generator**

Create `apps/mobile/scripts/generate-tab-icons.mjs`:
```js
// Rasterizes Lucide SVGs into white template PNGs for the native tab bar.
// Keep ICON_NAMES in sync with src/lib/tools.ts (+ the 'more' tab).
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, '..', 'assets', 'tab-icons');
const LUCIDE = join(here, '..', '..', '..', 'node_modules', 'lucide-static', 'icons');

// id -> lucide kebab name (mirror src/lib/tools.ts + 'more')
const ICON_NAMES = {
  border: 'crop',
  resize: 'ruler',
  exposure: 'gauge',
  mat: 'frame',
  reciprocity: 'timer',
  lens: 'focus',
  'camera-exposure': 'aperture',
  meter: 'sun-medium',
  settings: 'settings',
  more: 'menu',
};

const SIZES = [
  { suffix: '', px: 25 },
  { suffix: '@2x', px: 50 },
  { suffix: '@3x', px: 75 },
];

mkdirSync(OUT, { recursive: true });

for (const [id, name] of Object.entries(ICON_NAMES)) {
  const svgRaw = readFileSync(join(LUCIDE, `${name}.svg`), 'utf8');
  // Lucide strokes use currentColor; force white so iOS template-tints it.
  const svg = svgRaw.replaceAll('currentColor', '#ffffff');
  for (const { suffix, px } of SIZES) {
    const png = await sharp(Buffer.from(svg)).resize(px, px).png().toBuffer();
    writeFileSync(join(OUT, `${id}${suffix}.png`), png);
  }
  console.log(`generated ${id} (${name})`);
}
```

- [ ] **Step 5: Generate the assets**

Run: `cd apps/mobile && node scripts/generate-tab-icons.mjs`
Expected: prints one line per icon; `apps/mobile/assets/tab-icons/` now holds `<id>.png`, `<id>@2x.png`, `<id>@3x.png` for all ids in `ICON_NAMES`. If a Lucide SVG filename differs (e.g. a renamed icon), correct the name in `ICON_NAMES` and re-run.

- [ ] **Step 6: Render the tab bar from PNG sources**

Rewrite `apps/mobile/app/(tabs)/_layout.tsx` to drop the SF-Symbol `Icon`/`as SFSymbol` and use a static PNG `src` map (Metro auto-resolves `@2x`/`@3x`):
```tsx
import { useQuickActionRouting } from 'expo-quick-actions/router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { usePinnedTabs } from '@/hooks/use-pinned-tabs';
import { getTool } from '@/lib/tools';

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

const TAB_ICON: Record<string, ReturnType<typeof require>> = {
  border: require('../../assets/tab-icons/border.png'),
  exposure: require('../../assets/tab-icons/exposure.png'),
  reciprocity: require('../../assets/tab-icons/reciprocity.png'),
  resize: require('../../assets/tab-icons/resize.png'),
  meter: require('../../assets/tab-icons/meter.png'),
  mat: require('../../assets/tab-icons/mat.png'),
  lens: require('../../assets/tab-icons/lens.png'),
  'camera-exposure': require('../../assets/tab-icons/camera-exposure.png'),
  settings: require('../../assets/tab-icons/settings.png'),
};
const MORE_ICON = require('../../assets/tab-icons/more.png');

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
            <Icon src={TAB_ICON[id]} />
            <Label>{tool.label}</Label>
          </NativeTabs.Trigger>
        );
      })}
      <NativeTabs.Trigger name="more">
        <Icon src={MORE_ICON} />
        <Label>More</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
```
> If `require(...)` as a map value trips a lint/type rule, type the map as `Record<string, number>` (Metro asset modules are numeric ids) — do NOT use `any`. If the asset `.png` module type is missing, the project already declares `*.png` types (see the existing `css.d.ts`/asset declaration from prior work); reuse it.

- [ ] **Step 7: Verify**

Run: `cd apps/mobile && bun run test && bunx tsc --noEmit -p tsconfig.json`
Expected: tests pass, typecheck clean (no dangling `sfSymbol`/`SFSymbol`).
> The visual result in the native bar (and whether iOS template-tints the white PNGs for active/inactive, vs needing a `{ default, selected }` variant) is device-verified by the user after rebuild — note this in the report.

- [ ] **Step 8: Commit**

```bash
git add apps/mobile/src/lib/tools.ts apps/mobile/src/lib/tools.test.ts apps/mobile/app/\(tabs\)/_layout.tsx apps/mobile/scripts/generate-tab-icons.mjs apps/mobile/assets/tab-icons
git commit -m "feat(mobile): Lucide icons in the native tab bar via generated PNGs"
```

---

## Task 3: ToolIcon component (lucide-react-native)

**Files:**
- Create: `apps/mobile/src/components/tool-icon.tsx`

**Interfaces:**
- Consumes: `Tool.icon` (kebab name).
- Produces: `ToolIcon` — `{ name: string; size?: number; color?: string }` → renders the matching `lucide-react-native` icon, falling back to `Circle` for an unknown name.

- [ ] **Step 1: Build the component**

```tsx
// src/components/tool-icon.tsx
import {
  Aperture,
  Circle,
  Crop,
  Focus,
  Frame,
  Gauge,
  type LucideIcon,
  Menu,
  Ruler,
  Settings,
  SunMedium,
  Timer,
} from 'lucide-react-native';

const ICONS: Record<string, LucideIcon> = {
  crop: Crop,
  ruler: Ruler,
  gauge: Gauge,
  frame: Frame,
  timer: Timer,
  focus: Focus,
  aperture: Aperture,
  'sun-medium': SunMedium,
  settings: Settings,
  menu: Menu,
};

export function ToolIcon({
  name,
  size = 20,
  color = '#ffffff',
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  const Glyph = ICONS[name] ?? Circle;
  return <Glyph size={size} color={color} />;
}
```
> Every value in the Global Constraints mapping must have an entry in `ICONS`. The fallback `Circle` keeps an unknown name from crashing.

- [ ] **Step 2: Verify**

Run: `cd apps/mobile && bunx tsc --noEmit -p tsconfig.json && bun run test`
Expected: typecheck clean, tests still pass. (Rendering is device/hot-reload verified in Tasks 4–5.)

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/components/tool-icon.tsx
git commit -m "feat(mobile): add ToolIcon (lucide-react-native)"
```

---

## Task 4: More page → inset glass cards with Lucide rows

**Files:**
- Modify: `apps/mobile/src/components/tool-list-row.tsx`, `apps/mobile/app/(tabs)/more/index.tsx`

**Interfaces:**
- Consumes: `ToolIcon`, `GlassCard`, `TOOLS`, `CATEGORY_ORDER`, `CATEGORY_LABELS`.

- [ ] **Step 1: Give `ToolListRow` an optional leading-icon slot**

```tsx
// src/components/tool-list-row.tsx
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

export function ToolListRow({
  label,
  onPress,
  accessory,
  leading,
}: {
  label: string;
  onPress: () => void;
  accessory?: ReactNode;
  leading?: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between px-4 py-3 active:opacity-60"
    >
      <View className="flex-row items-center gap-3">
        {leading}
        <Text className="text-base text-white">{label}</Text>
      </View>
      {typeof accessory === 'string' ? (
        <Text className="text-white/40">{accessory}</Text>
      ) : (
        accessory
      )}
    </Pressable>
  );
}
```
> `accessory` is widened from `string` to `ReactNode` so a Lucide chevron can be passed. The existing string usages still work.

- [ ] **Step 2: Rewrite the More index as inset glass cards**

```tsx
// app/(tabs)/more/index.tsx
import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { GlassCard } from '@/components/glass-card';
import { GradientBackground } from '@/components/gradient-background';
import { ToolIcon } from '@/components/tool-icon';
import { ToolListRow } from '@/components/tool-list-row';
import type { Tool } from '@/lib/tools';
import { CATEGORY_LABELS, CATEGORY_ORDER, TOOLS } from '@/lib/tools';

const chevron = <ChevronRight size={18} color="rgba(255,255,255,0.4)" />;

export default function MoreIndex() {
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result: { title: string; tools: Tool[] }[] = [];
    for (const category of CATEGORY_ORDER) {
      const tools = TOOLS.filter(
        (t) => t.category === category && t.label.toLowerCase().includes(q)
      );
      if (tools.length > 0) {
        result.push({ title: CATEGORY_LABELS[category], tools });
      }
    }
    return result;
  }, [query]);

  const goToEdit = useCallback(() => router.push('/more/edit'), []);

  return (
    <View className="flex-1">
      <GradientBackground />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 16, gap: 16 }}
      >
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search tools"
          placeholderTextColor="rgba(255,255,255,0.4)"
          className="rounded-xl bg-white/10 px-4 py-3 text-white"
        />

        <GlassCard className="px-0 py-1">
          <ToolListRow label="Edit Tabs" onPress={goToEdit} accessory={chevron} />
        </GlassCard>

        {groups.map((group) => (
          <View key={group.title} className="gap-2">
            <Text className="px-1 text-xs uppercase tracking-wide text-white/40">
              {group.title}
            </Text>
            <GlassCard className="px-0 py-1">
              {group.tools.map((tool) => (
                <ToolListRow
                  key={tool.id}
                  label={tool.label}
                  leading={<ToolIcon name={tool.icon} />}
                  accessory={chevron}
                  onPress={() => router.push(tool.route as never)}
                />
              ))}
            </GlassCard>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
```
> Confirm `GlassCard` accepts `className` (it does — used across screens). If `GlassCard`'s padding fights the row layout, adjust the card `className` (e.g. `p-0`) rather than the row. Keep `router.push(tool.route as never)` — the established typed-routes cast.

- [ ] **Step 3: Verify**

Run: `cd apps/mobile && bunx tsc --noEmit -p tsconfig.json && bun run test`
Expected: typecheck clean, tests pass. (Card layout + row icons hot-reload-verified by the user.)

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/components/tool-list-row.tsx apps/mobile/app/\(tabs\)/more/index.tsx
git commit -m "feat(mobile): inset glass cards + Lucide icons on the More page"
```

---

## Task 5: Edit Tabs → hold-to-drag reorder

**Files:**
- Modify: `apps/mobile/app/(tabs)/more/edit.tsx`

**Interfaces:**
- Consumes: `usePinnedTabs`, `MAX_PINNED`, `getTool`, `TOOLS`, `ToolIcon`, `react-native-reorderable-list`.

- [ ] **Step 1: Confirm the reorderable-list API against the installed version**

Open `node_modules/react-native-reorderable-list` types and confirm the exports used below exist: default `ReorderableList`, `useReorderableDrag`, and a reorder helper (`reorderItems(array, from, to)`), and the `onReorder` event shape `{ from: number; to: number }`. If names differ in the installed version, adapt the code in Step 2 to the real API (same behavior) and note the adaptation in the report.

- [ ] **Step 2: Rewrite Edit Tabs with drag**

```tsx
// app/(tabs)/more/edit.tsx
import { Grip, Minus, Plus } from 'lucide-react-native';
import { useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import ReorderableList, {
  type ReorderableListReorderEvent,
  reorderItems,
  useReorderableDrag,
} from 'react-native-reorderable-list';
import { GradientBackground } from '@/components/gradient-background';
import { ToolIcon } from '@/components/tool-icon';
import { usePinnedTabs } from '@/hooks/use-pinned-tabs';
import { MAX_PINNED } from '@/lib/tab-bar-settings';
import { getTool, TOOLS } from '@/lib/tools';

function PinnedRow({
  id,
  onRemove,
}: {
  id: string;
  onRemove: (id: string) => void;
}) {
  const drag = useReorderableDrag();
  const tool = getTool(id);
  if (!tool) return null;
  return (
    <Pressable
      onLongPress={drag}
      className="flex-row items-center justify-between px-4 py-3 active:opacity-60"
    >
      <View className="flex-row items-center gap-3">
        <Grip size={18} color="rgba(255,255,255,0.4)" />
        <ToolIcon name={tool.icon} />
        <Text className="text-base text-white">{tool.label}</Text>
      </View>
      <Pressable hitSlop={12} onPress={() => onRemove(id)}>
        <Minus size={20} color="rgba(255,255,255,0.6)" />
      </Pressable>
    </Pressable>
  );
}

export default function EditTabs() {
  const { pinned, setPinned } = usePinnedTabs();
  const available = TOOLS.filter((t) => !pinned.includes(t.id));
  const canAdd = pinned.length < MAX_PINNED;

  const onReorder = useCallback(
    ({ from, to }: ReorderableListReorderEvent) => {
      setPinned(reorderItems(pinned, from, to));
    },
    [pinned, setPinned]
  );

  const removePin = useCallback(
    (id: string) => setPinned(pinned.filter((p) => p !== id)),
    [pinned, setPinned]
  );
  const addPin = useCallback(
    (id: string) => {
      if (!canAdd) return;
      setPinned([...pinned, id]);
    },
    [canAdd, pinned, setPinned]
  );

  const Footer = (
    <View className="gap-1 pt-6">
      <Text className="px-4 pb-1 text-xs uppercase tracking-wide text-white/40">
        More tools
      </Text>
      {available.map((tool) => (
        <Pressable
          key={tool.id}
          onPress={() => addPin(tool.id)}
          disabled={!canAdd}
          className="flex-row items-center justify-between px-4 py-3 active:opacity-60"
          style={{ opacity: canAdd ? 1 : 0.4 }}
        >
          <View className="flex-row items-center gap-3">
            <ToolIcon name={tool.icon} />
            <Text className="text-base text-white">{tool.label}</Text>
          </View>
          <Plus size={20} color="rgba(255,255,255,0.6)" />
        </Pressable>
      ))}
    </View>
  );

  return (
    <View className="flex-1">
      <GradientBackground />
      <ReorderableList
        data={pinned}
        onReorder={onReorder}
        keyExtractor={(id) => id}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <Text className="px-4 pb-1 text-xs uppercase tracking-wide text-white/40">
            In tab bar ({pinned.length}/{MAX_PINNED})
          </Text>
        }
        ListFooterComponent={Footer}
        renderItem={({ item }) => <PinnedRow id={item} onRemove={removePin} />}
      />
    </View>
  );
}
```
> Behavioral invariants to preserve: `MAX_PINNED` cap (no add past 4), drag-reorder persists via `setPinned`, remove builds a new array, `getTool` guards unknown ids. The `rerender-functional-setstate` inline-disable and the up/down `move` handler are gone (drag replaces them). `addPin`'s `setPinned([...pinned, id])` keeps `pinned` and `canAdd` in deps — if React Doctor flags it, prefer a real fix (e.g. compute from current `pinned`) over re-adding a disable.

- [ ] **Step 3: Verify**

Run: `cd apps/mobile && bunx tsc --noEmit -p tsconfig.json && bun run test`
Expected: typecheck clean, tests pass. (Drag behavior is device-verified by the user after the native rebuild.)

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/\(tabs\)/more/edit.tsx
git commit -m "feat(mobile): hold-to-drag reorder in Edit Tabs"
```

---

## Task 6: `@dorkroom/mobile` React Doctor → 100/100

**Files:**
- Modify: the mobile files React Doctor flags (likely `apps/mobile/src/components/stepper.tsx`, `reciprocity/film-picker.tsx`, `gradient-background.tsx`, `reciprocity/reciprocity-chart-modal.tsx`, and any flagged by the new Task 1–5 code).

- [ ] **Step 1: Enumerate the mobile findings**

Run: `npx react-doctor@0.2.1 --verbose`
Read every finding under the **`@dorkroom/mobile`** project (ignore `@dorkroom/source` — out of scope). For each, run `npx react-doctor@0.2.1 --explain <file:line>` to see the rule and rationale.

- [ ] **Step 2: Fix each finding with a real fix**

Address each flagged issue properly (e.g. missing `key`, unstable callback, a11y role/label, list-rendering rule). Suppress only a genuine false positive, always with a justifying comment: `// eslint-disable-next-line react-doctor/<rule> -- why` (or `jsx-a11y/<rule>`). Use `--explain` to confirm a suppression applies. Do NOT touch web (`@dorkroom/source`) files.

- [ ] **Step 3: Verify the score**

Run: `npx react-doctor@0.2.1 --verbose`
Expected: **`@dorkroom/mobile` = 100/100**, `@dorkroom/logic` = 100, `@dorkroom/ui` = 100. (`@dorkroom/source` may remain <100 — out of scope.)
Then: `cd apps/mobile && bun run test && bunx tsc --noEmit -p tsconfig.json` — still green.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src
git commit -m "fix(mobile): resolve React Doctor findings to 100/100"
```

---

## Task 7: Changelog + full gate

**Files:**
- Modify: `apps/mobile/CHANGELOG.md` (and `apps/mobile/package.json` version only if the date changed)

- [ ] **Step 1: Add changelog entries**

In `apps/mobile/CHANGELOG.md`, add to the current dated section's `### Added`/`### Changed` (create a new `## [YYYY.MM.DD]` section only if today's date differs from the latest section; if so also set `apps/mobile/package.json` `version` to that date): Lucide icons across the nav (rows + tab bar); More page redesigned as inset glass cards; hold-to-drag tab reordering; mobile React Doctor at 100/100.

- [ ] **Step 2: Full gate**

Run: `cd /Users/aaron/workspace/dorkroom && bun run test`
Expected: lint + unit + build + typecheck PASS.
Run: `npx react-doctor@0.2.1 --verbose`
Expected: `@dorkroom/mobile`, `@dorkroom/logic`, `@dorkroom/ui` all **100**.

- [ ] **Step 3: Format + commit**

```bash
cd /Users/aaron/workspace/dorkroom && bun run format
git add apps/mobile/CHANGELOG.md apps/mobile/package.json
git commit -m "chore(mobile): changelog for More polish + Lucide icons + drag"
```
> Do NOT stage the unrelated pre-existing uncommitted files (`.design-sync/*`, `scripts/audit-contrast.mjs`, `docs/superpowers/plans/2026-06-13-vercel-microfrontends-docs.md`).

---

## Self-Review notes (for the implementer)

- **Spec coverage:** deps + gesture root (Task 1), Lucide registry + native-tab PNG pipeline (Task 2), ToolIcon rows (Task 3), More glass cards (Task 4), drag reorder (Task 5), mobile→100 (Task 6), changelog/gate (Task 7). Web score explicitly deferred.
- **Naming consistency:** tool ids and the Lucide kebab names are identical across `tools.ts`, the generator's `ICON_NAMES`, the `_layout` `TAB_ICON`/`ROUTE_NAME` maps, and `ToolIcon`'s `ICONS` map. `lens`→route `lenses` and `border`→route `index` indirections are unchanged from the prior plan.
- **Native rebuild:** gesture-handler makes drag + tab icons require a fresh dev-client build — flagged in Task 1 and verified by the user, not a subagent.
- **API risk:** `react-native-reorderable-list`'s exact export names are verified against the installed package in Task 5 Step 1 before use.
