import AppIntents
import UIKit

/// The Dorkroom pages reachable from an App Shortcut.
enum DorkroomPage: String, AppEnum {
    case meter
    case border
    case exposure
    case reciprocity

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Dorkroom Page"

    static var caseDisplayRepresentations: [DorkroomPage: DisplayRepresentation] = [
        .meter: "Light Meter",
        .border: "Border",
        .exposure: "Exposure",
        .reciprocity: "Reciprocity",
    ]

    /// The `dorkroom://` deep link that opens this page. expo-router routes it.
    var url: URL {
        switch self {
        case .meter: return URL(string: "dorkroom://meter")!
        case .border: return URL(string: "dorkroom://")!
        case .exposure: return URL(string: "dorkroom://exposure")!
        case .reciprocity: return URL(string: "dorkroom://reciprocity")!
        }
    }
}

/// Opens the app on a specific page. Backs every open-page App Shortcut.
struct OpenPageIntent: AppIntent {
    static var title: LocalizedStringResource = "Open Dorkroom Page"
    static var openAppWhenRun = true

    @Parameter(title: "Page")
    var page: DorkroomPage

    init() {}

    init(page: DorkroomPage) {
        self.page = page
    }

    @MainActor
    func perform() async throws -> some IntentResult {
        await UIApplication.shared.open(page.url)
        return .result()
    }
}
