import AppIntents
import SwiftUI
import WidgetKit

/// Safelight mode as the app and this extension share it, in the App Group's
/// UserDefaults. The app keeps its own copy in MMKV for its first frame and
/// mirrors every change here; on launch and on foreground it adopts this value
/// when `safelightChangedAt` is newer than its own (`src/lib/safelight-store.ts`).
enum SharedSafelight {
  static let onKey = "safelightOn"
  static let changedAtKey = "safelightChangedAt"

  /// The suite named by the extension's Info.plist (written by expo-widgets).
  private static var defaults: UserDefaults? {
    guard
      let group = Bundle.main.object(forInfoDictionaryKey: "ExpoWidgetsAppGroupIdentifier")
        as? String
    else { return nil }
    return UserDefaults(suiteName: group)
  }

  static var isOn: Bool {
    defaults?.bool(forKey: onKey) ?? false
  }

  /// Writes the value with a stamp newer than the one already there, even when
  /// the clock was set back since (`max(now, shared + 1)`, the rule the app
  /// applies too: `nextSafelightStamp` in src/lib/safelight-reconcile.ts), so
  /// the app never takes a press made later for an older change.
  static func set(_ on: Bool) {
    guard let defaults else { return }
    let now = (Date().timeIntervalSince1970 * 1000).rounded(.down)
    let previous = (defaults.object(forKey: changedAtKey) as? NSNumber)?.doubleValue
    let stamp = previous.map { max(now, $0.rounded(.down) + 1) } ?? now
    // Stamp first, then value (as the app does): a crash between the two
    // leaves a newer stamp over the old value, which the app settles.
    defaults.set(stamp, forKey: changedAtKey)
    defaults.set(on, forKey: onKey)
  }
}

struct SafelightValueProvider: ControlValueProvider {
  var previewValue: Bool { false }

  func currentValue() async throws -> Bool {
    SharedSafelight.isOn
  }
}

/// Runs in the extension, so the toggle works with the app closed: turn it on
/// before the lights go off and the app opens red.
struct SetSafelightIntent: SetValueIntent {
  static var title: LocalizedStringResource = "Set Safelight mode"
  static var isDiscoverable: Bool = false

  @Parameter(title: "Safelight mode")
  var value: Bool

  init() {}

  func perform() async throws -> some IntentResult {
    SharedSafelight.set(value)
    return .result()
  }
}

struct SafelightControl: ControlWidget {
  var body: some ControlWidgetConfiguration {
    StaticControlConfiguration(
      kind: DorkroomControlKind.safelight,
      provider: SafelightValueProvider()
    ) { isOn in
      ControlWidgetToggle(isOn: isOn, action: SetSafelightIntent()) {
        Label("Safelight mode", systemImage: "lightbulb.fill")
      } valueLabel: { on in
        Text(on ? "On" : "Off")
      }
      .tint(.red)
    }
    .displayName("Safelight mode")
    .description("Turns Dorkroom deep red on black for the darkroom.")
  }
}
