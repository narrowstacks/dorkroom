// Custom entry: run polyfills BEFORE expo-router evaluates route modules.
// ESM evaluates imports in source order, so importing the Hermes polyfills
// first guarantees Array.prototype.toSorted (used by @dorkroom/logic) exists
// before any route imports the shared logic. Then hand off to expo-router.
import './src/polyfills/hermes-polyfills';
import 'expo-router/entry';
