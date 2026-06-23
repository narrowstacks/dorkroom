// Learn more: https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch the whole monorepo so changes to @dorkroom/* hot-reload.
config.watchFolders = [workspaceRoot];

// 2. Resolve modules from the app first, then the workspace root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Force a single React instance. As of SDK 56 the app and the repo root both
// use React 19.2.3, so React normally hoists to one copy at the workspace root
// and the redirect below is inert (no nested apps/mobile/node_modules/react to
// point at). It stays as a guard: if a future version divergence ever
// reintroduces a nested app-level React, the hard redirect in resolveRequest
// pins react/react-dom to a single copy for every importer, avoiding the
// "Incompatible React versions" renderer mismatch. extraNodeModules is only a
// *fallback* and does not cover workspace packages (e.g. @dorkroom/logic,
// bundled from packages/), which is why the redirect is explicit.
config.resolver.extraNodeModules = {
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
};

const pinnedPackages = ['react', 'react-dom'].reduce((acc, name) => {
  const dir = path.resolve(projectRoot, 'node_modules', name);
  if (fs.existsSync(dir)) acc.push({ name, dir });
  return acc;
}, []);

// 4. Resolve @dorkroom/* to their TypeScript SOURCE, not the built dist.
// The packages' package.json `main` points at ./dist, which only exists after
// a `turbo run build`. Bundling from src instead means (a) no build step is
// needed before `eas build`/`expo export`, and (b) Metro's platform-extension
// resolution picks up files like use-window-dimensions.native.ts. Internal
// relative imports inside each package still resolve normally (with .native).
const sourceEntrypoints = {
  '@dorkroom/logic': path.resolve(workspaceRoot, 'packages/logic/src/index.ts'),
  '@dorkroom/api': path.resolve(workspaceRoot, 'packages/api/src/index.ts'),
};

const withNW = withNativeWind(config, { input: './global.css' });
const upstreamResolveRequest = withNW.resolver.resolveRequest;

function resolve(context, moduleName, platform) {
  return (upstreamResolveRequest ?? context.resolveRequest)(
    context,
    moduleName,
    platform
  );
}

withNW.resolver.resolveRequest = (context, moduleName, platform) => {
  // Hard-pin react/react-dom to the app's copy for every importer.
  for (const { name, dir } of pinnedPackages) {
    if (moduleName === name) {
      return resolve(context, dir, platform);
    }
    if (moduleName.startsWith(`${name}/`)) {
      return resolve(context, dir + moduleName.slice(name.length), platform);
    }
  }

  const entry = sourceEntrypoints[moduleName];
  if (entry) {
    return { type: 'sourceFile', filePath: entry };
  }

  // @dorkroom/api's source uses explicit `.js` extensions in its relative
  // imports (correct for its NodeNext dist build), but the on-disk files are
  // `.ts`. When bundling from source, rewrite a relative `*.js` import to its
  // TypeScript sibling, falling back to the original if no `.ts/.tsx` exists.
  if (moduleName.startsWith('.') && moduleName.endsWith('.js')) {
    for (const ext of ['.ts', '.tsx']) {
      try {
        return resolve(context, moduleName.replace(/\.js$/, ext), platform);
      } catch {
        // try next extension / fall through to original
      }
    }
  }

  return resolve(context, moduleName, platform);
};

module.exports = withNW;
