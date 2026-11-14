// Control Center control kinds, as declared in the widget extension
// (plugins/with-widget-controls/swift/DorkroomControls.swift). The app passes
// them to `reloadControls` after changing what a control shows;
// `control-kinds.test.ts` keeps the two lists in step.
export const CONTROL_KINDS = {
  safelight: 'art.dorkroom.mobile.control.safelight',
  startLastTimer: 'art.dorkroom.mobile.control.start-last-timer',
  logFrame: 'art.dorkroom.mobile.control.log-frame',
  openMeter: 'art.dorkroom.mobile.control.open-meter',
} as const;
