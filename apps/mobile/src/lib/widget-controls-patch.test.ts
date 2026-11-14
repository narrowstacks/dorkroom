import { describe, expect, it } from 'vitest';
import {
  CONTROLS_LINE,
  patchIndexSwift,
} from '../../plugins/with-widget-controls/patch-index-swift';

// ios/ExpoWidgetsTarget/index.swift exactly as expo-widgets 57.0.27 generated it
// for this app before it had Home Screen widgets (the bundle held only the Live
// Activity), captured from `expo prebuild --platform ios` before the patch.
// Kept: it is the shape again if `widgets[]` is ever emptied.
const GENERATED =
  'import WidgetKit\nimport SwiftUI\ninternal import ExpoWidgets\n\n@main\n' +
  'struct ExportWidgets0: WidgetBundle {\n  var body: some Widget {\n    \n' +
  '    WidgetLiveActivity()\n  }\n}';

// What the prebuild wrote after the patch (same capture).
const PATCHED =
  'import WidgetKit\nimport SwiftUI\ninternal import ExpoWidgets\n\n@main\n' +
  'struct ExportWidgets0: WidgetBundle {\n  var body: some Widget {\n    \n' +
  '    WidgetLiveActivity()\n    DorkroomControlsBundle().body\n  }\n}';

// The same file with the three Home Screen widgets in app.json's `widgets[]`
// (expo-widgets 57.0.27, captured from the prebuild after the patch, so the
// generated text is it minus the one added line). The widgets come first and
// `WidgetLiveActivity()` still ends the @main bundle: expo-widgets chunks the
// widgets four per bundle and puts the Live Activity at the end of the LAST
// one, so the anchor stays single however many widgets there are.
const GENERATED_WITH_WIDGETS =
  'import WidgetKit\nimport SwiftUI\ninternal import ExpoWidgets\n\n@main\n' +
  'struct ExportWidgets0: WidgetBundle {\n  var body: some Widget {\n' +
  '    RollWidget()\n    LastResultWidget()\n    TimerWidget()\n' +
  '    WidgetLiveActivity()\n  }\n}';

const PATCHED_WITH_WIDGETS =
  'import WidgetKit\nimport SwiftUI\ninternal import ExpoWidgets\n\n@main\n' +
  'struct ExportWidgets0: WidgetBundle {\n  var body: some Widget {\n' +
  '    RollWidget()\n    LastResultWidget()\n    TimerWidget()\n' +
  '    WidgetLiveActivity()\n    DorkroomControlsBundle().body\n  }\n}';

describe('patchIndexSwift with Home Screen widgets', () => {
  it('adds the controls after the Live Activity, below the widgets', () => {
    expect(patchIndexSwift(GENERATED_WITH_WIDGETS)).toBe(PATCHED_WITH_WIDGETS);
  });

  it('is idempotent', () => {
    expect(patchIndexSwift(PATCHED_WITH_WIDGETS)).toBe(PATCHED_WITH_WIDGETS);
  });

  it('keeps every widget in the bundle', () => {
    const patched = patchIndexSwift(GENERATED_WITH_WIDGETS);
    for (const name of ['RollWidget', 'LastResultWidget', 'TimerWidget']) {
      expect(patched).toContain(`    ${name}()\n`);
    }
  });
});

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
