import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Guards the three defects fixed for issue #245:
//   1. every dialog dismisses on Escape via the shared useEscapeKey hook,
//   2. no backdrop paints itself with a raw colour instead of
//      --color-visualization-overlay,
//   3. no dialog hardcodes a foreground colour keyword or hex.
//
// Deliberately scoped to the dialog family. packages/ui carries a wider
// pre-existing raw-colour debt (border-calculator/sections/*.tsx,
// development-recipes/filters-panel.tsx, error-boundary.tsx) that issue #245
// does not cover; widening this guard is a separate change.

const componentsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'components'
);

/** Dialog components that must dismiss on Escape through the shared hook. */
const DISMISSIBLE_DIALOGS = [
  'modal.tsx',
  'confirm-modal.tsx',
  'share-modal.tsx',
  'save-before-share-modal.tsx',
  'drawer.tsx',
  'detail-panel/detail-panel.tsx',
] as const;

function readDialog(relativePath: string): string {
  return readFileSync(join(componentsDir, relativePath), 'utf8');
}

describe('dialog dismissal and colour tokens', () => {
  it.each(DISMISSIBLE_DIALOGS)('%s dismisses via useEscapeKey', (file) => {
    const source = readDialog(file);

    // Requires an actual call, e.g. `useEscapeKey(isOpen, onClose);`, not
    // merely the import line: `import { useEscapeKey } from '...'` contains
    // the substring "useEscapeKey" too, so a plain toContain check would
    // still pass after the call site was deleted.
    expect(source).toMatch(/\buseEscapeKey\(/);
  });

  it.each(
    DISMISSIBLE_DIALOGS
  )('%s has no unreachable onKeyDown on a backdrop', (file) => {
    const source = readDialog(file);

    // A backdrop div carries role="presentation" and no tabIndex, so it can
    // never receive focus and an onKeyDown on it can never fire.
    const backdropKeyHandlers = source.match(
      /role="presentation"[\s\S]{0,200}?onKeyDown/g
    );

    expect(backdropKeyHandlers ?? []).toEqual([]);
  });

  it.each(DISMISSIBLE_DIALOGS)('%s uses no raw palette overlay', (file) => {
    const source = readDialog(file);

    const rawOverlays = source.match(/bg-(?:black|white)(?:\/\d+)?\b/g);

    expect(rawOverlays ?? []).toEqual([]);
  });

  it.each(
    DISMISSIBLE_DIALOGS
  )('%s sets no raw colour keyword or hex in an inline style', (file) => {
    const source = readDialog(file);

    // A declaration counts as tokenised if a theme variable appears anywhere
    // in its value, not just at the start: share-modal.tsx and
    // save-before-share-modal.tsx legitimately use
    // `rgba(var(--color-background-rgb), 0.06)`.
    const rawColours = (
      source.match(/(?:color|backgroundColor|borderColor):\s*'[^']+'/g) ?? []
    ).filter((declaration) => !declaration.includes('var(--'));

    expect(rawColours).toEqual([]);
  });

  it('every dialog backdrop paints with the overlay token', () => {
    const backdropOwners = [
      'modal.tsx',
      'confirm-modal.tsx',
      'share-modal.tsx',
      'save-before-share-modal.tsx',
      'drawer.tsx',
    ];

    const missing = backdropOwners.filter(
      (file) => !readDialog(file).includes('--color-visualization-overlay')
    );

    expect(missing).toEqual([]);
  });
});
