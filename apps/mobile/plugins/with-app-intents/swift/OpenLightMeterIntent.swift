import AppIntents
import UIKit

/// A dedicated, parameter-free intent to open the light meter — the natural pick
/// for the Action Button, Control Center, or a one-tap Siri/Spotlight shortcut.
struct OpenLightMeterIntent: AppIntent {
    static var title: LocalizedStringResource = "Open Light Meter"
    static var openAppWhenRun = true

    @MainActor
    func perform() async throws -> some IntentResult {
        await UIApplication.shared.open(URL(string: "dorkroom://meter")!)
        return .result()
    }
}
