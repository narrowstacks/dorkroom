# Top-level ISO Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make ISO a top-level filter on the development-recipes page (always visible, always filtering, surviving a film change), and stop applying sub-filter URL params that arrive without their parent.

**Architecture:** Four small changes in `@dorkroom/logic` (the ISO option list, the ISO filter predicate, the film setter, and the URL-state memo) plus one prop removal in the app. No new files, no new dependencies. Each change is driven by a failing test in an existing test file.

**Tech Stack:** React 19, TypeScript, Vitest + `@testing-library/react`, TanStack Query, Turborepo, Graphite (`gt`) for the stacked PR.

Spec: `docs/superpowers/specs/2026-07-14-top-level-iso-filter-design.md`

## Global Constraints

- Never use `any` — use specific types or `unknown`.
- Never import internal package paths — use `@dorkroom/ui`, `@dorkroom/logic`, `@dorkroom/api`.
- Branch is `advisor/018-top-level-iso-filter`, stacked on `advisor/017-url-search-coercion` via Graphite. Commit with `gt modify -c -a -m "..."`, never `git commit`.
- Conventional commit messages, short.
- The gate is `bun run test` (lint + test + build + typecheck) and must be 20/20.
- React Doctor must stay **100/100 on all four projects**: `npx react-doctor@latest -y --json --json-out /tmp/rd.json` then read `.projects[].score.score`.
- Do not push and do not open a PR without explicit user approval.

## Reference: existing test data

`packages/logic/src/hooks/development-recipes/__tests__/use-development-recipes.test.ts`
already defines the mocks every logic task below reuses. Do not redefine them.

- Films: `hp5-plus` (isoSpeed 400), `tri-x-400` (400), `neopan-400` (400)
- Combinations (filmSlug, shootingIso):
  `hp5-plus`/400, `tri-x-400`/200, `neopan-400`/800,
  `hp5-plus`/1600, `tri-x-400`/100, `neopan-400`/400

So the distinct catalogue ISOs, ascending, are: **100, 200, 400, 800, 1600**.

The file already has a `beforeEach` that mocks `useFilms` / `useDevelopers` /
`useCombinations`, and a `wrapper` built from `QueryClientProvider`. Reuse both.

---

### Task 1: ISO options are the whole catalogue, box speed only with a film

**Files:**
- Modify: `packages/logic/src/hooks/development-recipes/use-development-recipes.ts:392-423`
- Test: `packages/logic/src/hooks/development-recipes/__tests__/use-development-recipes.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `getAvailableISOs(): { label: string; value: string }[]` — unchanged signature, new behaviour. Returns `All ISOs` first, then `Box speed (N)` **only when a film is selected**, then every catalogue ISO ascending as `{ label: '400', value: '400' }`.

- [ ] **Step 1: Write the failing tests**

Append this `describe` block inside the existing `describe('useDevelopmentRecipes', ...)`
in `__tests__/use-development-recipes.test.ts`:

```ts
  describe('getAvailableISOs', () => {
    it('offers every catalogue ISO when no film is selected', () => {
      const { result } = renderHook(() => useDevelopmentRecipes(), { wrapper });

      expect(result.current.getAvailableISOs()).toEqual([
        { label: 'All ISOs', value: '' },
        { label: '100', value: '100' },
        { label: '200', value: '200' },
        { label: '400', value: '400' },
        { label: '800', value: '800' },
        { label: '1600', value: '1600' },
      ]);
    });

    it('adds box speed once a film is selected, keeping the full ISO list', () => {
      const { result } = renderHook(() => useDevelopmentRecipes(), { wrapper });

      act(() => {
        result.current.setSelectedFilm(mockFilms[0]);
      });

      // The numeric options stay global — they do not narrow to HP5's ISOs —
      // so an ISO chosen before the film change is still representable.
      expect(result.current.getAvailableISOs()).toEqual([
        { label: 'All ISOs', value: '' },
        { label: 'Box speed (400)', value: 'boxspeed' },
        { label: '100', value: '100' },
        { label: '200', value: '200' },
        { label: '400', value: '400' },
        { label: '800', value: '800' },
        { label: '1600', value: '1600' },
      ]);
    });
  });
