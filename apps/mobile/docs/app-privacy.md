# App Store Connect: App Privacy answers

Draft answers for the App Privacy questionnaire (App Store Connect, App Privacy).
They come from the same facts as the iOS section of
[`PRIVACY.md`](../../../PRIVACY.md), which is the public policy at
https://dorkroom.art/privacy. If the app's behavior changes, change both.

Apple's definition of "collect" is data transmitted off the device in a way that
lets you and your partners access it for longer than needed to service the
request in real time. Data that stays on the device is not collected.

## Privacy Policy URL

https://dorkroom.art/privacy

## Do you or your third-party partners collect data from this app?

**Yes**, but only one item, a device-level identifier (see below). If you would
rather not argue the point with App Review, answering Yes and declaring it is the
conservative choice. A "No, we do not collect data" answer is defensible only if
you judge that the client ID is used purely for real-time rate limiting and is
not retained; the code does not log or store it, but the rate limiter (Unkey)
sees it.

## Data types

| Category | Data type | Collected | Linked to the user | Used for tracking | Purpose |
| --- | --- | --- | --- | --- | --- |
| Identifiers | Device ID | Yes (see note) | No | No | App Functionality |
| Everything else | Contact info, health, financial, location, sensitive info, contacts, user content, browsing history, search history, purchases, usage data, diagnostics, other | No | n/a | n/a | n/a |

Note on **Device ID**: the app sends an `X-Client-Id` header on every API request.
It is made up by the app on first launch (a base-36 timestamp plus random
characters, `apps/mobile/src/lib/client-id.ts`), stored in the app's local
storage, and not derived from the Apple ID, `identifierForVendor`, or the
advertising identifier. It is not linked to an account, name, or email. The API
uses it only to rate limit per install (`utils/withHandler.ts`,
`applyClientIdentityRateLimit`) and does not write it to logs or a database.
Apple's "Device ID" is the closest category; it does not literally match, since
this is not a hardware or advertising identifier.

## Why the other categories are "No"

- **Photos or Videos / User Content.** The camera, the photo picker, the film log
  photos, and the negative inverter all stay on the device. Nothing is uploaded.
- **Usage Data, Diagnostics.** The app has no analytics or crash reporting.
- **Location.** Not requested.
- **Search History.** Searches in the app run against data already on the device.
- **Contact Info, Contacts, Purchases, Financial, Health.** Not requested.

## Tracking

**No.** The app does not track: nothing is shared with data brokers or used for
advertising, and no data is linked with third-party data. Do not add
`NSUserTrackingUsageDescription`; the app does not use App Tracking Transparency.

## Permissions the app requests (Info.plist)

| Key | Purpose string |
| --- | --- |
| `NSCameraUsageDescription` | Light meter and negative inverter photos |
| `NSPhotoLibraryUsageDescription` | Choose a photo for a film log shot or the negative inverter |
| `NSPhotoLibraryAddUsageDescription` | Save meter captures and converted negatives (add-only) |

## Privacy manifest

`ios.privacyManifests` in `apps/mobile/app.json` declares the required-reason API
categories in use: UserDefaults, FileTimestamp, SystemBootTime, DiskSpace.
`NSPrivacyTracking` is false and `NSPrivacyCollectedDataTypes` is empty, which
must match the answers above or the client ID decision above needs a matching
`NSPrivacyCollectedDataTypes` entry (`NSPrivacyCollectedDataTypeDeviceID`,
linked false, tracking false, purpose `NSPrivacyCollectedDataTypePurposeAppFunctionality`).
