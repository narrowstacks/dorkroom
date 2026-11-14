import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CONTROL_KINDS } from './control-kinds';

const SWIFT_DIR = fileURLToPath(
  new URL('../../plugins/with-widget-controls/swift', import.meta.url)
);
const read = (file: string) => readFileSync(join(SWIFT_DIR, file), 'utf8');

describe('Control Center control kinds', () => {
  const declared = Object.fromEntries(
    [
      ...read('DorkroomControls.swift').matchAll(
        /static let (\w+) = "([^"]+)"/g
      ),
    ].map((m) => [m[1], m[2]])
  );

  it('match the kinds the extension declares', () => {
    expect(declared).toEqual(CONTROL_KINDS);
  });

  it('are each used by exactly one control', () => {
    const sources =
      read('DorkroomControls.swift') + read('SafelightControl.swift');
    for (const name of Object.keys(CONTROL_KINDS)) {
      expect(
        sources.split(`kind: DorkroomControlKind.${name}`).length - 1,
        name
      ).toBe(1);
    }
  });

  it('are all in the controls bundle', () => {
    const bundle = read('DorkroomControls.swift').match(
      /struct DorkroomControlsBundle: WidgetBundle \{[\s\S]*?\n\}/
    )?.[0];
    expect(bundle).toBeDefined();
    for (const control of [
      'SafelightControl()',
      'StartLastTimerControl()',
      'LogFrameControl()',
      'OpenMeterControl()',
    ]) {
      expect(bundle, control).toContain(control);
    }
  });

  it('keeps the safelight keys the app mirrors', () => {
    const swift = read('SafelightControl.swift');
    expect(swift).toContain('static let onKey = "safelightOn"');
    expect(swift).toContain('static let changedAtKey = "safelightChangedAt"');
    // Never "paper safe" (see CLAUDE.md, Safelight mode).
    expect(swift.toLowerCase()).not.toContain('paper safe');
    expect(swift).toContain('Label("Safelight mode"');
  });
});
