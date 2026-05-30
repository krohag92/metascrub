# Apple Privacy Nutrition Label — MetaScrub

App Store Connect: App Privacy section
App: MetaScrub: Metadata Viewer (com.metadatafinder.metascrub)

---

## Does your app collect data from this app? No

Select "No, I do not collect data from this app."

Reason: MetaScrub processes all files entirely on the user's device. No file contents,
metadata, usage data, diagnostics, or any other user data is transmitted to any server.
There are no network calls from the app itself (the footer link opens Safari externally,
which is not a data collection event).

---

## Data Not Collected

The following is a complete list confirming zero data collection in every Apple category:

| Category | Collected? | Notes |
|---|---|---|
| Contact Info | No | |
| Health & Fitness | No | |
| Financial Info | No | |
| Location | No | App reads GPS from file metadata but does not use or transmit device location |
| Sensitive Info | No | |
| Contacts | No | |
| User Content | No | Files are processed locally; no content leaves the device |
| Browsing History | No | |
| Search History | No | |
| Identifiers | No | No user accounts, no device IDs collected |
| Usage Data | No | No analytics, no crash reporting, no telemetry |
| Diagnostics | No | No crash logs sent to any server |
| Other Data | No | |

---

## Tracking

- Does your app track users across other companies' apps and websites? **No**
- Third-party advertising SDKs: **None**
- Third-party analytics SDKs: **None**
- Crash reporting services: **None**

---

## Privacy Policy

URL: https://metadatafinder.com/extension/privacy

Summary for App Store: "MetaScrub does not collect, transmit, or store any personal data
or file contents. All processing happens entirely on your device."

---

## Notes for App Review

If Apple asks why we read file contents (to parse metadata), clarify:
- File bytes are read in-memory to extract metadata fields.
- Nothing is written to disk except the user-initiated scrubbed output to the Documents folder.
- No network requests are made. There is no server component.
- The app has no analytics SDK, no crash reporter, no ad network.
