import AppIntents

/// Auto-registers the open-page App Shortcuts with Siri, Spotlight, and the
/// Shortcuts app. Every phrase includes `\(.applicationName)` (required, or the
/// shortcut is dropped at build-time indexing).
struct DorkroomShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: OpenPageIntent(page: .meter),
            phrases: [
                "Open Light Meter in \(.applicationName)",
                "Open \(.applicationName) Light Meter",
            ],
            shortTitle: "Light Meter",
            systemImageName: "camera.aperture"
        )
        AppShortcut(
            intent: OpenPageIntent(page: .border),
            phrases: [
                "Open Border in \(.applicationName)",
                "Open \(.applicationName) Border calculator",
            ],
            shortTitle: "Border",
            systemImageName: "square.dashed"
        )
        AppShortcut(
            intent: OpenPageIntent(page: .exposure),
            phrases: [
                "Open Exposure in \(.applicationName)",
                "Open \(.applicationName) Exposure calculator",
            ],
            shortTitle: "Exposure",
            systemImageName: "plusminus"
        )
        AppShortcut(
            intent: OpenPageIntent(page: .reciprocity),
            phrases: [
                "Open Reciprocity in \(.applicationName)",
                "Open \(.applicationName) Reciprocity calculator",
            ],
            shortTitle: "Reciprocity",
            systemImageName: "timer"
        )
    }
}
