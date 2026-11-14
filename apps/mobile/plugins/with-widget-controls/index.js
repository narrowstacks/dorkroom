const { withDangerousMod, withXcodeProject } = require('@expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');
const { applyControlSources, SWIFT_FILES } = require('./apply-control-sources');
const { patchIndexSwift } = require('./patch-index-swift');

// Control Center controls (swift/), compiled into the widget extension that
// expo-widgets generates. expo-widgets has no Control Center support and
// rewrites ios/ExpoWidgetsTarget/ on every prebuild, so this plugin must run
// AFTER it: list it BEFORE "expo-widgets" in app.json (mods run in reverse list
// order; src/lib/app-plugin-order.test.ts pins it). The extension's deployment
// target comes from app.json `ios.deploymentTarget`, which expo-widgets reads.
const TARGET = 'ExpoWidgetsTarget';

// Stage 1: copy the Swift files next to the generated ones and add the controls
// to the generated widget bundle.
function withControlFiles(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const targetDir = path.join(cfg.modRequest.platformProjectRoot, TARGET);
      const indexPath = path.join(targetDir, 'index.swift');
      if (!fs.existsSync(indexPath)) {
        throw new Error(
          `with-widget-controls: ${indexPath} does not exist. List this plugin ` +
            'before "expo-widgets" in app.json so it runs after expo-widgets ' +
            'has generated the extension.'
        );
      }
      for (const file of SWIFT_FILES) {
        fs.copyFileSync(
          path.join(__dirname, 'swift', file),
          path.join(targetDir, file)
        );
      }
      const source = fs.readFileSync(indexPath, 'utf8');
      const patched = patchIndexSwift(source);
      if (patched !== source) fs.writeFileSync(indexPath, patched);
      return cfg;
    },
  ]);
}

function withControlSources(config) {
  return withXcodeProject(config, (cfg) => {
    applyControlSources(cfg.modResults);
    return cfg;
  });
}

module.exports = function withWidgetControls(config) {
  return withControlSources(withControlFiles(config));
};
