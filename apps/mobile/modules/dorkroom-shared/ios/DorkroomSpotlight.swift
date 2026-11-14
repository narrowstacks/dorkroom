import CoreSpotlight
import Foundation
import UniformTypeIdentifiers

/// Core Spotlight for Dorkroom: how an indexed item is built, and which app
/// path a tapped result may open. Imports only system frameworks, so it can be
/// type-checked on its own (`swiftc -typecheck`); the Expo module and the
/// app-delegate subscriber call it.
///
/// An item's identifier IS the app path it opens (`/shoot/film-log/roll/<id>`,
/// `/develop/recipes/recipe/<id>`), so a tap needs no lookup table. Only those
/// two shapes are ever indexed or opened.
enum DorkroomSpotlight {
  /// The app's URL scheme (`scheme` in app.json).
  static let scheme = "dorkroom"

  /// The only paths an item may carry, each followed by one id segment. Kept
  /// equal to `SPOTLIGHT_PATH_PREFIXES` in `src/lib/spotlight-index.ts`
  /// (`spotlight-index.test.ts` reads this file).
  static let pathPrefixes = [
    "/shoot/film-log/roll/",
    "/develop/recipes/recipe/",
  ]

  /// The only domains items are indexed under. Kept equal to
  /// `SPOTLIGHT_DOMAINS` in `src/lib/spotlight-index.ts`.
  static let domains: Set<String> = ["rolls", "recipes"]

  /// Roll ids (`generateId`) and recipe uuids use only these characters.
  private static let idCharacters = CharacterSet(
    charactersIn: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_")

  static let maxIdLength = 128

  /// `dorkroom://shoot/film-log/roll/<id>` for an allowed path, else nil.
  static func appURL(forPath path: String) -> URL? {
    for prefix in pathPrefixes where path.hasPrefix(prefix) {
      let id = path.dropFirst(prefix.count)
      guard !id.isEmpty, id.count <= maxIdLength,
        id.unicodeScalars.allSatisfy({ idCharacters.contains($0) })
      else {
        return nil
      }
      return URL(string: "\(scheme):/\(path)")
    }
    return nil
  }

  /// The app URL a tapped Spotlight result opens, or nil for any other
  /// activity (the query continuation is left off, see the subscriber).
  static func appURL(for activity: NSUserActivity) -> URL? {
    guard activity.activityType == CSSearchableItemActionType,
      let path = activity.userInfo?[CSSearchableItemActivityIdentifier] as? String
    else {
      return nil
    }
    return appURL(forPath: path)
  }

  /// One item, or nil when its id is not an allowed path or its domain is
  /// unknown. Stays on the device: a `CSSearchableItem` in the default index
  /// is never public (public indexing is an `NSUserActivity` flag, not used).
  static func makeItem(
    id: String,
    domain: String,
    title: String,
    description: String?,
    keywords: [String]?
  ) -> CSSearchableItem? {
    guard appURL(forPath: id) != nil, domains.contains(domain) else {
      return nil
    }
    let attributes = CSSearchableItemAttributeSet(contentType: UTType.text)
    attributes.title = title
    attributes.contentDescription = description
    if let keywords, !keywords.isEmpty {
      attributes.keywords = keywords
    }
    let item = CSSearchableItem(
      uniqueIdentifier: id,
      domainIdentifier: domain,
      attributeSet: attributes)
    // The default is one month. The app re-sends only changed items, so an
    // unchanged roll would drop out; the JS side also re-sends anything
    // indexed more than a week ago (`SPOTLIGHT_REFRESH_MS`).
    item.expirationDate = Date.distantFuture
    return item
  }

  static func index(_ items: [CSSearchableItem], completion: @escaping @Sendable (Error?) -> Void) {
    CSSearchableIndex.default().indexSearchableItems(items, completionHandler: completion)
  }

  static func remove(ids: [String], completion: @escaping @Sendable (Error?) -> Void) {
    CSSearchableIndex.default().deleteSearchableItems(
      withIdentifiers: ids, completionHandler: completion)
  }

  static func remove(domain: String, completion: @escaping @Sendable (Error?) -> Void) {
    CSSearchableIndex.default().deleteSearchableItems(
      withDomainIdentifiers: [domain], completionHandler: completion)
  }

  static func removeAll(completion: @escaping @Sendable (Error?) -> Void) {
    CSSearchableIndex.default().deleteAllSearchableItems(completionHandler: completion)
  }
}
