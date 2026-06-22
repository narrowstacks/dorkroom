import AppIntents

// Phase 2b seed: a functional calculator intent. This is a STUB — it returns a
// "coming soon" dialog. Wiring it to the real reciprocity math in @dorkroom/logic
// requires sharing data with the JS layer (App Group + a native bridge), which is
// intentionally out of scope for Phase 2. It is deliberately NOT listed in
// DorkroomShortcuts, so it is discoverable as an action in the Shortcuts app but
// is not advertised as a Siri phrase.
struct CalculateReciprocityIntent: AppIntent {
    static var title: LocalizedStringResource = "Calculate Reciprocity"
    static var description = IntentDescription(
        "Adjust a metered exposure time for reciprocity failure. (Coming soon.)"
    )

    @Parameter(title: "Metered seconds")
    var meteredSeconds: Double

    func perform() async throws -> some IntentResult & ProvidesDialog {
        return .result(dialog: "Calculator Shortcuts are coming soon to Dorkroom.")
    }
}
