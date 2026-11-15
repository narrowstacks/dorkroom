// Pure half of with-widget-controls: adds the controls bundle to the widget
// bundle expo-widgets generates in ios/ExpoWidgetsTarget/index.swift. Kept apart
// from index.js so it can be unit-tested (src/lib/widget-controls-patch.test.ts).

/** The generated line the controls go after: the last entry of the @main bundle. */
const ANCHOR = /^([ \t]*)WidgetLiveActivity\(\)[ \t]*$/gm;

/** The line added under the anchor. `DorkroomControlsBundle` is in swift/DorkroomControls.swift. */
const CONTROLS_LINE = 'DorkroomControlsBundle().body';

/**
 * Returns `source` (the generated index.swift) with the controls bundle added
 * after the `WidgetLiveActivity()` line. Already patched text comes back
 * unchanged. Throws when the anchor is missing or appears more than once, so an
 * expo-widgets upgrade that changes the generated file fails the prebuild
 * instead of silently dropping the controls.
 *
 * @param {string} source
 * @returns {string}
 */
function patchIndexSwift(source) {
  const anchors = [...source.matchAll(ANCHOR)];
  if (anchors.length !== 1) {
    throw new Error(
      `with-widget-controls: expected exactly one "WidgetLiveActivity()" line in ` +
        `ios/ExpoWidgetsTarget/index.swift, found ${anchors.length}. expo-widgets ` +
        'changed the widget bundle it generates; update the anchor in ' +
        'plugins/with-widget-controls/patch-index-swift.js, or the Control Center ' +
        'controls would be left out of the build.'
    );
  }
  const added = source.split(CONTROLS_LINE).length - 1;
  const [line, indent] = anchors[0];
  const patchedLine = `${line}\n${indent}${CONTROLS_LINE}`;
  if (added === 1 && source.includes(patchedLine)) return source;
  if (added !== 0) {
    throw new Error(
      `with-widget-controls: index.swift already names ${CONTROLS_LINE} ` +
        `${added} time(s), but not once right after WidgetLiveActivity(). ` +
        'Delete ios/ExpoWidgetsTarget and run prebuild again.'
    );
  }
  return source.replace(line, patchedLine);
}

module.exports = { patchIndexSwift, CONTROLS_LINE };
