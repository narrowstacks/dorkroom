const { withDangerousMod, withXcodeProject } = require('@expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

// The Swift App Intents sources (in ./swift), copied into ios/AppIntents/ and
// compiled into the app target. Order is irrelevant; all go to the same target.
const SWIFT_FILES = [
  'OpenPageIntent.swift',
  'OpenLightMeterIntent.swift',
  'DorkroomShortcuts.swift',
  'CalculateReciprocityIntent.swift',
];

const GROUP = 'AppIntents';

// Stage 1 — copy the Swift files into ios/AppIntents/ at prebuild.
function withAppIntentsFiles(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const srcDir = path.join(__dirname, 'swift');
      const dstDir = path.join(cfg.modRequest.platformProjectRoot, GROUP);
      fs.mkdirSync(dstDir, { recursive: true });
      for (const file of SWIFT_FILES) {
        fs.copyFileSync(path.join(srcDir, file), path.join(dstDir, file));
      }
      return cfg;
    },
  ]);
}

// Stage 2 — add the copied files to the app target's compile sources.
// Idempotent: a re-run of prebuild must not add duplicate references.
function withAppIntentsBuildPhase(config) {
  return withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const target = project.getFirstTarget().uuid;
    // addSourceFile's 3rd arg is a group KEY (uuid), not a name. Add the files
    // to the project's existing main group with their `AppIntents/<file>` path
    // (sourceTree '<group>' resolves it under SOURCE_ROOT → ios/AppIntents/…).
    const mainGroup = project.getFirstProject().firstProject.mainGroup;

    for (const file of SWIFT_FILES) {
      const relPath = `${GROUP}/${file}`;
      // hasFile matches the stored PBXFileReference path, which is this same
      // `AppIntents/<file>` string — so re-running prebuild stays idempotent.
      if (project.hasFile(relPath)) {
        continue;
      }
      project.addSourceFile(relPath, { target }, mainGroup);
    }
    return cfg;
  });
}

module.exports = function withAppIntents(config) {
  config = withAppIntentsFiles(config);
  config = withAppIntentsBuildPhase(config);
  return config;
};
