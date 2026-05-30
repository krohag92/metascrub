# Android Setup Guide

This file documents how to add the Android platform and configure Share Intent support.

## Prerequisites

- Android Studio Hedgehog (2023.1.1) or later
- Android SDK API 22+ (minSdk) and API 34 (targetSdk) installed
- JDK 17+
- Node.js 18+ and pnpm installed

## Step 1 — Build the web app

```bash
cd packages/mobile
pnpm install
pnpm build
```

## Step 2 — Add the Android platform

```bash
# From packages/mobile/
npx cap add android
```

This generates the `android/` directory. Do NOT commit the generated `android/` folder
except for the files already tracked in this repo (SETUP.md, MANIFEST_OVERRIDE.md).

## Step 3 — Apply the AndroidManifest intent-filter overrides

After `npx cap add android`, open `android/app/src/main/AndroidManifest.xml` and add the
intent-filter blocks described in `android/MANIFEST_OVERRIDE.md` to the main `<activity>` element.

## Step 4 — Open in Android Studio

```bash
npx cap open android
```

## Step 5 — Sync and run

```bash
pnpm build && npx cap sync
```

Then in Android Studio, select a device/emulator and click Run.

## Step 6 — Verifying the Share Intent

1. Open the Files app on the emulator.
2. Long-press a file → Share → MetaScrub.
3. MetaScrub opens and receives the content URI via the `appUrlOpen` event.

## Building a release APK/AAB

See `SIGNING.md` at the package root for keystore generation and signing steps.

```bash
# From android/
./gradlew bundleRelease
```

The `.aab` file is at `android/app/build/outputs/bundle/release/app-release.aab`.
Upload this to Google Play Console.