```

- [ ] **Step 2: Run the tests and confirm they fail**

```bash
bun run test:unit "use-development-recipes"
```

Expected: both new tests FAIL. The first fails with `expected [] to deeply equal
[...]` (today `availableISOs` returns `[]` with no film); the second fails because
the numeric list is currently narrowed to HP5's ISOs (`400`, `1600`) instead of the
full catalogue.

- [ ] **Step 3: Rewrite `availableISOs`**

In `use-development-recipes.ts`, replace the whole `availableISOs` memo
(currently lines 392-423) with:

```ts
  const availableISOs = useMemo((): {
    label: string;
    value: string;
  }[] => {
    const isos = [{ label: 'All ISOs', value: '' }];

    // Box speed is defined relative to the selected film's rated speed, so it is
    // only offered when there is a film to be relative to.
    if (selectedFilm) {
      isos.push({
        label: `Box speed (${selectedFilm.isoSpeed})`,
        value: 'boxspeed',
      });
    }

    // ISO is a top-level filter, so the numeric options are every shooting ISO in
    // the catalogue rather than just the selected film's. That keeps a chosen ISO
    // representable when the film changes — which it must be, since selecting a
    // film no longer clears it.
    const isoSet = new Set<number>();
    allCombinations.forEach((combo) => {
      isoSet.add(combo.shootingIso);
    });

    Array.from(isoSet)
      .sort((a, b) => a - b)
      .forEach((iso) => {
        isos.push({ label: iso.toString(), value: iso.toString() });
      });

    return isos;
  }, [selectedFilm, allCombinations]);
