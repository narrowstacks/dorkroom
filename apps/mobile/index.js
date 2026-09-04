/**
 * Dorkroom
 * Copyright (C) 2026 Aaron F. Anderson <aaron@affords.art>
 *
 * Licensed under the GNU Affero General Public License, version 3, WITH the
 * additional permission for app store distribution granted under AGPLv3
 * section 7. See LICENSE and LICENSE-EXCEPTION at the repository root.
 *
 * That exception is what allows this app to be conveyed through the App Store.
 * It waives no source-availability or copyleft obligation.
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// Custom entry: run polyfills BEFORE expo-router evaluates route modules.
// ESM evaluates imports in source order, so importing the Hermes polyfills
// first guarantees Array.prototype.toSorted (used by @dorkroom/logic) exists
// before any route imports the shared logic. Then hand off to expo-router.
import './src/polyfills/hermes-polyfills';
import 'expo-router/entry';
