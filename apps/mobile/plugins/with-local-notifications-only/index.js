const { withEntitlementsPlist } = require('@expo/config-plugins');

// Removes the push entitlement that expo-notifications adds.
//
// WHY: the app only schedules LOCAL notifications (the process timer's stage
// and agitation alerts), which need no entitlement. expo-notifications always
// writes `aps-environment`, which would make every signed build require the
// Push Notifications capability on the App ID and a provisioning profile that
// includes it. Mods run in reverse plugin order, so this plugin must be listed BEFORE
// expo-notifications in app.json for its mod to run last.
//
// REMOVE it if the app ever uses remote (push) notifications.
module.exports = function withLocalNotificationsOnly(config) {
  return withEntitlementsPlist(config, (mod) => {
    delete mod.modResults['aps-environment'];
    return mod;
  });
};