```

- [ ] **Step 4: Remove the now-unused helper import if it is orphaned**

`getAllSlugsForFilm` was used by the old memo. Check whether anything else still
uses it:

```bash
grep -n "getAllSlugsForFilm" packages/logic/src/hooks/development-recipes/use-development-recipes.ts
```

If the only remaining hit is the `import` line, delete that import. If other call
sites remain, leave it alone.

- [ ] **Step 5: Run the tests and confirm they pass**

```bash
bun run test:unit "use-development-recipes"
```

Expected: PASS, including every pre-existing test in the file.

- [ ] **Step 6: Commit**

```bash
gt modify -c -a -m "feat(recipes): offer every catalogue ISO, not just the selected film's"
```

---

### Task 2: A numeric ISO filters without a film; box speed is a no-op without one

**Files:**
- Modify: `packages/logic/src/hooks/development-recipes/use-development-recipes.ts` (the "Filter by ISO" block, currently `if (isoFilter && selectedFilm) {`)
- Test: `packages/logic/src/hooks/development-recipes/__tests__/use-development-recipes.test.ts`

**Interfaces:**
- Consumes: `getAvailableISOs` from Task 1 (not called here, but the same hook).
- Produces: `filteredCombinations` now honours `isoFilter` with no film selected. `setIsoFilter(value: string)` is unchanged.

- [ ] **Step 1: Write the failing tests**

Append inside `describe('useDevelopmentRecipes', ...)`:

```ts
  describe('ISO filtering without a film', () => {
    it('filters on a numeric ISO with no film selected', () => {
      const { result } = renderHook(() => useDevelopmentRecipes(), { wrapper });

      act(() => {
        result.current.setIsoFilter('400');
      });

      // hp5-plus/400 and neopan-400/400 — across two different films.
      expect(result.current.filteredCombinations).toHaveLength(2);
      expect(
        result.current.filteredCombinations.every(
          (combo) => combo.shootingIso === 400
        )
      ).toBe(true);
    });

    it('treats box speed as a no-op with no film selected', () => {
      const { result } = renderHook(() => useDevelopmentRecipes(), { wrapper });
      const total = result.current.filteredCombinations.length;

      act(() => {
        result.current.setIsoFilter('boxspeed');
      });

      // Box speed means "this film's rated speed" — with no film there is
      // nothing to compare against, so it must not silently drop everything.
      expect(result.current.filteredCombinations).toHaveLength(total);
    });

    it('still resolves box speed against the selected film', () => {
      const { result } = renderHook(() => useDevelopmentRecipes(), { wrapper });

      act(() => {
        result.current.setSelectedFilm(mockFilms[0]); // hp5-plus, rated 400
      });
      act(() => {
        result.current.setIsoFilter('boxspeed');
      });

      // Of HP5's two recipes (400 and 1600), only the 400 is at box speed.
      expect(result.current.filteredCombinations).toHaveLength(1);
      expect(result.current.filteredCombinations[0].shootingIso).toBe(400);
    });
  });
```

- [ ] **Step 2: Run the tests and confirm they fail**

```bash
bun run test:unit "use-development-recipes"
```

Expected: the first test FAILS (`expected 6 to be 2`) because `isoFilter` is
ignored without a film. The second and third should already pass — that is fine and
expected; they are regression cover for behaviour we must not break.

- [ ] **Step 3: Ungate the filter**

Replace the "Filter by ISO" block in `use-development-recipes.ts`:

```ts
    // Filter by ISO. A numeric ISO is absolute, so it filters on its own. Box
    // speed is relative to the selected film's rated speed, so with no film there
    // is nothing to compare against and it is a no-op rather than a wipeout.
    if (isoFilter) {
      if (isoFilter === 'boxspeed') {
        if (selectedFilm) {
          combinations = combinations.filter(
            (combo) => combo.shootingIso === selectedFilm.isoSpeed
          );
        }
      } else {
        combinations = combinations.filter(
          (combo) => combo.shootingIso.toString() === isoFilter
        );
      }
    }
```

- [ ] **Step 4: Run the tests and confirm they pass**

```bash
bun run test:unit "use-development-recipes"
```

Expected: PASS, all three, plus every pre-existing test.

- [ ] **Step 5: Commit**

```bash
gt modify -c -a -m "feat(recipes): let a numeric ISO filter without a film selected"
```

---

### Task 3: Selecting a film no longer clears the ISO filter

**Files:**
- Modify: `packages/logic/src/hooks/development-recipes/use-development-recipes.ts:244-247`
- Test: `packages/logic/src/hooks/development-recipes/__tests__/use-development-recipes.test.ts`

**Interfaces:**
- Consumes: the ungated filter from Task 2 (this test asserts the two together).
- Produces: `setSelectedFilm(film: Film | null): void` — same signature, no longer clears `isoFilter`. `setSelectedDeveloper` still clears `dilutionFilter` and must stay that way.

- [ ] **Step 1: Write the failing test**

Append inside `describe('useDevelopmentRecipes', ...)`:

```ts
  describe('ISO survives a film change', () => {
    it('keeps the ISO filter when a film is selected', () => {
      const { result } = renderHook(() => useDevelopmentRecipes(), { wrapper });

      act(() => {
        result.current.setIsoFilter('400');
      });
      act(() => {
        result.current.setSelectedFilm(mockFilms[0]); // hp5-plus
      });

      // A top-level filter must not be silently reset by another control.
      expect(result.current.isoFilter).toBe('400');
      // HP5 has exactly one recipe at ISO 400.
      expect(result.current.filteredCombinations).toHaveLength(1);
    });

    it('still clears the dilution filter when a developer is selected', () => {
      const { result } = renderHook(() => useDevelopmentRecipes(), { wrapper });

      act(() => {
        result.current.setDilutionFilter('1+9');
      });
      act(() => {
        result.current.setSelectedDeveloper(mockDevelopers[0]);
      });

      // Dilution stays a sub-filter of developer — this behaviour is deliberate.
      expect(result.current.dilutionFilter).toBe('');
    });
  });
```

- [ ] **Step 2: Run the tests and confirm the first fails**

```bash
bun run test:unit "use-development-recipes"
```

Expected: the first test FAILS with `expected '' to be '400'` — `setSelectedFilm`
currently wipes the ISO. The dilution test should already PASS (regression cover).

- [ ] **Step 3: Drop the side-effect**

In `use-development-recipes.ts`, replace:

```ts
  const setSelectedFilm = useCallback((film: Film | null) => {
    setSelectedFilmState(film);
    setIsoFilter('');
  }, []);
```

with:

```ts
  // ISO is a top-level filter and deliberately survives a film change, so this no
  // longer clears it. (setSelectedDeveloper still clears the dilution filter —
  // dilution remains scoped to its developer.)
  const setSelectedFilm = useCallback((film: Film | null) => {
    setSelectedFilmState(film);
  }, []);
```

- [ ] **Step 4: Run the tests and confirm they pass**

```bash
bun run test:unit "use-development-recipes"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
gt modify -c -a -m "feat(recipes): keep the ISO filter when the film changes"
```

---

### Task 4: Orphaned box-speed and dilution params are not applied

**Files:**
- Modify: `packages/logic/src/hooks/development-recipes/use-recipe-url-state.ts:385-391`
- Test: `packages/logic/src/hooks/development-recipes/__tests__/use-recipe-url-state.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `initialUrlState.isoFilter` is left unset for `?iso=boxspeed` with no resolvable film; `initialUrlState.dilutionFilter` is left unset for `?dilution=…` with no resolvable developer. A numeric `?iso=` still sets `isoFilter` with no film.

- [ ] **Step 1: Write the failing tests**

Open `__tests__/use-recipe-url-state.test.ts`. It already mocks `window.location`
via a `mockLocation` object with a `search` field — set `mockLocation.search`
before rendering, following the existing tests in that file.

Append a new `describe` block inside the top-level `describe('useRecipeUrlState', ...)`:

```ts
  describe('orphaned sub-filter params', () => {
    it('ignores box speed with no film in the URL', () => {
      mockLocation.search = '?iso=boxspeed';

      const { result } = renderHook(() =>
        useRecipeUrlState(mockFilms, mockDevelopers, mockCurrentState)
      );

      // Box speed is relative to a film; on its own it cannot mean anything, so
      // it must not land in state where it would be invisible and inert.
      expect(result.current.initialUrlState.isoFilter).toBeUndefined();
    });

    it('keeps a numeric ISO with no film in the URL', () => {
      mockLocation.search = '?iso=400';

      const { result } = renderHook(() =>
        useRecipeUrlState(mockFilms, mockDevelopers, mockCurrentState)
      );

      expect(result.current.initialUrlState.isoFilter).toBe('400');
    });

    it('ignores a dilution with no developer in the URL', () => {
      mockLocation.search = '?dilution=1%2B9';

      const { result } = renderHook(() =>
        useRecipeUrlState(mockFilms, mockDevelopers, mockCurrentState)
      );

      expect(result.current.initialUrlState.dilutionFilter).toBeUndefined();
    });
  });
```

`mockCurrentState` is the fixture the existing tests in this file already pass as
the third argument (defined at `use-recipe-url-state.test.ts:68`). Reuse it as-is —
do not introduce a new fixture.

- [ ] **Step 2: Run the tests and confirm two fail**

```bash
bun run test:unit "use-recipe-url-state"
```

Expected: the box-speed test FAILS (`expected 'boxspeed' to be undefined`) and the
dilution test FAILS (`expected '1+9' to be undefined`). The numeric-ISO test should
already PASS — regression cover that the guard is not too broad.

- [ ] **Step 3: Guard the two orphan cases**

In `use-recipe-url-state.ts`, inside the `initialUrlState` memo, replace:

```ts
    if (validation.sanitized.dilution) {
      state.dilutionFilter = validation.sanitized.dilution;
    }

    if (validation.sanitized.iso) {
      state.isoFilter = validation.sanitized.iso;
    }
```

with:

```ts
    // A dilution is defined relative to a developer — "1+9" means different things
    // for different developers — so it is meaningless without one. Applying it
    // anyway would leave a filter in state that has no control and does nothing.
    if (validation.sanitized.dilution && state.selectedDeveloper) {
      state.dilutionFilter = validation.sanitized.dilution;
    }

    // A numeric ISO is absolute and stands on its own. Box speed is relative to
    // the selected film, so it is only meaningful alongside one.
    if (validation.sanitized.iso) {
      if (validation.sanitized.iso !== 'boxspeed' || state.selectedFilm) {
        state.isoFilter = validation.sanitized.iso;
      }
    }
```

This relies on `state.selectedFilm` / `state.selectedDeveloper` already having been
resolved earlier in the same memo — they are, immediately above this block. Do not
reorder them.

- [ ] **Step 4: Run the tests and confirm they pass**

```bash
bun run test:unit "use-recipe-url-state"
```

Expected: PASS, all three, plus the 35 pre-existing tests in the file.

- [ ] **Step 5: Commit**

```bash
gt modify -c -a -m "fix(recipes): ignore sub-filter URL params that arrive without their parent"
```

---

### Task 5: The ISO control is always visible

**Files:**
- Modify: `apps/dorkroom/src/app/pages/development-recipes/development-recipes-page.tsx:531` and `:613`

**Interfaces:**
- Consumes: `getAvailableISOs()` from Task 1, which now returns a populated list with no film selected — that is what makes the always-visible control meaningful.
- Produces: no API change. `CollapsibleFilters`' `showIsoFilter` prop already defaults to `true`, so removing the prop is sufficient.

- [ ] **Step 1: Remove the gating prop at both call sites**

There are two: the desktop sidebar (~line 531) and the mobile sheet (~line 613).
In each, delete this single line:

```tsx
              showIsoFilter={!!selectedFilm}
```

Leave the neighbouring `showDilutionFilter={!!selectedDeveloper}` untouched —
dilution stays a sub-filter of its developer.

Confirm both are gone:

```bash
grep -n "showIsoFilter" apps/dorkroom/src/app/pages/development-recipes/development-recipes-page.tsx
```

Expected: no output.

- [ ] **Step 2: Run the gate**

```bash
bun run test
```

Expected: `Tasks: 20 successful, 20 total`. If `selectedFilm` is now an unused
variable in that file, the lint step will say so — it is still used elsewhere on the
page, so it should not be, but fix it if flagged.

- [ ] **Step 3: Commit**

```bash
gt modify -c -a -m "feat(recipes): always show the ISO filter control"
```

---

### Task 6: Verify end to end and prepare the PR

**Files:** none modified — this task is verification only.

- [ ] **Step 1: Run the full gate**

```bash
bun run test
```

Expected: `Tasks: 20 successful, 20 total`.

- [ ] **Step 2: Run React Doctor and confirm no regression**

```bash
npx --yes react-doctor@latest -y --json --json-out /tmp/rd.json > /dev/null 2>&1
jq -r '.projects[] | "\(.project.projectName): \(.score.score)"' /tmp/rd.json
```

Expected: 100 for all four projects. Note that Task 3 removes a chained state
update, so if anything the score should improve, never drop.

- [ ] **Step 3: Drive the real app**

Start the dev server (`bun run dev`) and check each of these against the URL bar and
the rendered page:

| URL | Expected |
| --- | --- |
| `/development` | ISO control visible with no film selected, showing "All ISOs" |
| `/development?iso=400` | ISO control shows 400; every result is ISO 400; badge counts it |
| `/development?film=hp5-plus&iso=400` | both applied; ISO not dropped |
| `/development?iso=boxspeed` | ignored; `iso` gone from the URL; badge does not count it |
| `/development?dilution=1%2B9` | ignored; `dilution` gone from the URL |
| Pick a film while ISO is set | ISO persists; "Box speed (N)" appears in the list |
| Pick a developer while dilution is set | dilution still clears (unchanged) |

- [ ] **Step 4: Capture before/after screenshots**

This changes rendered output — the ISO control now appears where it did not before —
so the repo's PR rule requires screenshots. Use the `pr-screenshots` skill, which
captures the affected route from the merge-base and from HEAD and uploads to
GitHub's CDN (nothing is committed to the repo).

- [ ] **Step 5: Ask before pushing**

Do not push or open a PR without explicit approval. When approved:

```bash
gt submit --no-interactive
```

The PR body should state the behaviour table from the spec, note that ISO options
are now global even with a film selected (and that this is a deliberate trade-off),
and attach the before/after screenshots.

---

## Self-review

Checked against `docs/superpowers/specs/2026-07-14-top-level-iso-filter-design.md`:

- Spec §1 (`availableISOs` always populated, contextual box speed, global numeric list) → Task 1.
- Spec §2 (filtering ungated, box speed no-op without film) → Task 2.
- Spec §3 (`setSelectedFilm` stops clearing ISO; dilution keeps its clear) → Task 3.
- Spec §4 (control always visible, both call sites, dilution gating untouched) → Task 5.
- Spec §5 (orphaned box speed and dilution not applied; URL and badge follow for free) → Task 4.
- Spec "Testing" → the tests in Tasks 1-4 cover every listed case.
- Spec "Notes" (screenshots required) → Task 6 Step 4.

No placeholders. Names used consistently across tasks: `availableISOs`,
`getAvailableISOs`, `setSelectedFilm`, `setIsoFilter`, `isoFilter`,
`filteredCombinations`, `initialUrlState.isoFilter`, `initialUrlState.dilutionFilter`,
`showIsoFilter`.
