const { withAppDelegate, withInfoPlist } = require('@expo/config-plugins');

// Adopts the UIKit scene lifecycle in the prebuild-generated AppDelegate.
//
// WHY: apps linked against the iOS 27 SDK (Xcode 27) are killed at launch with
// EXC_BREAKPOINT in __UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption
// unless they adopt UIScene (Apple TN3187). Expo's template does not adopt it yet:
//   - https://github.com/expo/expo/issues/46664 (accepted, unreleased)
//   - https://github.com/facebook/react-native/issues/54739 (upstream, PR #54763 unmerged)
// Derived from https://github.com/YesterdaysLemon/expo-ios-scene-lifecycle-plugin,
// extended to forward quick actions (expo-quick-actions), universal links, and
// app life-cycle events to the Expo app-delegate subscribers.
//
// REMOVE this plugin once the Expo SDK ships a scene-based template — check the
// issues above on each SDK upgrade.
//
// The AppDelegate patch is intentionally strict: every anchor throws when it no
// longer matches, so a template change breaks prebuild loudly instead of
// silently producing a non-scene (crashing) or half-patched app.

const sceneConfigurationMethod = `  public func application(
    _ application: UIApplication,
    configurationForConnecting connectingSceneSession: UISceneSession,
    options: UIScene.ConnectionOptions
  ) -> UISceneConfiguration {
    let configuration = UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
    configuration.delegateClass = SceneDelegate.self
    return configuration
  }
`;

const sceneDelegateClass = `class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene else {
      return
    }
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate,
      let factory = appDelegate.reactNativeFactory else {
      return
    }

#if canImport(ExpoQuickActions)
    // Cold-start quick action: under the scene lifecycle it arrives in the
    // connection options, not in application(_:didFinishLaunchingWithOptions:).
    // Seed expo-quick-actions' initial action through its subscriber.
    if let shortcutItem = connectionOptions.shortcutItem,
      let quickActions = ExpoAppDelegateSubscriberRepository.getSubscriberOfType(ExpoQuickActionsAppDelegate.self) {
      _ = quickActions.application(
        UIApplication.shared,
        didFinishLaunchingWithOptions: [UIApplication.LaunchOptionsKey.shortcutItem: shortcutItem])
    }
#endif

    let nextWindow = UIWindow(windowScene: windowScene)
    window = nextWindow
    appDelegate.window = nextWindow

    factory.startReactNative(
      withModuleName: "main",
      in: nextWindow,
      launchOptions: nil)

    if !connectionOptions.urlContexts.isEmpty {
      self.scene(scene, openURLContexts: connectionOptions.urlContexts)
    }
    for userActivity in connectionOptions.userActivities {
      _ = appDelegate.application(UIApplication.shared, continue: userActivity) { _ in }
    }
  }

  // Deep links (custom scheme). Forwards to the AppDelegate so both
  // RCTLinkingManager and the Expo subscribers (e.g. expo-dev-launcher's
  // onDeepLink) receive them.
  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else {
      return
    }
    for urlContext in URLContexts {
      var options: [UIApplication.OpenURLOptionsKey: Any] = [
        .openInPlace: urlContext.options.openInPlace
      ]
      if let sourceApplication = urlContext.options.sourceApplication {
        options[.sourceApplication] = sourceApplication
      }
      if let annotation = urlContext.options.annotation {
        options[.annotation] = annotation
      }
      _ = appDelegate.application(UIApplication.shared, open: urlContext.url, options: options)
    }
  }

  // Universal links.
  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else {
      return
    }
    _ = appDelegate.application(UIApplication.shared, continue: userActivity) { _ in }
  }

  // Home-screen quick actions while the app is running.
  func windowScene(
    _ windowScene: UIWindowScene,
    performActionFor shortcutItem: UIApplicationShortcutItem,
    completionHandler: @escaping (Bool) -> Void
  ) {
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else {
      completionHandler(false)
      return
    }
    appDelegate.application(UIApplication.shared, performActionFor: shortcutItem, completionHandler: completionHandler)
  }

  // Under the scene lifecycle UIKit stops calling the UIApplicationDelegate
  // life-cycle methods; Expo's app-delegate subscribers still rely on them.
  func sceneDidBecomeActive(_ scene: UIScene) {
    (UIApplication.shared.delegate as? AppDelegate)?.applicationDidBecomeActive(UIApplication.shared)
  }

  func sceneWillResignActive(_ scene: UIScene) {
    (UIApplication.shared.delegate as? AppDelegate)?.applicationWillResignActive(UIApplication.shared)
  }

  func sceneWillEnterForeground(_ scene: UIScene) {
    (UIApplication.shared.delegate as? AppDelegate)?.applicationWillEnterForeground(UIApplication.shared)
  }

  func sceneDidEnterBackground(_ scene: UIScene) {
    (UIApplication.shared.delegate as? AppDelegate)?.applicationDidEnterBackground(UIApplication.shared)
  }
}
`;

