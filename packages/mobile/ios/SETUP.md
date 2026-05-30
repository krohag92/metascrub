# iOS Setup Guide

This file documents the exact steps to set up the iOS Capacitor project and Share Extension.
Run these steps after cloning the repo. The Xcode toolchain is required.

## Prerequisites

- macOS with Xcode 15+ installed
- Apple Developer Program membership (for device testing and App Store submission)
- Node.js 18+ and pnpm installed

## Step 1 — Build the web app

```bash
cd packages/mobile
pnpm install
pnpm build
```

## Step 2 — Add the iOS platform

```bash
# From packages/mobile/
npx cap add ios
```

This generates the `ios/` Xcode project. Do NOT commit the generated `ios/` folder to version
control except for the files already tracked (Swift sources, entitlements, SETUP.md).

After running `cap add ios`, copy the override files from this repo:

```bash
# Copy pre-written entitlements for the main app
cp packages/mobile/ios/MetaScrub.entitlements ios/App/App/MetaScrub.entitlements
```

## Step 3 — Configure the main app in Xcode

Open the Xcode project:

```bash
npx cap open ios
```

In Xcode:

1. Select the **App** target.
2. In **Signing & Capabilities** tab, click "+" and add **App Groups**.
3. Set the App Group to: `group.com.metadatafinder.metascrub`
4. In the **Info** tab, add a URL Type:
   - Identifier: `com.metadatafinder.metascrub`
   - URL Schemes: `metascrub`
5. Assign `MetaScrub.entitlements` as the entitlements file for the App target.

## Step 4 — Add the Share Extension target

In Xcode:

1. **File → New → Target → Share Extension**
2. Product Name: `MetaScrubShare`
3. Bundle Identifier: `com.metadatafinder.metascrub.ShareExtension`
4. Language: Swift
5. Click Finish.

Copy the pre-written Swift sources:

```bash
cp packages/mobile/ios/MetaScrubShare/ShareViewController.swift \
   ios/MetaScrubShare/ShareViewController.swift

cp packages/mobile/ios/MetaScrubShare/Info.plist \
   ios/MetaScrubShare/Info.plist

cp packages/mobile/ios/MetaScrubShare/MetaScrubShare.entitlements \
   ios/MetaScrubShare/MetaScrubShare.entitlements
```

In Xcode, for the **MetaScrubShare** target:

1. In **Signing & Capabilities**, add **App Groups** → `group.com.metadatafinder.metascrub`
2. Set the entitlements file to `MetaScrubShare.entitlements`
3. Set **Deployment Target** to match the main app (iOS 14+)

## Step 5 — Sync and run

```bash
# From packages/mobile/
pnpm build && npx cap sync
```

Then in Xcode, select a simulator or connected device and press Run (Cmd+R).

## Step 6 — Verifying the Share Extension

1. Open Photos or Files on the simulator.
2. Long-press an image → Share → MetaScrub.
3. The Share Extension copies the file to the App Group container and opens the main app.
4. The main app's `App.tsx` listener fires via `appUrlOpen` with `metascrub://share?path=...`

## Troubleshooting

- **"App Group not found"**: Make sure both targets have identical App Group IDs in entitlements.
- **"URL scheme not opening main app"**: Verify `metascrub` is listed in `CFBundleURLTypes` in the main `Info.plist`.
- **Share Extension not appearing in share sheet**: Extension targets must match team/provisioning. Re-sign if needed.
- **File not found after share**: Check that `containerURL(forSecurityApplicationGroupIdentifier:)` returns non-nil — the App Group must be provisioned on the device.
