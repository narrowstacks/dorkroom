const { withAppDelegate } = require('@expo/config-plugins');

// Makes the window's root view controller forward status bar appearance (and the
// home indicator) to the React Native view controller beneath it.
//
// WHY: the app runs with UIViewControllerBasedStatusBarAppearance true, so iOS
// asks the window's root view controller whether the status bar is hidden or
// light, and expects it to hand the question down to the visible screen.
// react-native-screens swizzles UIViewController so a container forwards to its
// last child, but only when that child is one of its own view controllers
// (RNSViewControllerDelegate). expo-dev-launcher (every Debug / dev-client
// build) inserts its own DevLauncherViewController between the root view
// controller and the RNSNavigationController, so the chain stops at the root:
// `statusBarHidden` and `autoHideHomeIndicator` reach RNSScreen and then nothing
// asks it. Verified in the live hierarchy: the root is a plain UIViewController
// and childViewControllerForStatusBarHidden is nil.
//
// The root forwards to its last child unconditionally. From there UIKit asks
// DevLauncherViewController, which react-native-screens' swizzle forwards on to
// the RNSNavigationController, and on to the visible RNSScreen. Without the dev
// client the RNSNavigationController is already the root's last child and the
// result is the same.
//
// If a module ever supplies its own root view controller (for example
// expo-screen-orientation), the override passes it through unchanged, and
// forwarding would need to be added there.
//
// The patch is strict: every anchor throws when it no longer matches, so an
// Expo template change fails prebuild loudly instead of silently dropping the
// forwarding. REMOVE this plugin once expo-dev-launcher forwards status bar
// appearance itself.

const CLASS_TAG = 'with-ios-status-bar-forwarding class';
const OVERRIDE_TAG = 'with-ios-status-bar-forwarding override';

const forwardingClass = `// Hands status bar and home indicator questions to the React Native view
// controller (see plugins/with-ios-status-bar-forwarding).
final class StatusBarForwardingViewController: UIViewController {
  override var childForStatusBarStyle: UIViewController? { children.last }
  override var childForStatusBarHidden: UIViewController? { children.last }
  override var childForHomeIndicatorAutoHidden: UIViewController? { children.last }
  override var preferredStatusBarUpdateAnimation: UIStatusBarAnimation {
    children.last?.preferredStatusBarUpdateAnimation ?? .fade
  }
}
`;

const rootViewControllerOverride = `// Replaces Expo's plain UIViewController fallback so status bar appearance
// reaches the React Native screens (plugins/with-ios-status-bar-forwarding).
override func createRootViewController() -> UIViewController {
  let viewController = super.createRootViewController()
  return type(of: viewController) == UIViewController.self
    ? StatusBarForwardingViewController()
    : viewController
}
`;

function indent(body, prefix) {
  return body
    .split('\n')
    .map((line) => (line ? prefix + line : line))
    .join('\n');
}

function markedBlock(tag, body) {
  return `// @generated begin ${tag}\n${body}// @generated end ${tag}\n`;
}

// Replaces the marked region for \`tag\` with the current body, or inserts a new
// one before \`anchor\` (or after it, with \`after\`) when none exists yet. Run on
// every prebuild, so an AppDelegate patched by an older body heals itself and a
// second application changes nothing.
function upsertRegion(contents, { tag, body, anchor, after = false, pad }) {
  const block = indent(markedBlock(tag, body), pad);
  const region = new RegExp(
    `^[ \\t]*// @generated begin ${tag}\\n[\\s\\S]*?// @generated end ${tag}\\n`,
    'm'
  );
  if (region.test(contents)) {
    return contents.replace(region, () => block);
  }
  if (!contents.includes(anchor)) {
    throw new Error(
      `with-ios-status-bar-forwarding: could not find ${JSON.stringify(anchor.trim())} in AppDelegate.swift: the Expo template changed; re-check whether this plugin is still needed.`
    );
  }
  return contents.replace(anchor, () =>
    after ? `${anchor}\n${block}` : `${block}\n${anchor}`
  );
}

function patchAppDelegate(contents) {
  const withClass = upsertRegion(contents, {
    tag: CLASS_TAG,
    body: forwardingClass,
    anchor: 'class ReactNativeDelegate: ExpoReactNativeFactoryDelegate',
    pad: '',
  });
  return upsertRegion(withClass, {
    tag: OVERRIDE_TAG,
    body: rootViewControllerOverride,
    anchor: '  // Extension point for config-plugins\n',
    after: true,
    pad: '  ',
  });
}

module.exports = function withIosStatusBarForwarding(config) {
  return withAppDelegate(config, (nextConfig) => {
    if (nextConfig.modResults.language !== 'swift') {
      throw new Error(
        `with-ios-status-bar-forwarding: AppDelegate is ${nextConfig.modResults.language}; only Swift is supported.`
      );
    }
    nextConfig.modResults.contents = patchAppDelegate(
      nextConfig.modResults.contents
    );
    return nextConfig;
  });
};
