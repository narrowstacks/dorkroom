import { describe, expect, it } from 'vitest';
import {
  CONTROLS_LINE,
  patchIndexSwift,
} from '../../plugins/with-widget-controls/patch-index-swift';

// ios/ExpoWidgetsTarget/index.swift exactly as expo-widgets 57.0.27 generated it
// for this app (no home-screen widgets, so the bundle holds only the Live
// Activity), captured from `expo prebuild --platform ios` before the patch.
const GENERATED =
  'import WidgetKit\nimport SwiftUI\ninternal import ExpoWidgets\n\n@main\n' +
  'struct ExportWidgets0: WidgetBundle {\n  var body: some Widget {\n    \n' +
  '    WidgetLiveActivity()\n  }\n}';

// What the prebuild wrote after the patch (same capture).
const PATCHED =
  'import WidgetKit\nimport SwiftUI\ninternal import ExpoWidgets\n\n@main\n' +
  'struct ExportWidgets0: WidgetBundle {\n  var body: some Widget {\n    \n' +
  '    WidgetLiveActivity()\n    DorkroomControlsBundle().body\n  }\n}';

describe('patchIndexSwift', () => {
  it('adds the controls bundle right after WidgetLiveActivity(), same indent', () => {
    expect(patchIndexSwift(GENERATED)).toBe(PATCHED);
    expect(CONTROLS_LINE).toBe('DorkroomControlsBundle().body');
  });

  it('is idempotent', () => {
    expect(patchIndexSwift(PATCHED)).toBe(PATCHED);
    expect(patchIndexSwift(patchIndexSwift(GENERATED))).toBe(PATCHED);
  });

  it('throws when the anchor is missing', () => {
    const changed = GENERATED.replace(
      'WidgetLiveActivity()',
      'WidgetLiveActivityV2()'
    );
    expect(() => patchIndexSwift(changed)).toThrow(/found 0/);
    expect(() => patchIndexSwift('')).toThrow(/WidgetLiveActivity\(\)/);
  });

  it('throws when the anchor appears more than once', () => {
    const twice = GENERATED.replace(
      '    WidgetLiveActivity()\n',
      '    WidgetLiveActivity()\n    WidgetLiveActivity()\n'
    );
    expect(() => patchIndexSwift(twice)).toThrow(/found 2/);
  });

  it('does not count the anchor text inside another line', () => {
    const inline = GENERATED.replace(
      '    WidgetLiveActivity()\n',
      '    if true { WidgetLiveActivity() }\n'
    );
    expect(() => patchIndexSwift(inline)).toThrow(/found 0/);
  });

  it('throws when the controls are already named somewhere else', () => {
    const misplaced = GENERATED.replace('    \n', `    ${CONTROLS_LINE}\n`);
    expect(() => patchIndexSwift(misplaced)).toThrow(/not once right after/);
  });
});
