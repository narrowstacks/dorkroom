# Top-level ISO filter (and orphaned sub-filter params)

Date: 2026-07-14
Status: Approved, not yet implemented

## Problem

A deep-linked `?iso=400` with no film is applied to page state and counted in the
filter badge, but has **no visible control and does not filter**. The user cannot
see it, cannot clear it, and cannot tell why the badge says one thing and the
results say another. State and UI disagree.

This surfaced while verifying the search-param fix (PR #151). It is not caused by
that PR — it is the existing design showing through:

- `showIsoFilter={!!selectedFilm}` — the ISO control only renders with a film.
- `availableISOs` returns `[]` with no film.
- Filtering is guarded: `if (isoFilter && selectedFilm)`.
- `setSelectedFilm()` deliberately clears the ISO filter.

ISO is a sub-filter of film. Dilution is the identical pattern under developer
(`showDilutionFilter={!!selectedDeveloper}`, `if (dilutionFilter && selectedDeveloper)`,
and `setSelectedDeveloper()` clears it), so `?dilution=1+9` with no developer has
the same defect.

## Decision

**Promote ISO to a top-level filter.** Leave dilution a sub-filter of developer,
and simply stop applying it when orphaned.

Dilution is not promoted because a dilution value is developer-relative — `1+9`
means different things for different developers — so a combined global list would
mix incomparable values and mislead. ISO has no such problem: `shootingIso` is an
absolute number, and there are only 19 distinct values across all 1,020 recipes
(25, 50, 64, 80, 100, 125, 200, 250, 320, 400, 500, 600, 800, 1000, 1600, 3200,
6400, 12500, 25000), which is a perfectly reasonable select list.

## Design

### 1. `availableISOs` — always populated

`packages/logic/src/hooks/development-recipes/use-development-recipes.ts`

Currently returns `[]` when no film is selected. It will instead always return the
distinct `shootingIso` values across **all** combinations, sorted ascending and
prefixed with `{ label: 'All ISOs', value: '' }`.

When a film **is** selected, additionally offer `{ label: 'Box speed (N)', value:
'boxspeed' }` immediately after "All ISOs", as it does today. Box speed is the one
genuinely film-relative option and is worth keeping.

**The numeric list stays global even when a film is selected** — it does *not*
narrow to that film's ISOs as it does today. This is forced by the decision below
that ISO survives a film change: the control must always be able to display the
value it is holding.

Accepted trade-off: with a film selected, the list now includes ISOs that yield
zero results for that film, where today it only ever showed that film's ISOs. This
is the honest cost of a top-level filter, and the zero-result state is visible and
clearable rather than silent.

### 2. Filtering — ungated for numeric ISO

Same file, in the filter pipeline (currently `if (isoFilter && selectedFilm)`):

```
if (isoFilter) {
  if (isoFilter === 'boxspeed') {
    // Relative to the film's rated speed; a no-op without a film.
    if (selectedFilm) {
      keep combos where combo.shootingIso === selectedFilm.isoSpeed
    }
  } else {
    keep combos where String(combo.shootingIso) === isoFilter
  }
}
```

### 3. `setSelectedFilm` stops clearing the ISO filter

Same file. Delete the `setIsoFilter('')` side-effect inside `setSelectedFilm`.
A top-level filter must not be silently reset by another control — that is what
makes it top-level, and it is why a deep link carrying both `?film=` and `?iso=`
currently loses the ISO.

Dilution keeps its equivalent behaviour: `setSelectedDeveloper()` still clears
`dilutionFilter`, because dilution remains developer-scoped.

### 4. The ISO control is always visible

`apps/dorkroom/src/app/pages/development-recipes/development-recipes-page.tsx`

Drop `showIsoFilter={!!selectedFilm}` at both call sites (desktop sidebar, mobile
sheet). The `showIsoFilter` prop on `CollapsibleFilters` already defaults to
`true`, so removing the prop is sufficient. Leave `showDilutionFilter={!!selectedDeveloper}`
untouched.

### 5. Orphaned sub-filter params are not applied

`packages/logic/src/hooks/development-recipes/use-recipe-url-state.ts`, in the
`initialUrlState` memo:

- `?iso=boxspeed` with no resolvable film → do not set `isoFilter`.
- `?dilution=…` with no resolvable developer → do not set `dilutionFilter`.

A numeric `?iso=` needs no guard — after this change it is meaningful on its own.

No separate URL or badge cleanup is required. The existing UI→URL sync effect
writes `urlParams.iso = currentState.isoFilter || ''` and
`urlParams.dilution = currentState.dilutionFilter || ''`, so a filter that never
enters state is automatically absent from both the URL and the badge count.

The resulting invariant: **state = what you can see and clear.**

## Behaviour after the change

| URL | Before | After |
| --- | --- | --- |
| `?iso=400` | invisible, inert, counted in badge | ISO control shows 400; results filtered to ISO 400 |
| `?film=hp5&iso=400` | ISO dropped by `setSelectedFilm` | both applied |
| `?iso=boxspeed` | invisible, inert, counted | ignored; cleaned from URL |
| `?film=hp5&iso=boxspeed` | applied | applied (unchanged) |
| `?dilution=1+9` | invisible, inert, counted | ignored; cleaned from URL |
| `?developer=xtol&dilution=1+9` | applied | applied (unchanged) |
| Select a film while ISO is set | ISO silently cleared | ISO persists |

## Testing

`@dorkroom/logic`:

- `availableISOs` returns the full global list with no film selected.
- `availableISOs` includes `Box speed (N)` only when a film is selected.
- A numeric ISO filter narrows results with no film selected.
- `boxspeed` is a no-op with no film selected.
- Selecting a film preserves an existing ISO filter.

URL state:

- `?iso=boxspeed` with no film does not set `isoFilter`.
- `?dilution=…` with no developer does not set `dilutionFilter`.
- `?iso=400` with no film does set `isoFilter`.

Existing development-recipes tests must stay green.

## Out of scope

- Promoting dilution to a top-level filter (see Decision).
- The `brand=ilford` case-sensitivity mismatch on `/films` (separate pre-existing
  bug, unrelated to sub-filter scoping).

## Notes

This changes rendered output — the ISO control now appears where it previously did
not. Per the repo's PR rule, the PR needs before/after screenshots via the
`pr-screenshots` skill.

Stacks on `advisor/017-url-search-coercion` (PR #151).
