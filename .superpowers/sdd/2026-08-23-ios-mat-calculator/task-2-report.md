# Task 2 Report: Proportional Mat Preview Geometry

## Implementation

- Added `apps/mobile/src/components/mat/geometry.ts` with the requested `MatRect`, `MatPreviewInput`, and `MatPreviewGeometry` interfaces.
- Added proportional board/window/artwork geometry, one shared scale, centered board placement, reveal-mode handling, and invalid-input null handling.
- Added `apps/mobile/src/components/mat/geometry.test.ts` covering portrait, landscape, hidden artwork, and invalid geometry.

## TDD evidence

### RED

Command: `cd apps/mobile && bun run test -- src/components/mat/geometry.test.ts`

Result: failed as expected because `./geometry` did not exist (`Cannot find module './geometry'`).

### GREEN

Command: `cd apps/mobile && bun run test -- src/components/mat/geometry.test.ts`

Result: passed: 1 test file, 7 tests.

## Verification

- Direct TypeScript 7 check against `apps/mobile/tsconfig.json`: passed.
- Focused Oxlint and Biome checks: passed after formatting.
- `git diff --check`: passed.

## Concern

`apps/mobile`’s `bun run typecheck` script could not locate `typescript-7` because this worktree has no local `node_modules`; the equivalent compiler check passed using `/Users/aaron/workspace/dorkroom/node_modules`.

## Review fix round 1

Added focused invalid-geometry cases for negative borders and horizontal/vertical border sums that exhaust or exceed the outer dimensions.

### RED evidence

Command: `cd apps/mobile && bun run test -- src/components/mat/geometry.test.ts`

Result: failed as expected with 4 failed tests and negative/zero window dimensions returned for the new cases.

### GREEN evidence

Added local validation rejecting negative borders and non-positive horizontal or vertical openings.

Command: `cd apps/mobile && bun run test -- src/components/mat/geometry.test.ts`

Result: passed: 1 test file, 11 tests.

Additional verification commands all passed: focused Oxlint, focused Biome format/check, TypeScript 7 check via the shared workspace compiler, and `git diff --check`.
