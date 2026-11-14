import ExpoModulesCore
import WidgetKit

/// Thrown when the app's Info.plist has no App Group id, or the build lacks the
/// App Group entitlement. Without the entitlement `UserDefaults(suiteName:)`
/// still succeeds, but returns a store private to the app that the extension
/// never sees, so the missing group container is what gives it away.
final class AppGroupUnavailableException: Exception, @unchecked Sendable {
  override var reason: String {
    "The App Group is unavailable: Info.plist has no ExpoWidgetsAppGroupIdentifier "
      + "(written by the expo-widgets config plugin), or the build lacks the "
      + "App Group entitlement (no group container)"
  }
}

/// Synchronous reads and writes on the App Group's UserDefaults, shared with the
/// widget extension (the Control Center controls), and Control Center reloads.
/// The group id is the one expo-widgets writes into the app's Info.plist, so the
/// app, the extension and this module can never disagree about it.
public final class DorkroomSharedModule: Module {
  private static let groupKey = "ExpoWidgetsAppGroupIdentifier"

  /// The shared suite, or nil when the group is unavailable. Looked up once.
  private lazy var suite: UserDefaults? = {
    guard
      let group = Bundle.main.object(forInfoDictionaryKey: Self.groupKey) as? String,
      !group.isEmpty,
      FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group) != nil
    else {
      return nil
    }
    return UserDefaults(suiteName: group)
  }()

  private func defaults() throws -> UserDefaults {
    guard let suite else {
      throw AppGroupUnavailableException()
    }
    return suite
  }

  public func definition() -> ModuleDefinition {
    Name("DorkroomShared")

    Function("getSharedBool") { (key: String) throws -> Bool? in
      (try self.defaults().object(forKey: key) as? NSNumber)?.boolValue
    }

    Function("setSharedBool") { (key: String, value: Bool) throws in
      try self.defaults().set(value, forKey: key)
    }

    Function("getSharedNumber") { (key: String) throws -> Double? in
      (try self.defaults().object(forKey: key) as? NSNumber)?.doubleValue
    }

    Function("setSharedNumber") { (key: String, value: Double) throws in
      try self.defaults().set(value, forKey: key)
    }

    // The app target is iOS 26, so ControlCenter (iOS 18) needs no guard.
    Function("reloadControls") { (kind: String?) in
      if let kind {
        ControlCenter.shared.reloadControls(ofKind: kind)
      } else {
        ControlCenter.shared.reloadAllControls()
      }
    }
  }
}
