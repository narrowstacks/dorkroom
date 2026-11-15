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

  it('feeds focus and keyboard visibility into the gate rule', () => {
    const gate = read('src', 'hooks', 'use-keyboard-insets-gate.ts');
    expect(gate).toMatch(/const focused = useIsFocused\(\);/);
    // The will-event tracker, not Keyboard.isVisible(), which flips on the
    // did-events after React Native's handler has already acted.
    expect(gate).toMatch(
      /const keyboard = createKeyboardTracker\(Keyboard\.isVisible\(\)\);/
    );
    expect(gate).toMatch(
      /for \(const event of KEYBOARD_TRACKER_EVENTS\)[\s\S]*?Keyboard\.addListener\(event, \(\) => keyboard\.onEvent\(event\)\)/
    );
    expect(gate).toMatch(/initialKeyboardGate\(focused, keyboard\.isUp\(\)\)/);
    expect(gate).toMatch(
      /keyboardGateOnFocusChange\(gate, focused, keyboard\.isUp\(\)\)/
    );
    // Only to seed the tracker.
    expect(gate.match(/Keyboard\.isVisible\(\)/g)).toHaveLength(1);
    // The hide that clears a held or inherited keyboard's inset, including
    // one that landed before the subscription.
    expect(gate).toMatch(/const waiting = isWaitingForHide\(gate\);/);
    expect(gate).toMatch(
      /addListener\('keyboardDidHide', \(\) =>\s*setGate\(keyboardGateOnHide\)/
    );
    expect(gate).toMatch(
      /if \(!keyboard\.isUp\(\)\) setGate\(keyboardGateOnHide\);/
    );
    expect(gate).toMatch(/return isKeyboardGateOpen\(gate\);/);
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
