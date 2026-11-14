import AppIntents
#if !DORKROOM_WIDGET_EXTENSION
import UIKit
#endif

// The intent behind the Control Center buttons. Compiled into BOTH the app and
// the widget extension (plugins/with-widget-controls): the control in the
// extension refers to it, and because the app has it too and it runs in the
// foreground, the system launches or foregrounds the app and runs `perform()`
// THERE, where `UIApplication` can open the link. The extension's copy is built
// with DORKROOM_WIDGET_EXTENSION (set on that target only), so it never names
// `UIApplication`, which an app extension may not use.
//
// Why not `.result(opensIntent: OpenURLIntent(url))` from the extension alone:
// on the iOS 27.0 Simulator the action "succeeded" but the system logged the
// prepared URL as nil and the app never opened, for a `dorkroom://` URL.

/// The screens a control button opens, as the `dorkroom://` links the app's
/// `redirectSystemPath` resolves (`src/lib/tool-manifest.test.ts` parses them).
enum DorkroomControlLink: String, AppEnum {
  case startLastTimer = "start-last-timer"
  case logFrame = "log-frame"
  case openMeter = "open-meter"

  static var typeDisplayRepresentation: TypeDisplayRepresentation = "Dorkroom Link"

  static var caseDisplayRepresentations: [DorkroomControlLink: DisplayRepresentation] = [
    .startLastTimer: "Start last timer",
    .logFrame: "Log a frame",
    .openMeter: "Open meter",
  ]

  var url: URL {
    switch self {
    case .startLastTimer: return URL(string: "dorkroom://develop/recipes/timer?start=last")!
    case .logFrame: return URL(string: "dorkroom://log-frame")!
    case .openMeter: return URL(string: "dorkroom://meter")!
    }
  }
}

struct OpenControlLinkIntent: AppIntent {
  static var title: LocalizedStringResource = "Open Dorkroom"
  static var isDiscoverable: Bool = false
  /// Runs with the app in front (iOS 26's replacement for `openAppWhenRun`).
  static var supportedModes: IntentModes = .foreground(.immediate)

  @Parameter(title: "Link")
  var link: DorkroomControlLink

  init() {}

  init(link: DorkroomControlLink) {
    self.link = link
  }

  @MainActor
  func perform() async throws -> some IntentResult {
    #if !DORKROOM_WIDGET_EXTENSION
    await UIApplication.shared.open(link.url)
    #endif
    return .result()
  }
}
