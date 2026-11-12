const { withDangerousMod, withXcodeProject } = require('@expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

// Adds WidgetInteractionHold.m (see native/) to the APP target so a Live
// Activity button press keeps the app running long enough for JS to settle the
// timer, its alerts and the activity. Same two stages as with-app-intents.
const FILE = 'WidgetInteractionHold.m';
const GROUP = 'WidgetSupport';

function withFile(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const dst = path.join(cfg.modRequest.platformProjectRoot, GROUP);
      fs.mkdirSync(dst, { recursive: true });
      fs.copyFileSync(
        path.join(__dirname, 'native', FILE),
        path.join(dst, FILE)
      );
      return cfg;
    },
  ]);
}

function withBuildPhase(config) {
  return withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    // The first target is the app: the widget extension is appended after it.
    // Fail loudly if that ever stops being true: this file must never be
    // compiled into the extension.
    const first = project.getFirstTarget();
    const productType = String(first.firstTarget.productType).replace(/"/g, '');
    if (productType !== 'com.apple.product-type.application') {
      throw new Error(
        `with-widget-interaction-hold: the first target is "${first.firstTarget.name}" ` +
          `(${productType}), not the application target, so ${FILE} would not be ` +
          'compiled into the app.'
      );
    }
    const target = first.uuid;
    const mainGroup = project.getFirstProject().firstProject.mainGroup;
    const relPath = `${GROUP}/${FILE}`;
    // Idempotent: a re-run of prebuild must not add a duplicate reference.
    if (!project.hasFile(relPath)) {
      project.addSourceFile(relPath, { target }, mainGroup);
    }
    return cfg;
  });
}

module.exports = function withWidgetInteractionHold(config) {
  return withBuildPhase(withFile(config));
};
