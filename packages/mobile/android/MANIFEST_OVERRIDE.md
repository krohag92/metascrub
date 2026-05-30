# AndroidManifest.xml Override Instructions

After running `npx cap add android`, open:
`android/app/src/main/AndroidManifest.xml`

Find the main `<activity>` block (it contains `android.intent.action.MAIN`) and add the
following intent-filters INSIDE the same `<activity>` element, after the existing filters:

```xml
<!-- MetaScrub Share Intent — receive files from any app via the Android share sheet -->

<!-- Single-file share: any MIME type -->
<intent-filter>
    <action android:name="android.intent.action.SEND" />
    <category android:name="android.intent.category.DEFAULT" />
    <data android:mimeType="*/*" />
</intent-filter>

<!-- Single-file share: images explicitly -->
<intent-filter>
    <action android:name="android.intent.action.SEND" />
    <category android:name="android.intent.category.DEFAULT" />
    <data android:mimeType="image/*" />
</intent-filter>

<!-- Single-file share: video -->
<intent-filter>
    <action android:name="android.intent.action.SEND" />
    <category android:name="android.intent.category.DEFAULT" />
    <data android:mimeType="video/*" />
</intent-filter>

<!-- Single-file share: audio -->
<intent-filter>
    <action android:name="android.intent.action.SEND" />
    <category android:name="android.intent.category.DEFAULT" />
    <data android:mimeType="audio/*" />
</intent-filter>

<!-- Single-file share: PDF -->
<intent-filter>
    <action android:name="android.intent.action.SEND" />
    <category android:name="android.intent.category.DEFAULT" />
    <data android:mimeType="application/pdf" />
</intent-filter>

<!-- Single-file share: Word documents -->
<intent-filter>
    <action android:name="android.intent.action.SEND" />
    <category android:name="android.intent.category.DEFAULT" />
    <data android:mimeType="application/vnd.openxmlformats-officedocument.wordprocessingml.document" />
</intent-filter>

<!-- Single-file share: Excel -->
<intent-filter>
    <action android:name="android.intent.action.SEND" />
    <category android:name="android.intent.category.DEFAULT" />
    <data android:mimeType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" />
</intent-filter>

<!-- Single-file share: PowerPoint -->
<intent-filter>
    <action android:name="android.intent.action.SEND" />
    <category android:name="android.intent.category.DEFAULT" />
    <data android:mimeType="application/vnd.openxmlformats-officedocument.presentationml.presentation" />
</intent-filter>

<!-- Single-file share: EPUB -->
<intent-filter>
    <action android:name="android.intent.action.SEND" />
    <category android:name="android.intent.category.DEFAULT" />
    <data android:mimeType="application/epub+zip" />
</intent-filter>

<!-- Multi-file share (batch processing future feature) -->
<intent-filter>
    <action android:name="android.intent.action.SEND_MULTIPLE" />
    <category android:name="android.intent.category.DEFAULT" />
    <data android:mimeType="*/*" />
</intent-filter>
```

## Handling the Share Intent in TypeScript

The `src/lib/share-extension.ts` already handles this. When Android routes a `content://` or
`file://` URI to the app, Capacitor's `App.addListener('appUrlOpen', ...)` fires with the URI.

For `SEND_MULTIPLE`, extract `ClipData` items. This requires a small Capacitor plugin if the
single-URI path is insufficient — the current implementation handles single-file shares via
`appUrlOpen`. Multi-file support is deferred to a future update.

## Deep Link / URL Scheme (Android)

Add this intent-filter to the same `<activity>` for the `metascrub://` custom scheme:

```xml
<!-- Deep link from the Share Extension or notification URLs -->
<intent-filter android:autoVerify="false">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="metascrub" />
</intent-filter>
```
