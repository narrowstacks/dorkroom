import ExpoModulesCore

/// Opens the app path of a tapped Spotlight result. iOS continues an
/// `NSUserActivity` of type `CSSearchableItemActionType` whose
/// `CSSearchableItemActivityIdentifier` is the item's id, which is the app path
/// (`/shoot/film-log/roll/<id>`). Only the two allowed path shapes open;
/// anything else is ignored (`DorkroomSpotlight.appURL(for:)`).
///
/// Spotlight's "search in app" (`CSQueryContinuationActionType`) is NOT handled
/// here, and the app leaves it off (no `CoreSpotlightContinuation`). If it is
/// turned on, expo-router's `ExpoHeadAppDelegateSubscriber` handles it. Every
/// registered subscriber is called for every activity, so the split is by
/// activity type: this one acts only on `CSSearchableItemActionType`, and
/// expo-router's acts only on an activity with an `href` in its user info or on
/// the query continuation. A searchable item's activity carries only
/// `CSSearchableItemActivityIdentifier`, so one tap opens one URL.
///
/// The URL is handed to the app delegate's `application(_:open:options:)`,
/// exactly as the scene delegate (`plugins/with-ios-scene-lifecycle`) hands it
/// every real incoming URL: expo-linking's subscriber records it synchronously
/// (so on a cold launch, where this runs before the JS bundle, it is the
/// initial URL expo-router reads), React Native's `RCTLinkingManager` posts it
/// to a running app, and expo-router routes it through `redirectSystemPath`.
/// Not `UIApplication.open`: that is an OS round trip whose delivery while the
/// scene is still connecting is less certain.
/// Registered in `expo-module.config.json` (`appDelegateSubscribers`); the
/// scene delegate (`plugins/with-ios-scene-lifecycle`) forwards both the
/// launch-time activities and `scene(_:continue:)` to the app delegate.
public class DorkroomSpotlightAppDelegateSubscriber: ExpoAppDelegateSubscriber {
  public func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    guard let url = DorkroomSpotlight.appURL(for: userActivity),
      let delegate = application.delegate
    else {
      return false
    }
    _ = delegate.application?(application, open: url, options: [:])
    return true
  }
}
