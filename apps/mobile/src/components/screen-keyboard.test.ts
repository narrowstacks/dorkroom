import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// `Screen` and the navigation calls are native code that cannot load under
// vitest, so the wiring that keeps a keyboard elsewhere from scrolling a
// screen under its header (#732) is checked in the source.
const MOBILE_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const read = (...parts: string[]) =>
  readFileSync(join(MOBILE_ROOT, ...parts), 'utf8');

describe('keyboard insets on Screen', () => {
  it('gates automaticallyAdjustKeyboardInsets on the focus gate', () => {
    const screen = read('src', 'components', 'screen.tsx');
    expect(screen).toMatch(
      /const (\w+) = useKeyboardInsetsGate\(\);[\s\S]*automaticallyAdjustKeyboardInsets=\{\1\}/
    );
    expect(screen).not.toMatch(
      /automaticallyAdjustKeyboardInsets(\s|=\{true\})/
    );
  });

  it('opens the gate only for the focused screen', () => {
    const gate = read('src', 'hooks', 'use-keyboard-insets-gate.ts');
    expect(gate).toMatch(/const focused = useIsFocused\(\);/);
    expect(gate).toMatch(/return focused && !\w+;/);
  });

  it.each([['roll-form-screen.tsx'], ['shot-form-screen.tsx']])(
    '%s closes the keyboard before going back on save',
    (file) => {
      expect(read('src', 'screens', 'film-log', file)).toMatch(
        /Keyboard\.dismiss\(\);\s*router\.back\(\);/
      );
    }
  );
});
