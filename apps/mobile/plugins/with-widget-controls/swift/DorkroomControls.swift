import AppIntents
import SwiftUI
import WidgetKit

// Dorkroom's Control Center controls. Compiled into the widget extension only
// (plugins/with-widget-controls adds them to ExpoWidgetsTarget and to the
// generated widget bundle). The extension is built for iOS 26 (app.json
// `ios.deploymentTarget`), so the iOS 18 control APIs need no guards. The
// buttons' intent is in ControlLinkIntent.swift, compiled into the app too.

/// Control kinds. `src/lib/control-kinds.ts` repeats them for `reloadControls`
/// (a test keeps the two in step).
enum DorkroomControlKind {
  static let safelight = "art.dorkroom.mobile.control.safelight"
  static let startLastTimer = "art.dorkroom.mobile.control.start-last-timer"
  static let logFrame = "art.dorkroom.mobile.control.log-frame"
  static let openMeter = "art.dorkroom.mobile.control.open-meter"
}

/// Added to the generated `@main` widget bundle after `WidgetLiveActivity()`.
struct DorkroomControlsBundle: WidgetBundle {
  var body: some Widget {
    SafelightControl()
    StartLastTimerControl()
    LogFrameControl()
    OpenMeterControl()
  }
}

struct StartLastTimerControl: ControlWidget {
  var body: some ControlWidgetConfiguration {
    StaticControlConfiguration(kind: DorkroomControlKind.startLastTimer) {
      ControlWidgetButton(action: OpenControlLinkIntent(link: .startLastTimer)) {
        Label("Start last timer", systemImage: "timer")
      }
    }
    .displayName("Start last timer")
    .description("Starts the Process Timer with the stages of your last run.")
  }
}

struct LogFrameControl: ControlWidget {
  var body: some ControlWidgetConfiguration {
    StaticControlConfiguration(kind: DorkroomControlKind.logFrame) {
      ControlWidgetButton(action: OpenControlLinkIntent(link: .logFrame)) {
        Label("Log a frame", systemImage: "film")
      }
    }
    .displayName("Log a frame")
    .description("Adds a shot to the roll the light meter logs to.")
  }
}

struct OpenMeterControl: ControlWidget {
  var body: some ControlWidgetConfiguration {
    StaticControlConfiguration(kind: DorkroomControlKind.openMeter) {
      ControlWidgetButton(action: OpenControlLinkIntent(link: .openMeter)) {
        Label("Open meter", systemImage: "camera.aperture")
      }
    }
    .displayName("Open meter")
    .description("Opens the light meter.")
  }
}
