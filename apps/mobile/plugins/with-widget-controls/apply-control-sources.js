// Xcode project half of with-widget-controls (index.js): compiles the control
// sources in the widget extension, and the link intent in the app too. Kept
// apart so it can be tested against a project fixture
// (src/lib/widget-controls-project.test.ts).

const TARGET = 'ExpoWidgetsTarget';
const SWIFT_FILES = [
  'DorkroomControls.swift',
  'SafelightControl.swift',
  'ControlLinkIntent.swift',
];
// Also compiled into the app, so the buttons' intent runs in the app process
// (see the file). The extension builds it with EXTENSION_FLAG.
const SHARED_WITH_APP = ['ControlLinkIntent.swift'];
const EXTENSION_FLAG = 'DORKROOM_WIDGET_EXTENSION';
const EXTENSION_PRODUCT_TYPE = 'com.apple.product-type.app-extension';
const APP_PRODUCT_TYPE = 'com.apple.product-type.application';

const productTypeOf = (project, key) =>
  String(project.pbxNativeTargetSection()[key].productType).replace(/"/g, '');

/** The extension target's key, found by name and checked to be an app extension. */
function extensionTargetKey(project) {
  const key = project.findTargetKey(TARGET);
  if (!key) {
    throw new Error(
      `with-widget-controls: no "${TARGET}" target in the Xcode project. ` +
        'Is expo-widgets configured, and listed after this plugin in app.json?'
    );
  }
  const productType = productTypeOf(project, key);
  if (productType !== EXTENSION_PRODUCT_TYPE) {
    throw new Error(
      `with-widget-controls: "${TARGET}" is a ${productType}, not an app extension.`
    );
  }
  return key;
}

/** The one application target's key. */
function appTargetKey(project) {
  const keys = Object.keys(project.pbxNativeTargetSection()).filter(
    (key) =>
      !key.endsWith('_comment') &&
      productTypeOf(project, key) === APP_PRODUCT_TYPE
  );
  if (keys.length !== 1) {
    throw new Error(
      `with-widget-controls: expected one application target, found ${keys.length}.`
    );
  }
  return keys[0];
}

const unquote = (value) => String(value ?? '').replace(/"/g, '');

/**
 * The ExpoWidgetsTarget group that holds the extension's sources: the one
 * named AND pathed `ExpoWidgetsTarget`. `pod install` adds a second group with
 * that name (under ExpoModulesProviders, no path), and on a prebuild that
 * reuses ios/ it can come first, so a lookup by name alone could put the files
 * at ios/<file> and break the build.
 */
function sourcesGroupKey(project) {
  const key = project.findPBXGroupKey({ name: TARGET, path: TARGET });
  if (!key) {
    throw new Error(
      `with-widget-controls: no PBXGroup with name and path "${TARGET}" in the ` +
        'project (expo-widgets creates it). Run `expo prebuild --clean` if ' +
        'ios/ is from an older setup.'
    );
  }
  return key;
}

/** The file reference for `file` inside the sources group, or undefined. */
function fileRefKey(project, groupKey, file) {
  const refs = project.pbxFileReferenceSection();
  const group = project.getPBXGroupByKey(groupKey);
  return (group?.children ?? [])
    .map((child) => child.value)
    .find((key) => refs[key] !== undefined && unquote(refs[key].path) === file);
}

/** The target's Sources build phase; throws when it has none. */
// Looked up through the target's own build phases: the xcode package's
// `pbxSourcesBuildPhaseObj` falls back to ANOTHER target's Sources phase when
// this one has none.
function sourcesPhase(project, targetKey) {
  const phases = project.hash.project.objects.PBXSourcesBuildPhase ?? {};
  const entry = (
    project.pbxNativeTargetSection()[targetKey]?.buildPhases ?? []
  ).find((p) => phases[p.value] !== undefined);
  const phase = entry === undefined ? undefined : phases[entry.value];
  if (!phase) {
    const name = project.pbxNativeTargetSection()[targetKey]?.name ?? targetKey;
    throw new Error(
      `with-widget-controls: target "${unquote(name)}" has no Sources build phase.`
    );
  }
  return phase;
}

/** Whether the target's Sources phase already compiles this file reference. */
function compiles(project, targetKey, ref) {
  const phase = sourcesPhase(project, targetKey);
  const buildFiles = project.pbxBuildFileSection();
  return phase.files.some((entry) => buildFiles[entry.value]?.fileRef === ref);
}

/**
 * Compiles `file` (in the ExpoWidgetsTarget group) in a target: the first
 * target to take it creates the file reference, a second one gets a build file
 * for the same reference. Idempotent, also over a project that prebuild reused.
 *
 * Every write goes to the phase `sourcesPhase` found through the target's own
 * build phases, never through the xcode package's phase lookup (by the comment
 * "Sources", which can land in another target's phase). The build file is made
 * as `addSourceFile` makes it: a PBXBuildFile entry, then `{ value, comment }`
 * appended to the phase's `files`.
 */
function addToSources(project, targetKey, groupKey, file) {
  const phase = sourcesPhase(project, targetKey);
  let ref = fileRefKey(project, groupKey, file);
  if (ref === undefined) {
    // addFile creates the PBXFileReference and adds it to the group, nothing else.
    const added = project.addFile(file, groupKey);
    if (!added) {
      throw new Error(
        `with-widget-controls: could not add ${file}: a file reference with ` +
          `that path exists outside the "${TARGET}" group. Run ` +
          '`expo prebuild --clean`.'
      );
    }
    ref = added.fileRef;
  } else if (compiles(project, targetKey, ref)) {
    return;
  }
  const buildFile = {
    uuid: project.generateUuid(),
    fileRef: ref,
    basename: file,
    group: 'Sources',
  };
  project.addToPbxBuildFileSection(buildFile);
  phase.files.push({
    value: buildFile.uuid,
    comment: `${buildFile.basename} in ${buildFile.group}`,
  });
}

/** Adds EXTENSION_FLAG to the extension's Swift compilation conditions. */
function setExtensionFlag(project, targetKey) {
  const listKey =
    project.pbxNativeTargetSection()[targetKey].buildConfigurationList;
  const list = project.pbxXCConfigurationList()[listKey];
  const configs = project.pbxXCBuildConfigurationSection();
  for (const { value } of list.buildConfigurations) {
    const settings = configs[value].buildSettings;
    const current = unquote(settings.SWIFT_ACTIVE_COMPILATION_CONDITIONS);
    if (current.split(/\s+/).includes(EXTENSION_FLAG)) continue;
    settings.SWIFT_ACTIVE_COMPILATION_CONDITIONS = `"${
      current === '' ? '$(inherited)' : current
    } ${EXTENSION_FLAG}"`;
  }
}

// Stage 2: compile the Swift files in the extension (and the shared one in the
// app too). Idempotent: a re-run of prebuild over an existing ios/ adds nothing twice.
function applyControlSources(project) {
  const extensionKey = extensionTargetKey(project);
  const appKey = appTargetKey(project);
  const groupKey = sourcesGroupKey(project);
  // Checked up front, before anything is added to either target.
  sourcesPhase(project, extensionKey);
  sourcesPhase(project, appKey);
  for (const file of SWIFT_FILES) {
    addToSources(project, extensionKey, groupKey, file);
  }
  for (const file of SHARED_WITH_APP) {
    addToSources(project, appKey, groupKey, file);
  }
  setExtensionFlag(project, extensionKey);
}

module.exports = { applyControlSources, SWIFT_FILES };
