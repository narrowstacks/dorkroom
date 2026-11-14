import CoreSpotlight
import ExpoModulesCore

/// One item to index, as `src/lib/spotlight-index.ts` builds it. The field
/// shapes follow expo-router's `MetadataOptions` record.
struct SpotlightItemRecord: Record {
  @Field
  var id: String = ""
  @Field
  var domain: String = ""
  @Field
  var title: String = ""
  @Field
  var description: String?
  @Field
  var keywords: [String]?
}

/// Rejected when Core Spotlight reports an error; the JS side then leaves its
/// record of what was indexed unchanged, so the next sync tries again.
final class SpotlightIndexException: GenericException<String>, @unchecked Sendable {
  override var reason: String {
    "Core Spotlight failed: \(param)"
  }
}

/// Core Spotlight indexing for rolls and recipes (on-device index only). A
/// separate module from `DorkroomShared` in the same pod, so a dev client built
/// before it existed reports it missing and the JS side falls back to a no-op.
public final class DorkroomSpotlightModule: Module {
  private static func settle(_ promise: Promise) -> @Sendable (Error?) -> Void {
    return { error in
      if let error {
        promise.reject(SpotlightIndexException(error.localizedDescription))
      } else {
        promise.resolve()
      }
    }
  }

  public func definition() -> ModuleDefinition {
    Name("DorkroomSpotlight")

    AsyncFunction("indexSpotlightItems") { (items: [SpotlightItemRecord], promise: Promise) in
      // An item whose id is not an allowed app path, or whose domain is
      // unknown, is dropped here too (the JS builders never send one).
      let searchable = items.compactMap { item in
        DorkroomSpotlight.makeItem(
          id: item.id,
          domain: item.domain,
          title: item.title,
          description: item.description,
          keywords: item.keywords)
      }
      if searchable.isEmpty {
        promise.resolve()
        return
      }
      DorkroomSpotlight.index(searchable, completion: Self.settle(promise))
    }

    AsyncFunction("removeSpotlightItems") { (ids: [String], promise: Promise) in
      if ids.isEmpty {
        promise.resolve()
        return
      }
      DorkroomSpotlight.remove(ids: ids, completion: Self.settle(promise))
    }

    AsyncFunction("removeSpotlightDomain") { (domain: String, promise: Promise) in
      DorkroomSpotlight.remove(domain: domain, completion: Self.settle(promise))
    }

    AsyncFunction("removeAllSpotlightItems") { (promise: Promise) in
      DorkroomSpotlight.removeAll(completion: Self.settle(promise))
    }
  }
}
