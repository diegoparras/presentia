# MAS Distribution Build

This document covers the Mac App Store distribution build for Presenton. Use this only after the `mas-dev` build has been tested on a registered Mac.

The GitHub gist in the release notes is a useful checklist, but the source of truth for this setup is:

- Electron Mac App Store Submission Guide: https://www.electronjs.org/docs/latest/tutorial/mac-app-store-submission-guide/
- electron-builder MAS docs: https://www.electron.build/docs/mas/
- Apple App Store Connect upload docs: https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/
- Apple App Store Connect provisioning profile docs: https://developer.apple.com/help/account/provisioning-profiles/create-an-app-store-provisioning-profile/

## App Identity

- App name: Presenton
- Platform: macOS
- Team ID / App ID Prefix: `S6W5C54KL6`
- Bundle ID: `com.presenton.presenton`
- Application group: `S6W5C54KL6.com.presenton.presenton`

## What Is Configured

The Electron builder config lives in `electron/build.js`.

The MAS distribution build uses:

- `appId`: `com.presenton.presenton`
- `productName`: `Presenton`
- `mac.target`: `mas` when `PRESENTON_MAC_TARGET=mas`
- `mas.type`: `distribution`
- `mas.provisioningProfile`: `build/MacAppStore.provisionprofile`
- `mas.entitlements`: `build/entitlements.mas.plist`
- `mas.entitlementsInherit`: `build/entitlements.mas.inherit.plist`
- `ElectronTeamID`: `S6W5C54KL6`

The distribution build checks that `build/MacAppStore.provisionprofile` exists and can be decoded by macOS before packaging.

## Required Local Apple Setup

This build must be run on macOS with Xcode command-line signing tools available.

Install or create these Apple signing assets on the build Mac:

- Apple Distribution certificate in Keychain.
- Mac Installer Distribution certificate in Keychain for the `.pkg` upload artifact.
- Explicit App ID for `com.presenton.presenton`.
- Mac App Store Connect provisioning profile for that App ID and distribution certificate.

Place the distribution provisioning profile here:

```text
electron/build/MacAppStore.provisionprofile
```

Provisioning profiles are ignored by git and should stay local.

The checked-in marker file is:

```text
electron/build/MacAppStore.provisionprofile.replace_me
```

## Version And Build Numbers

Apple requires the submitted bundle version fields to be numeric dotted values. The current package version is `0.8.6-beta`, so the `mas` build derives:

- `CFBundleShortVersionString`: `0.8.6`
- `CFBundleVersion`: `0.8.6`

Override them when App Store Connect needs a specific version or a higher retry build:

```bash
PRESENTON_APP_STORE_VERSION=0.8.6 PRESENTON_APP_STORE_BUILD=8061 npm run build:all:mas
```

`PRESENTON_APP_STORE_VERSION` must be three period-separated integers. `PRESENTON_APP_STORE_BUILD` must be one to three period-separated integers.

## Build Commands

Run commands from the `electron` directory.

Full MAS distribution build:

```bash
npm run build:all:mas
```

Package only, assuming `resources`, `app_dist`, and dependencies are already built:

```bash
npm run dist:mac:mas
```

Electron package step only, including TypeScript checks and generated version/export runtime:

```bash
npm run build:electron:mas
```

## Expected Output

The MAS distribution app is written under:

```text
electron/dist/mas/
```

The `.pkg` in that output is the artifact to upload to App Store Connect.

Do not use the distribution `.app` as the local smoke-test app. Electron's official guide notes that Apple Distribution-signed MAS apps are not expected to run locally; Apple re-signs them for users after App Store delivery.

## Local Verification

After building on macOS, inspect the app signature:

```bash
codesign --display --verbose=2 "dist/mas/Presenton.app"
```

Check entitlements embedded in the signed app:

```bash
codesign --display --entitlements :- "dist/mas/Presenton.app"
```

Confirm the provisioning profile was embedded:

```bash
ls "dist/mas/Presenton.app/Contents/embedded.provisionprofile"
```

Decode the local distribution provisioning profile if needed:

```bash
security cms -D -i build/MacAppStore.provisionprofile
```

Check the installer package signature:

```bash
pkgutil --check-signature "dist/mas/Presenton-0.8.6-beta.pkg"
```

If the package name changes, run `ls dist/mas/*.pkg` and check that file instead.

## Upload

Use Apple Transporter or another App Store Connect-supported upload path for the `.pkg`. Apple documents Transporter as the simple macOS upload app and notes that, starting in 2026, App Store Connect uploads require Xcode 14 or later.

After upload processing finishes in App Store Connect, select the processed build on the macOS app version record and submit it for review.

## Notes

- `mas-dev` remains the local sandbox test target.
- `mas` is the App Store submission target.
- MAS builds use Apple's App Sandbox. Keep entitlements limited to behavior the app actually uses and explain those entitlements in App Store Connect review notes when needed.
- MAS builds do not follow the same Developer ID notarization flow used for direct-distribution DMG builds.
