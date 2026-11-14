import AppIntents
import UIKit

/// "Ask Dorkroom": hands a free-text question to the app's Search, which opens
/// Home with the question in the box and its answer card
/// (`dorkroom://search?q=<question>`, a search EVENT in `redirectSystemPath`).
/// The answer shows in the app, not in Siri: answering inside Siri would need
/// the catalog and the query parser in Swift.
struct AskDorkroomIntent: AppIntent {
    static let title: LocalizedStringResource = "Ask Dorkroom"
    static let description = IntentDescription(
        "Ask a darkroom question, such as how long for HP5 at 800 in DD-X, and see the answer in Dorkroom."
    )
    // The app target's proven style (OpenPageIntent, OpenLightMeterIntent):
    // the system opens the app and runs perform() there.
    static let openAppWhenRun = true

    @Parameter(
        title: "Question",
        requestValueDialog: IntentDialog("What do you want to know?")
    )
    var question: String

    /// RFC 3986 unreserved characters; everything else is percent-encoded, so
    /// `&`, `+`, `=` and `#` in a question cannot split the query. Kept in step
    /// with `tool-manifest.test.ts`, which reads this string.
    static let queryAllowed = CharacterSet(
        charactersIn: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~"
    )

    static func searchURL(for question: String) -> URL? {
        let trimmed = question.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let encoded = trimmed.addingPercentEncoding(withAllowedCharacters: queryAllowed)
        else {
            return nil
        }
        return URL(string: "dorkroom://search?q=" + encoded)
    }

    @MainActor
    func perform() async throws -> some IntentResult {
        // Percent-encoding to an ASCII set cannot fail, so this guard never
        // returns early in practice.
        guard let url = Self.searchURL(for: question) else {
            return .result()
        }
        await UIApplication.shared.open(url)
        return .result()
    }
}
