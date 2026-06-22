const { withDangerousMod, withXcodeProject } = require('@expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

// The Swift App Intents sources (in ./swift), copied into ios/AppIntents/ and
// compiled into the app target. Order is irrelevant; all go to the same target.
const SWIFT_FILES = [
  'OpenPageIntent.swift',
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

    if (!project.pbxGroupByName(GROUP)) {
      project.addPbxGroup([], GROUP, GROUP);
    }

    for (const file of SWIFT_FILES) {
      const relPath = `${GROUP}/${file}`;
      if (project.hasFile(relPath)) {
        continue; // already referenced — keep prebuild idempotent
      }
      project.addSourceFile(relPath, { target }, GROUP);
    }
    return cfg;
  });
}

module.exports = function withAppIntents(config) {
  config = withAppIntentsFiles(config);
  config = withAppIntentsBuildPhase(config);
  return config;
};
