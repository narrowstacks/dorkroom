// The Xcode project half of plugins/with-widget-controls, against a small
// project in the shape a reused ios/ has after `pod install`: TWO PBXGroups
// named ExpoWidgetsTarget, the pathless autolinking one FIRST. A lookup by
// name alone would put the control sources at ios/<file> and break the build.
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { IOSConfig, type XcodeProject } from 'expo/config-plugins';
import { afterEach, describe, expect, it } from 'vitest';
import { applyControlSources } from '../../plugins/with-widget-controls/apply-control-sources';

const FIXTURE = fileURLToPath(
  new URL(
    '../../plugins/with-widget-controls/fixtures/reused-project.pbxproj',
    import.meta.url
  )
);
const SOURCES_GROUP = 'AA00000000000000000000C1';
const AUTOLINK_GROUP = 'AA00000000000000000000C0';
const APP_TARGET = 'AA00000000000000000000D0';
const EXTENSION_TARGET = 'AA00000000000000000000D1';
const APP_SOURCES = 'AA00000000000000000000E0';
const EXTENSION_SOURCES = 'AA00000000000000000000E1';

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function loadFixture(): XcodeProject {
  const root = mkdtempSync(join(tmpdir(), 'widget-controls-'));
  roots.push(root);
  mkdirSync(join(root, 'ios', 'Dorkroom.xcodeproj'), { recursive: true });
  copyFileSync(
    FIXTURE,
    join(root, 'ios', 'Dorkroom.xcodeproj', 'project.pbxproj')
  );
  return IOSConfig.XcodeUtils.getPbxproj(root);
}

const childNames = (project: XcodeProject, groupKey: string): string[] =>
  project
    .getPBXGroupByKey(groupKey)
    .children.map((c: { comment: string }) => c.comment);

/** The file names a Sources phase compiles, from its build files' comments. */
const compiled = (project: XcodeProject, phaseKey: string): string[] =>
  project.hash.project.objects.PBXSourcesBuildPhase[phaseKey].files.map(
    (f: { comment: string }) => f.comment.replace(/ in Sources$/, '')
  );

describe('applyControlSources on a reused project', () => {
  it('puts the control sources in the group with the ExpoWidgetsTarget path', () => {
    const project = loadFixture();
    applyControlSources(project);
    expect(childNames(project, SOURCES_GROUP)).toEqual([
      'index.swift',
      'DorkroomControls.swift',
      'SafelightControl.swift',
      'ControlLinkIntent.swift',
    ]);
    expect(childNames(project, AUTOLINK_GROUP)).toEqual([
      'ExpoModulesProvider.swift',
    ]);
  });

  it('compiles each file once, the link intent in both targets from one reference', () => {
    const project = loadFixture();
    applyControlSources(project);
    expect(compiled(project, EXTENSION_SOURCES)).toEqual([
      'index.swift',
      'DorkroomControls.swift',
      'SafelightControl.swift',
      'ControlLinkIntent.swift',
    ]);
    expect(compiled(project, APP_SOURCES)).toEqual(['ControlLinkIntent.swift']);
    const buildFiles = project.pbxBuildFileSection();
    const refOf = (phaseKey: string) =>
      project.hash.project.objects.PBXSourcesBuildPhase[phaseKey].files
        .filter((f: { comment: string }) =>
          f.comment.startsWith('ControlLinkIntent.swift')
        )
        .map((f: { value: string }) => buildFiles[f.value].fileRef);
    expect(refOf(APP_SOURCES)).toEqual(refOf(EXTENSION_SOURCES));
  });

  it('sets the extension flag on every extension configuration only', () => {
    const project = loadFixture();
    applyControlSources(project);
    const settings = project.pbxXCBuildConfigurationSection();
    expect(
      settings.AA00000000000000000000A4.buildSettings
        .SWIFT_ACTIVE_COMPILATION_CONDITIONS
    ).toBe('"$(inherited) DORKROOM_WIDGET_EXTENSION"');
    expect(
      settings.AA00000000000000000000A5.buildSettings
        .SWIFT_ACTIVE_COMPILATION_CONDITIONS
    ).toBe('"$(inherited) DORKROOM_WIDGET_EXTENSION"');
    expect(
      settings.AA00000000000000000000A3.buildSettings
        .SWIFT_ACTIVE_COMPILATION_CONDITIONS
    ).toBe('DEBUG');
  });

  it('changes nothing when applied again (a prebuild that reuses ios/)', () => {
    const project = loadFixture();
    applyControlSources(project);
    const once = project.writeSync();
    applyControlSources(project);
    expect(project.writeSync()).toBe(once);
  });

  it('throws when there is no group with that name and path', () => {
    const project = loadFixture();
    delete project.getPBXGroupByKey(SOURCES_GROUP).path;
    expect(() => applyControlSources(project)).toThrow(/name and path/);
  });

  it('throws when there is no ExpoWidgetsTarget target', () => {
    const project = loadFixture();
    project.pbxNativeTargetSection()[EXTENSION_TARGET].name = 'Other';
    expect(() => applyControlSources(project)).toThrow(
      /no "ExpoWidgetsTarget" target/
    );
  });

  it('throws when ExpoWidgetsTarget is not an app extension', () => {
    const project = loadFixture();
    project.pbxNativeTargetSection()[EXTENSION_TARGET].productType =
      '"com.apple.product-type.framework"';
    expect(() => applyControlSources(project)).toThrow(/not an app extension/);
  });

  it('throws without exactly one application target', () => {
    const none = loadFixture();
    none.pbxNativeTargetSection()[APP_TARGET].productType =
      '"com.apple.product-type.framework"';
    expect(() => applyControlSources(none)).toThrow(
      /expected one application target, found 0/
    );
  });

  it('throws, before changing anything, for a target with no Sources phase', () => {
    const project = loadFixture();
    project.pbxNativeTargetSection()[APP_TARGET].buildPhases = [];
    const before = project.writeSync();
    expect(() => applyControlSources(project)).toThrow(
      /target "Dorkroom" has no Sources build phase/
    );
    expect(project.writeSync()).toBe(before);
  });

  it('throws, before changing anything, for an extension with no Sources phase', () => {
    const project = loadFixture();
    project.pbxNativeTargetSection()[EXTENSION_TARGET].buildPhases = [];
    const before = project.writeSync();
    expect(() => applyControlSources(project)).toThrow(
      /target "ExpoWidgetsTarget" has no Sources build phase/
    );
    expect(project.writeSync()).toBe(before);
  });

  it('writes to the target own phase even when it is not commented "Sources"', () => {
    // The xcode package finds a phase by its "Sources" comment and, when the
    // target has none so named, falls back to the first such phase in the
    // file: here the app's, which comes first.
    const project = loadFixture();
    const target = project.pbxNativeTargetSection()[EXTENSION_TARGET];
    target.buildPhases[0].comment = 'Compile Swift';
    project.hash.project.objects.PBXSourcesBuildPhase[
      `${EXTENSION_SOURCES}_comment`
    ] = 'Compile Swift';
    applyControlSources(project);
    expect(compiled(project, EXTENSION_SOURCES)).toEqual([
      'index.swift',
      'DorkroomControls.swift',
      'SafelightControl.swift',
      'ControlLinkIntent.swift',
    ]);
    expect(compiled(project, APP_SOURCES)).toEqual(['ControlLinkIntent.swift']);
    const once = project.writeSync();
    applyControlSources(project);
    expect(project.writeSync()).toBe(once);
  });
});
