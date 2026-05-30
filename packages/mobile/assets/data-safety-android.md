# Google Play Data Safety Form — MetaScrub

Play Console: App content → Data safety
App: MetaScrub (com.metadatafinder.metascrub)

---

## Section 1: Data collection and security

### Does your app collect or share any of the required user data types?
**No**

Select: "This app doesn't collect or share user data."

### Is all of the user data collected by your app encrypted in transit?
N/A — no user data is collected or transmitted.

### Does your app provide a way for users to request that their data is deleted?
N/A — no user data is stored on any server.

---

## Section 2: Data types (complete list — all No)

| Data type | Collected? | Shared? | Notes |
|---|---|---|---|
| Name | No | No | |
| Email address | No | No | |
| User IDs | No | No | No accounts, no sign-in |
| Address | No | No | |
| Phone number | No | No | |
| Race and ethnicity | No | No | |
| Political or religious beliefs | No | No | |
| Sexual orientation | No | No | |
| Other personal info | No | No | |
| Health info | No | No | |
| Fitness info | No | No | |
| Financial info | No | No | |
| Payment info | No | No | |
| Credit score | No | No | |
| Precise location | No | No | App reads GPS from file metadata but does NOT collect device location |
| Coarse location | No | No | |
| Web browsing | No | No | |
| App interactions | No | No | No analytics |
| In-app search history | No | No | |
| Installed apps | No | No | |
| Other actions | No | No | |
| Crash logs | No | No | No crash reporting service |
| Diagnostics | No | No | |
| Device or other IDs | No | No | No device identifiers collected |
| Emails | No | No | |
| SMS or MMS | No | No | |
| Photos | No | No | App reads photo EXIF metadata locally only |
| Videos | No | No | |
| Voice or sound recordings | No | No | |
| Music files | No | No | |
| Files and docs | No | No | Files are read in-memory; nothing sent to servers |
| Calendar events | No | No | |
| Contacts | No | No | |
| App activity | No | No | |
| In-app messages | No | No | |
| Other | No | No | |

---

## Section 3: Security practices

| Question | Answer |
|---|---|
| Does your app use encryption to protect user data in transit? | Yes (N/A — no data transmitted) |
| Does your app follow the Families Policy? | No (not designed for children) |
| Does your app provide a way to request data deletion? | No data stored — N/A |

---

## Section 4: Data handling details

**Processing location**: On-device only. No server-side processing.

**Data retention**: None. Files are read from disk, processed in-memory, and the scrubbed
output is written to the user's chosen location. No data is retained by the app beyond
the user's own files.

---

## Privacy Policy

URL: https://metadatafinder.com/extension/privacy

Statement: "MetaScrub does not collect, transmit, or store any personal data.
All file processing happens entirely on your device. No data is shared with any third party."

---

## App category for Play Console

Category: **Tools**

Tags: Privacy, File Manager, Metadata, EXIF, Documents
