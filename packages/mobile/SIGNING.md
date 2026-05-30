# Signing & Release Guide

Step-by-step instructions for signing and submitting MetaScrub to both the App Store and Google Play.
Anton is responsible for all signing and upload steps. Never commit keys, keystores, or certificates.

---

## iOS — App Store

### Prerequisites

- Apple Developer Program membership ($99/year) — https://developer.apple.com
- Bundle ID registered in App Store Connect: `com.metadatafinder.metascrub`
- App Group ID registered: `group.com.metadatafinder.metascrub`
- Distribution certificate (Apple Distribution) in your Keychain
- App Store provisioning profile for `com.metadatafinder.metascrub`
- Share Extension provisioning profile for `com.metadatafinder.metascrub.ShareExtension`

### Step 1 — Build the web app and sync

```bash
cd packages/mobile
pnpm build
npx cap sync
```

### Step 2 — Open Xcode and configure signing

```bash
npx cap open ios
```

For each target (App and MetaScrubShare):
1. Select target → **Signing & Capabilities** tab.
2. Team: Select your Apple Developer team.
3. Bundle Identifier: `com.metadatafinder.metascrub` (App) / `com.metadatafinder.metascrub.ShareExtension` (extension).
4. Provisioning Profile: select the corresponding App Store profile.

### Step 3 — Archive

1. In Xcode, set the scheme to **App** and destination to **Any iOS Device (arm64)**.
2. Product → **Archive** (Cmd+Shift+B waits for build; Product → Archive starts it).
3. When archiving completes, the Organizer window opens automatically.

### Step 4 — Validate and upload

In Organizer:
1. Select the archive → **Distribute App**.
2. Choose **App Store Connect** → Next.
3. Choose **Upload** → Next.
4. Leave all checkboxes at defaults (include bitcode if prompted, include symbols).
5. Sign: select **Automatically manage signing** or your specific profiles.
6. Click **Upload**.
7. Wait for App Store Connect processing (usually 5-30 minutes).

### Step 5 — Submit for review in App Store Connect

1. Go to https://appstoreconnect.apple.com
2. Select MetaScrub → **App Store** tab.
3. Select the uploaded build.
4. Fill in "What's New", verify all listing fields (see `assets/app-store-listing.md`).
5. Submit for Review.

### iOS Share Extension — adding to the project

See `ios/SETUP.md` for step-by-step instructions on adding the MetaScrubShare target.
The Swift source files are at `ios/MetaScrubShare/`:
- `ShareViewController.swift`
- `Info.plist`
- `MetaScrubShare.entitlements`

Both targets must be in the same provisioning team and share the same App Group ID.

### iOS Build Troubleshooting

- **"Provisioning profile doesn't include the entitlement"**: Re-download provisioning profiles after adding the App Group capability in the Developer Portal.
- **"No eligible devices"**: The distribution profile requires a physical device or an Xcode simulator.
- **"Code Sign error"**: Make sure the distribution certificate is in your Keychain (not just the developer cert).

---

## Android — Google Play

### Prerequisites

- Google Play Developer account ($25 one-time) — https://play.google.com/console
- JDK 17+ installed (`java -version` should show 17)
- Android Studio with SDK API 34 installed

### Step 1 — Generate a keystore (do this ONCE, store securely)

**Never commit the keystore file to version control.**
Store it in 1Password, a hardware key, or a secure vault.

```bash
keytool -genkey -v \
  -keystore metascrub-release.jks \
  -alias metascrub \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass YOUR_STORE_PASSWORD \
  -keypass YOUR_KEY_PASSWORD \
  -dname "CN=MetaScrub, OU=MetaScrub, O=MetaScrub, L=Your City, ST=Your State, C=US"
```

Move the keystore somewhere safe:
```bash
mv metascrub-release.jks ~/secure/metascrub-release.jks
```

Recommended storage: 1Password → Secure Note with:
- Keystore file attached
- Store password
- Key alias: `metascrub`
- Key password

### Step 2 — Configure signing in gradle

Create or edit `android/keystore.properties` (this file must be gitignored):

```properties
storeFile=/absolute/path/to/metascrub-release.jks
storePassword=YOUR_STORE_PASSWORD
keyAlias=metascrub
keyPassword=YOUR_KEY_PASSWORD
```

Add to `android/app/build.gradle`:

```groovy
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    ...
    signingConfigs {
        release {
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

Make sure `android/keystore.properties` and `*.jks` are in `.gitignore`:

```
# Android signing — NEVER COMMIT
keystore.properties
*.jks
*.keystore
```

### Step 3 — Build the web app and sync

```bash
cd packages/mobile
pnpm build
npx cap sync
```

### Step 4 — Build release AAB

```bash
cd android
./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

### Step 5 — Upload to Google Play

1. Go to https://play.google.com/console
2. Select MetaScrub app (or create it if first upload).
3. Go to **Release** → **Production** → **Create new release**.
4. Upload the `.aab` file.
5. Fill in release notes (see `assets/play-store-listing.md`).
6. Save → Review release → Start rollout to Production.

### Android Troubleshooting

- **"Keystore was tampered with, or password was incorrect"**: Double-check passwords in `keystore.properties`. No extra spaces.
- **"Upload failed: The APK or Android App Bundle you uploaded is not signed"**: The release signing config in build.gradle was not applied. Verify `signingConfig signingConfigs.release` is in the `release` buildType.
- **"Google Play requires target API level ≥ 34"**: Update `targetSdkVersion` in `android/app/build.gradle`.
- **"The Android App Bundle needs to be reviewed"**: First upload to a new Play Console account requires a review period (1-3 days). Subsequent updates are faster.

---

## Important security reminders

1. The keystore is the ONLY proof of app ownership on Android. If it is lost, you CANNOT update the app. Store multiple backup copies.
2. Never commit `.jks`, `.keystore`, `keystore.properties`, or `.p12` files.
3. Never share provisioning profiles or certificates via public channels.
4. Rotate certificates before expiry (Apple distribution certs last 1 year; renew via Certificates portal).
5. The App Group ID `group.com.metadatafinder.metascrub` must be provisioned on BOTH the main app profile and the Share Extension profile.
