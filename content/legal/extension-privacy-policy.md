# MetaScrub Privacy Policy

**Effective date:** [DATE — to be filled in by Anton before publishing]
**Applies to:** MetaScrub browser extension (Chrome, Firefox, Edge, Opera) and MetaScrub desktop app (macOS, Windows, Linux)
**Contact:** privacy@metadatafinder.com
**URL of this policy:** https://metadatafinder.com/extension/privacy

---

## Summary

MetaScrub processes files entirely on your device. No file data, no metadata, no URLs, and no personal information are ever sent to a server. MetaScrub collects no analytics.

---

## 1. What MetaScrub does

MetaScrub reads metadata from files you provide (images, audio, video, documents) and optionally writes a modified version of those files with metadata removed. All of this happens locally on your device:

- In the **browser extension**: processing happens in the browser tab or extension service worker using JavaScript/WebAssembly. Files are not uploaded.
- In the **desktop app**: processing happens locally using the MetaScrub Tauri application. Files are not uploaded.
- In the **web tool** at metadatafinder.com: processing happens in your browser. Files are not uploaded.

The only network request MetaScrub makes is to fetch a file from a URL when you right-click an image on a web page and select "View metadata" or "Download cleaned copy." In that case, the extension fetches the image bytes from the URL you selected — the same request your browser would make to display the image. This data is used only to perform the requested analysis or scrub operation and is immediately discarded.

---

## 2. What data is stored locally

The browser extension stores the following in `chrome.storage.local` (local to your browser profile, never synced to any server):

- **Default scrub preset** — your last chosen preset (`all`, `gps-only`, `personal-only`, or `keep-technical`). Default: none set.
- **"Always show warnings" toggle** — a boolean preference. Default: on.

Nothing else is stored. No file contents, no metadata results, no browsing history, no URLs of pages visited, no identifiers.

The desktop app stores the same preference fields in a local application config file. The location varies by OS (e.g., `~/Library/Application Support/com.metascrub.app/` on macOS).

---

## 3. What data is NOT collected

MetaScrub does not collect, transmit, or store:

- File contents
- Metadata extracted from files
- URLs of pages you visit
- Browser history
- IP address
- Device identifiers
- Names, email addresses, or account information
- Crash reports or error logs (these are not sent anywhere)
- Analytics events of any kind (no pageviews, no button clicks, no usage metrics)

There is no account system. There is no registration. There is no backend server that receives data from MetaScrub.

---

## 4. Permissions used by the browser extension

The extension requests the following permissions. Each is used for exactly one purpose.

| Permission                     | Why it is needed                                                                                                                                                                                                                                                     |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `contextMenus`                 | Add "View metadata" and "Download cleaned copy" to the right-click menu on images, video, and audio elements.                                                                                                                                                        |
| `downloads`                    | Save cleaned files to your Downloads folder when you choose to scrub a file.                                                                                                                                                                                         |
| `storage`                      | Store your default scrub preset and UI preferences locally in your browser profile.                                                                                                                                                                                  |
| `<all_urls>` (host permission) | Fetch image bytes from the current page when you right-click an image. The extension needs access to the image URL to download its bytes for analysis. This permission is used only when you initiate an action; the extension does not read page content passively. |

No other permissions are requested. The extension does not inject content scripts that read page content. It does not access your browsing history, bookmarks, or other browser data.

---

## 5. Third-party services

MetaScrub does not integrate with any third-party analytics, advertising, or data collection service. There are no calls to Google Analytics, Mixpanel, Sentry, or any equivalent service.

The extension loads no external scripts. All code is bundled locally in the extension package.

---

## 6. Children's privacy

MetaScrub does not knowingly collect information from children under 13 (or the applicable age in your jurisdiction). The tool has no user accounts and collects no personal data from anyone, regardless of age.

---

## 7. Changes to this policy

If this policy is updated, the effective date will be changed at the top of this page. Substantive changes will be noted in the MetaScrub changelog.

---

## 8. Contact

Questions about this privacy policy:

**Email:** privacy@metadatafinder.com
**Web:** https://metadatafinder.com

---

## Note on the desktop app

This privacy policy applies equally to the MetaScrub desktop application (built with Tauri for macOS, Windows, and Linux). The desktop app processes files locally, stores preferences in a local config file, makes no network requests except to check for updates (if that feature is implemented — if so, only the MetaScrub version number is sent to the update server, not any file data or personal information), and collects no analytics.

If an update-check feature is added in a future version, this policy will be updated to describe it before the feature ships.

---

_MetaScrub is open source under the MIT license. Source code: https://github.com/metascrub/metascrub. Privacy contact: privacy@metadatafinder.com._