function addInfoPlistSceneManifest(config) {
  return withInfoPlist(config, (nextConfig) => {
    nextConfig.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
          },
        ],
      },
    };
    return nextConfig;
  });
}

function patchAppDelegate(contents) {
  if (
    contents.includes('class SceneDelegate: UIResponder, UIWindowSceneDelegate')
  ) {
    return contents; // already patched (idempotent for non-clean prebuild)
  }

  let nextContents = contents;

  // 1. Imports for the SceneDelegate's Expo subscriber access.
  const importMarker = 'import React\n';
  if (!nextContents.includes(importMarker)) {
    throw new Error(
      'with-ios-scene-lifecycle: could not find "import React" in AppDelegate.swift.'
    );
  }
  nextContents = nextContents.replace(
    importMarker,
    // NOTE: must be `internal import` — the generated ExpoModulesProvider.swift
    // imports these as internal, and Swift 6 rejects mixed implicit/explicit
    // access levels for the same import within one module.
    `${importMarker}internal import ExpoModulesCore\n#if canImport(ExpoQuickActions)\ninternal import ExpoQuickActions\n#endif\n`
  );

  // 2. Remove the pre-scene startup block — the SceneDelegate starts React Native
  //    once UIKit connects the scene (deployment target >= iOS 13, so there is no
  //    legacy non-scene path to keep).
  const startupBlockPattern =
    /#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\(\n\s*withModuleName: "main",\n\s*in: window,\n\s*launchOptions: launchOptions\)\n#endif/;
  if (!startupBlockPattern.test(nextContents)) {
    throw new Error(
      'with-ios-scene-lifecycle: could not find the React Native startup block in AppDelegate.swift — the Expo template changed; re-check whether this plugin is still needed (expo/expo#46664).'
    );
  }
  nextContents = nextContents.replace(
    startupBlockPattern,
    '// React Native is started by SceneDelegate.scene(_:willConnectTo:options:)\n    // (UIScene lifecycle — see plugins/with-ios-scene-lifecycle).'
  );

  // 3. Route scene sessions to our SceneDelegate.
  const linkingMarker = '\n  // Linking API';
  if (!nextContents.includes(linkingMarker)) {
    throw new Error(
      'with-ios-scene-lifecycle: could not find the "// Linking API" marker in AppDelegate.swift.'
    );
  }
  nextContents = nextContents.replace(
    linkingMarker,
    `\n${sceneConfigurationMethod}${linkingMarker}`
  );

  // 4. Insert the SceneDelegate class.
  const reactNativeDelegateMarker =
    '\nclass ReactNativeDelegate: ExpoReactNativeFactoryDelegate';
  if (!nextContents.includes(reactNativeDelegateMarker)) {
    throw new Error(
      'with-ios-scene-lifecycle: could not find ReactNativeDelegate in AppDelegate.swift.'
    );
  }
  return nextContents.replace(
    reactNativeDelegateMarker,
    `\n${sceneDelegateClass}${reactNativeDelegateMarker}`
  );
}

function addAppDelegateSceneLifecycle(config) {
  return withAppDelegate(config, (nextConfig) => {
    if (nextConfig.modResults.language !== 'swift') {
      throw new Error(
        `with-ios-scene-lifecycle: AppDelegate is ${nextConfig.modResults.language}; only Swift is supported.`
      );
    }
    nextConfig.modResults.contents = patchAppDelegate(
      nextConfig.modResults.contents
    );
    return nextConfig;
  });
}

module.exports = function withIosSceneLifecycle(config) {
  return addAppDelegateSceneLifecycle(addInfoPlistSceneManifest(config));
};
